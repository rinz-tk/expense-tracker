use serde::{Serialize, Deserialize};
// use serde_qs;

use hyper::body::Incoming;
use http_body_util::BodyExt;
use hyper::Request;

use super::Connect;
use super::login::{Token, ValidateToken};
use crate::web_error::WebError;

#[derive(Serialize, Deserialize, Debug)]
pub struct Expense {
    exp: i32,
    desc: String
}

#[derive(Serialize, Deserialize, Debug)]
struct AddExpIn {
    exp: i32,
    desc: String
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
            Token::User(ref username) => {
                let mut user_exp = self.user_exp.lock().await;
                let expenses = user_exp.entry(username.clone()).or_insert_with(Vec::new);
                expenses.push(Expense {
                    exp: exp_info.exp,
                    desc: exp_info.desc
                });

                self.log(&format!("Added expense for username {}: {:?}", username, expenses));
            }

            Token::Session(id) => {
                let mut session_exp = self.session_exp.lock().await;
                let expenses = session_exp.entry(id).or_insert_with(Vec::new);
                expenses.push(Expense {
                    exp: exp_info.exp,
                    desc: exp_info.desc
                });

                self.log(&format!("Added expense for session ID {}: {:?}", id, expenses));
            }
        };

        if new_session {
            Ok(AddExpReturn::New(Self::encode_token(&token)?))
        } else {
            Ok(AddExpReturn::Ok)
        }
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
}
