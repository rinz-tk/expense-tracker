use serde::{Serialize, Deserialize};
use jsonwebtoken as jwt;

use hyper::body::Incoming;
use http_body_util::BodyExt;
use hyper::Request;

use super::Connect;
use crate::web_error::WebError;
use crate::LOGIN_KEY;

#[derive(Serialize, Deserialize, Debug)]
struct LoginInfo {
    username: String,
    password: String
}

#[derive(Serialize, Deserialize, Debug)]
enum LoginStatus {
    Ok,
    NotExist,
    NotMatch
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LoginReturn {
    status: LoginStatus,
    token: Option<String>
}

#[derive(Serialize, Deserialize, Debug)]
struct User {
    usn: String
}

impl Connect {
    pub async fn login_user(&mut self, req: Request<Incoming>) -> Result<LoginReturn, WebError> {
        let body = req.into_body().collect().await?.to_bytes();

        let login_info = serde_json::from_slice(&body);
        let login_info: LoginInfo = match login_info {
            Ok(l) => l,
            Err(e) => {
                self.log(&format!("Error while parsing JSON: {:?}", body));
                return Err(e.into());
            }
        };

        let registry = self.registry.lock().await;
        let pass = match registry.get(&login_info.username) {
            Some(p) => p.clone(),
            None => {
                self.log(&format!("Username {} does not exist", login_info.username));
                return Ok(LoginReturn { status: LoginStatus::NotExist, token: None });
            }
        };

        if login_info.password == pass {
            self.log(&format!("{} logged in", login_info.username));

            let user = User { usn: login_info.username };
            let token = jwt::encode(&jwt::Header::default(), &user, &jwt::EncodingKey::from_secret(&LOGIN_KEY))?;

            Ok(LoginReturn { status: LoginStatus::Ok, token: Some(token) })
        } else {
            self.log(&format!("Password for {} doesn't match", login_info.username));
            Ok(LoginReturn { status: LoginStatus::NotMatch, token: None })
        }
    }
}
