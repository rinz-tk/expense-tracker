use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::cmp::min;

use hyper::body::Incoming;
use http_body_util::BodyExt;
use hyper::Request;

use super::Connect;
use super::login::{Token, ValidateToken};
use crate::connect::login::GetPendingReturn;
use crate::web_error::{WebError, WebErrorKind};

#[derive(Serialize, Deserialize, Debug)]
pub struct Expense {
    exp: u32,
    desc: String
}

#[derive(Debug)]
struct PendingExpense {
    exp: u32,
    exp_id: usize,
    partial_id: Option<usize>
}

#[derive(Debug)]
pub struct Pending {
    amt: u32,
    exp_list: Vec<PendingExpense>
}

pub struct OwedExpense {
    exp: u32,
    exp_id: usize
}

#[derive(Serialize, Deserialize, Debug)]
struct AddExpIn {
    exp: u32,
    desc: String,
    split_list: Vec<String>
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "status", content = "token")]
pub enum AddExpReturn {
    Ok,
    New(String),
    Invalid
}

#[derive(Serialize, Debug)]
#[serde(tag = "status")]
pub enum GetExpReturn<'a> {
    Ok { data: &'a mut Vec<Expense> },
    New { data: &'a mut Vec<Expense>, token: String },
    Invalid
}

impl Connect {
    pub async fn add_expense(&mut self, req: Request<Incoming>) -> Result<AddExpReturn, WebError> {
        let mut new_session: bool = false;
        let token = match self.validate_token(&req).await {
            ValidateToken::Valid(t) => t,
            ValidateToken::Absent => {
                new_session = true;
                self.new_session_token().await
            },
            ValidateToken::Invalid => {
                return Ok(AddExpReturn::Invalid);
            }
        };

        let body = req.into_body().collect().await?.to_bytes();

        let exp_info = serde_json::from_slice(&body);
        let exp_info: AddExpIn = match exp_info {
            Ok(e) => e,
            Err(e) => {
                self.log(&format!("Error while parsing JSON: {:?}", body));
                return Err(e.into());
            }
        };

        match token {
            Token::User(uid) => {
                let num = u32::try_from(exp_info.split_list.len())? + 1;
                let base_val = exp_info.exp / num;
                let mut extra = exp_info.exp % num;
                if extra > 0 { extra -= 1; }

                self.log(&format!("Amount {} split between {} people for {} each", exp_info.exp, num, base_val));

                let exp_id = {
                    let mut user_exp = self.user_exp.lock().await;
                    let expenses = user_exp.entry(uid).or_insert_with(Vec::new);
                    expenses.push(Expense {
                        exp: exp_info.exp,
                        desc: exp_info.desc.clone()
                    });

                    self.log(&format!("Added expense for [User {}]: {:?}", uid, expenses[expenses.len() - 1]));
                    expenses.len() - 1
                };

                self.add_pending_expenses(uid, exp_id, &exp_info.desc, exp_info.exp, &exp_info.split_list, base_val, extra).await?;
            }

            Token::Session(id) => {
                let mut session_exp = self.session_exp.lock().await;
                let expenses = session_exp.entry(id).or_insert_with(Vec::new);
                expenses.push(Expense {
                    exp: exp_info.exp,
                    desc: exp_info.desc
                });

                self.log(&format!("Added expense for session ID {}: {:?}", id, expenses[expenses.len() - 1]));
            }
        };

        if new_session {
            Ok(AddExpReturn::New(Self::encode_token(&token)?))
        } else {
            Ok(AddExpReturn::Ok)
        }
    }

    async fn add_pending_expenses(&mut self, uid: u32, exp_id: usize, desc: &String, mut exp_total: u32, split_list: &Vec<String>, base_val: u32, mut extra: u32) -> Result<(), WebError> {
        let exp_total_base = exp_total;
        let mut id_list = Vec::new();

        {
            let registry = self.registry.lock().await;
            for username in split_list {
                let split_id = match registry.get(username) {
                    Some(&(_, uid)) => uid,
                    None => {
                        let msg = "Invalid username in split list";
                        return Err(WebError { msg: msg.to_string(), kind: WebErrorKind::AddExpense });
                    }
                };

                id_list.push(split_id);
            }
        }

        let mut pending = self.pending.lock().await;
        let mut expenses = self.user_exp.lock().await;
        let mut owed = self.owed.lock().await;
        let owed_map = owed.entry(uid).or_insert_with(HashMap::new);

        for id in id_list {
            let mut exp_base = base_val;
            if extra > 0 {
                exp_base += 1;
                extra -= 1;
            }

            self.log(&format!("[User {}] owes [User {}] an amount {}", id, uid, exp_base));

            let exp = self.settle_pending(&mut pending, &mut expenses, uid, id, exp_base).await?;

            let mut partial_id = None;
            if exp_base > exp {
                let diff = exp_base - exp;
                exp_total -= diff;

                let e = expenses.entry(id).or_insert_with(Vec::new);
                e.push(Expense { exp: diff, desc: desc.clone() });
                partial_id = Some(e.len() - 1);
            }

            if exp == 0 { continue; }

            let p = pending.entry(id)
                .or_insert_with(HashMap::new)
                .entry(uid)
                .or_insert_with(|| Pending { amt: 0, exp_list: Vec::new() });

            p.amt += exp;
            p.exp_list.push(PendingExpense {
                exp,
                exp_id,
                partial_id
            });

            owed_map.entry(id).or_insert_with(Vec::new).push(OwedExpense {
                exp,
                exp_id
            });
        }

        if exp_total_base > exp_total {
            self.log(&format!("Original expense reduced from {} to {}", exp_total_base, exp_total));

            let uid_exp = &mut expenses.get_mut(&uid)
                .ok_or_else(|| WebError { msg: format!("No expenses exist for uid {}", uid), kind: WebErrorKind::Access })?
                .get_mut(exp_id)
                .ok_or_else(|| WebError { msg: format!("Invalid expense {} for uid {}", exp_id, uid), kind: WebErrorKind::Access })?
                .exp;

            *uid_exp = exp_total;
        }

        Ok(())
    }

    async fn settle_pending(&self, pending: &mut HashMap<u32, HashMap<u32, Pending>>, expenses: &mut HashMap<u32, Vec<Expense>>, uid: u32, id: u32, exp_base: u32) -> Result<u32, WebError> {
        let mut exp = exp_base;

        if let Some(m) = pending.get_mut(&uid) {
            let mut settled_p = false;

            if let Some(p) = m.get_mut(&id) {
                // self.log(&format!("Pending expenses of [User {}] towards [User {}]: {:?}", uid, id, p));

                let mut remove_from = None;
                let exp_list_len = p.exp_list.len();

                for (i, pe) in p.exp_list.iter_mut().rev().enumerate() {
                    let exp_take = min(exp, pe.exp);
                    exp -= exp_take;
                    pe.exp -= exp_take;

                    if pe.exp == 0 { remove_from = Some(exp_list_len - i - 1); }

                    let e = expenses.get_mut(&id)
                        .ok_or_else(|| WebError { msg: format!("No expenses exist for uid {}", id), kind: WebErrorKind::Access })?
                        .get_mut(pe.exp_id)
                        .ok_or_else(|| WebError { msg: format!("Invalid expense {} for uid {}", pe.exp_id, id), kind: WebErrorKind::Access })?;

                    e.exp -= exp_take;
                    let desc = e.desc.clone();

                    self.log(&format!("[User {}] owes [User {}] amound {} for '{}', settled {}", uid, id, pe.exp + exp_take, &desc, exp_take));

                    match pe.partial_id {
                        None => {
                            expenses.entry(uid).or_insert_with(Vec::new).push(Expense { exp: exp_take, desc });
                            if pe.exp != 0 { pe.partial_id = Some(expenses.len() - 1); }
                        }

                        Some(partial_id) => {
                            let partial_exp = &mut expenses.get_mut(&uid)
                                .ok_or_else(|| WebError { msg: format!("No expenses exist for uid {}", uid), kind: WebErrorKind::Access })?
                                .get_mut(partial_id)
                                .ok_or_else(|| WebError { msg: format!("Invalid expense {} for uid {}", partial_id, uid), kind: WebErrorKind::Access })?
                                .exp;

                            *partial_exp += exp_take;
                        }
                    }

                    if exp == 0 { break; }
                }

                if let Some(remove_from) = remove_from { p.exp_list.truncate(remove_from); }
                p.amt -= exp_base - exp;

                if p.amt == 0 { settled_p = true; }
            }

            if settled_p { m.remove(&id); }
        }

        Ok(exp)
    }

    pub async fn get_expenses(&mut self, req: Request<Incoming>) -> Result<String, WebError> {
        let mut new_session: bool = false;
        let token = match self.validate_token(&req).await {
            ValidateToken::Valid(t) => t,
            ValidateToken::Absent => {
                new_session = true;
                self.new_session_token().await
            },
            ValidateToken::Invalid => {
                return Ok(serde_json::to_string(&GetExpReturn::Invalid)?);
            }
        };

        match token {
            Token::User(ref username) => {
                let mut user_exp = self.user_exp.lock().await;
                let expenses = user_exp.entry(username.clone()).or_insert_with(Vec::new);

                self.log(&format!("Returning expenses for user {username}: {:?}", expenses));

                let data = if new_session {
                    GetExpReturn::New { data: expenses, token: Self::encode_token(&token)? }
                } else {
                    GetExpReturn::Ok { data: expenses }
                };

                Ok(serde_json::to_string(&data)?)
            }

            Token::Session(id) => {
                let mut session_exp = self.session_exp.lock().await;
                let expenses = session_exp.entry(id).or_insert_with(Vec::new);

                self.log(&format!("Returning expenses for session ID {id}: {:?}", expenses));

                let data = if new_session {
                    GetExpReturn::New { data: expenses, token: Self::encode_token(&token)? }
                } else {
                    GetExpReturn::Ok { data: expenses }
                };

                Ok(serde_json::to_string(&data)?)
            }
        }
    }

    pub async fn get_pending(&mut self, req: Request<Incoming>) -> Result<GetPendingReturn, WebError> {
        let token = match self.validate_token(&req).await {
            ValidateToken::Valid(t) => t,
            ValidateToken::Absent | ValidateToken::Invalid => {
                return Ok(GetPendingReturn::LoggedOut);
            }
        };

        let uid = match token {
            Token::User(uid) => uid,
            Token::Session(_) => {
                self.log("User is not logged in");
                return Ok(GetPendingReturn::LoggedOut);
            }
        };

        {
            let mut pending_list = self.pending.lock().await;
            let pending = pending_list.entry(uid).or_insert_with(HashMap::new);

            let uids = self.uids.lock().await;
            let x: Vec<()> = pending.iter().map(|(&id, list)| {
                let username = uids.get(&id)
                    .ok_or_else(|| WebError {
                        msg: "Invalid uid in pending list".to_string(),
                        kind: WebErrorKind::GetPending })?
                    .clone();

                Ok(())
            }).collect::<Result<Vec<()>, WebError>>()?;
        }

        Ok(GetPendingReturn::Ok)
    }
}
