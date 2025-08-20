use serde::{Serialize, Deserialize};

use hyper::body::Incoming;
use http_body_util::BodyExt;
use hyper::Request;

use super::Connect;
use crate::web_error::WebError;

#[derive(Serialize, Deserialize, Debug)]
struct LoginInfo {
    username: String,
    password: String
}

#[derive(Serialize, Deserialize, Debug)]
pub enum LoginReturn {
    Ok
}

impl Connect {
    pub async fn login_user(&mut self, req: Request<Incoming>) -> Result<LoginReturn, WebError> {
        let body = req.into_body().collect().await?.to_bytes();

        let login_info = serde_json::from_slice(&body);
        if let Err(_) = login_info { self.log(&format!("Error while parsing JSON: {:?}", body)); }
        let login_info: LoginInfo = login_info?;

        let registry = self.registry.lock().await;
        // match registry.get(&login_info.username) {
        // }

        Ok(LoginReturn::Ok)
    }
}
