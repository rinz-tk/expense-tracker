use serde::{Serialize, Deserialize};

use hyper::body::Incoming;
use http_body_util::BodyExt;
use hyper::Request;

use super::Connect;
use super::login::Token;
use crate::web_error::WebError;

#[derive(Serialize, Deserialize, Debug)]
struct RegisterInfo {
    username: String,
    password: String
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "status", content = "token")]
pub enum RegisterReturn {
    Ok(String),
    Exists
}

impl Connect {
    async fn get_next_uid(&self) -> u32 {
        let mut next_user_id = self.next_user_id.lock().await;

        let ret: u32 = *next_user_id;
        *next_user_id += 1;
        ret
    }

    pub async fn register_user(&self, req: Request<Incoming>) -> Result<RegisterReturn, WebError> {
        let body = req.into_body().collect().await?.to_bytes();

        let reg_info = serde_json::from_slice(&body);
        if let Err(_) = reg_info { self.log(&format!("Error while parsing JSON: {:?}", body)); }
        let reg_info: RegisterInfo = reg_info?;

        let id = {
            let mut registry = self.registry.lock().await;

            if let Some(_) = registry.get(&reg_info.username) {
                self.log(&format!("Username '{}' already exists", reg_info.username));
                return Ok(RegisterReturn::Exists);
            }

            let id = self.get_next_uid().await;

            self.log(&format!("Adding username '{}' with password '{}' and uid '{}'", reg_info.username, reg_info.password, id));
            registry.insert(reg_info.username.clone(), (reg_info.password, id));

            id
        };

        {
            let mut uids = self.uids.lock().await;
            uids.insert(id, reg_info.username.clone());
        }

        let token = Token::User(id);
        let encoded_token = Self::encode_token(&token)?;

        Ok(RegisterReturn::Ok(encoded_token))
    }
}
