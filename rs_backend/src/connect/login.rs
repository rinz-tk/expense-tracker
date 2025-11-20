use std::collections::HashSet;
use serde::{Serialize, Deserialize};
use jsonwebtoken as jwt;
use std::fs;
use once_cell::sync::Lazy;

use hyper::body::Incoming;
use http_body_util::BodyExt;
use hyper::Request;
use hyper::header::AUTHORIZATION;

use super::Connect;
use crate::web_error::{WebError, WebErrorKind};

#[derive(Serialize, Deserialize, Debug)]
struct LoginInfo {
    username: String,
    password: String
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "status", content = "token")]
pub enum LoginReturn {
    Ok(String),
    NotExist,
    NotMatch
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", content = "id")]
pub enum Token {
    User(u32),
    Session(u32)
}

pub enum ValidateToken {
    Valid(Token),
    Absent,
    Invalid
}

#[derive(Serialize, Deserialize, Debug)]
struct ValidateUserIn {
    username: String
}

#[derive(Serialize, Deserialize, Debug)]
pub enum ValidateUserReturn {
    Valid,
    Invalid,
    LoggedOut
}

static LOGIN_KEY: Lazy<Vec<u8>> = Lazy::new(|| {
    let secret_file = "secret/secret_key";
    fs::read(secret_file)
        .expect(&format!("Unable to open {secret_file}"))
});

static ENCODING_KEY: Lazy<jwt::EncodingKey> = Lazy::new(|| {
    jwt::EncodingKey::from_secret(&LOGIN_KEY)
});

static DECODING_KEY: Lazy<jwt::DecodingKey> = Lazy::new(|| {
    jwt::DecodingKey::from_secret(&LOGIN_KEY)
});

static HEADER: Lazy<jwt::Header> = Lazy::new(|| {
    jwt::Header::default()
});

static VALIDATION: Lazy<jwt::Validation> = Lazy::new(|| {
    let mut validation = jwt::Validation::default();
    validation.required_spec_claims = HashSet::new();

    validation
});

impl Connect {
    pub fn encode_token(token: &Token) -> Result<String, WebError> {
        jwt::encode(&HEADER, token, &ENCODING_KEY)
            .map_err(|e| e.into())
    }

    async fn get_next_session_id(&self) -> u32 {
        let mut next_session_id = self.next_session_id.lock().await;

        let ret: u32 = *next_session_id;
        *next_session_id += 1;
        ret
    }

    pub async fn new_session_token(&self) -> Token {
        let id = self.get_next_session_id().await;
        self.log(&format!("Creating new session token with ID: {id}"));

        self.sessions.lock().await.insert(id);

        Token::Session(id)
    }

    pub async fn login_user(&self, req: Request<Incoming>) -> Result<LoginReturn, WebError> {
        let body = req.into_body().collect().await?.to_bytes();

        let login_info = serde_json::from_slice(&body);
        let login_info: LoginInfo = match login_info {
            Ok(l) => l,
            Err(e) => {
                self.log(&format!("Error while parsing JSON: {:?}", body));
                return Err(e.into());
            }
        };

        let (pass, uid) = {
            let registry = self.registry.lock().await;
            match registry.get(&login_info.username) {
                Some(p) => p.clone(),
                None => {
                    self.log(&format!("Username {} does not exist", login_info.username));
                    return Ok(LoginReturn::NotExist);
                }
            }
        };

        if login_info.password == pass {
            self.log(&format!("{} logged in", login_info.username));

            let token = Token::User(uid);
            let encoded_token = Self::encode_token(&token)?;

            Ok(LoginReturn::Ok(encoded_token))
        } else {
            self.log(&format!("Password for {} doesn't match", login_info.username));
            Ok(LoginReturn::NotMatch)
        }
    }

    pub async fn validate_token(&self, req: &Request<Incoming>) -> ValidateToken {
        let header = req.headers();

        let encoded_token = match header.get(AUTHORIZATION) {
            Some(auth) => match auth.to_str() {
                Ok(auth_header) => {
                    match auth_header.strip_prefix("Bearer ") {
                        Some(t) => t,
                        None => {
                            self.log(&format!("Bearer prefix absent in authorization header: {auth_header}"));
                            return ValidateToken::Invalid;
                        }
                    }
                },

                Err(e) => {
                    self.log(&format!("Unable to parse authorization header: {e}"));
                    return ValidateToken::Invalid;
                }
            },

            None => {
                self.log("Authorization header missing in request");
                return ValidateToken::Absent;
            }
        };

        let decoded = jwt::decode::<Token>(&encoded_token, &DECODING_KEY, &VALIDATION);

        let token = match decoded {
            Ok(t) => t.claims,
            Err(e) => {
                self.log(&format!("Unable to parse token ({encoded_token}): {e}"));
                return ValidateToken::Invalid;
            }
        };

        match &token {
            Token::Session(id) => {
                if !self.sessions.lock().await.contains(id) {
                    self.log(&format!("Invalid session id {id}"));
                    return ValidateToken::Invalid;
                } else {
                    self.log(&format!("Authorization verified for session ID {id}"));
                }
            }

            Token::User(uid) => {
                if !self.uids.lock().await.contains_key(uid) {
                    self.log(&format!("Invalid uid {uid}"));
                    return ValidateToken::Invalid;
                } else {
                    self.log(&format!("Authorization verified for uid {uid}"));
                }
            }
        }

        ValidateToken::Valid(token)
    }

    pub async fn validate_username(&self, req: Request<Incoming>) -> Result<ValidateUserReturn, WebError> {
        let token = match self.validate_token(&req).await {
            ValidateToken::Valid(t) => t,
            ValidateToken::Absent | ValidateToken::Invalid => {
                return Ok(ValidateUserReturn::LoggedOut);
            }
        };

        if let Token::Session(_) = token {
            self.log("User is not logged in");
            return Ok(ValidateUserReturn::LoggedOut);
        }

        let query = req.uri().query();
        let query = match query {
            Some(q) => q,
            None => {
                let msg = "Query string missing from request";
                return Err(WebError { msg: msg.to_string(), kind: WebErrorKind::ValidateUsername});
            }
        };

        let username = match serde_qs::from_str::<ValidateUserIn>(query) {
            Ok(u) => u.username,
            Err(e) => {
                self.log(&format!("Unable to parse query string: {query}"));
                return Err(e.into());
            }
        };

        if self.registry.lock().await.contains_key(&username) {
            self.log(&format!("'{username}' is a valid username"));
            Ok(ValidateUserReturn::Valid)
        } else {
            self.log(&format!("'{username}' is not a valid username"));
            Ok(ValidateUserReturn::Invalid)
        }
    }
}
