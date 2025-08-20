use serde::{Serialize, Deserialize};

use hyper::body::Incoming;
use http_body_util::BodyExt;
use hyper::Request;

use super::Connect;
use crate::web_error::WebError;

#[derive(Serialize, Deserialize, Debug)]
struct RegisterInfo {
    username: String,
    password: String
}

#[derive(Serialize, Deserialize, Debug)]
pub enum RegisterReturn {
    Ok,
    Exists
}

impl Connect {
    pub async fn register_user(&mut self, req: Request<Incoming>) -> Result<RegisterReturn, WebError> {
        let body = req.into_body().collect().await?.to_bytes();

        let reg_info = serde_json::from_slice(&body);
        if let Err(_) = reg_info { self.log(&format!("Error while parsing JSON: {:?}", body)); }
        let reg_info: RegisterInfo = reg_info?;

        let mut registry = self.registry.lock().await;
        match registry.get(&reg_info.username) {
            None => {
                self.log(&format!("Adding username '{}' with password '{}'", reg_info.username, reg_info.password));
                registry.insert(reg_info.username.clone(), reg_info.password);

                Ok(RegisterReturn::Ok)
            }

            Some(_) => {
                self.log(&format!("Username '{}' already exists.", reg_info.username));

                Ok(RegisterReturn::Exists)
            }
        }
    }
}
