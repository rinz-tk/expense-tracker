use std::error;
use std::fmt;
use std::io;
use hyper;
use serde_json;
use jsonwebtoken as jwt;
use serde_qs;

#[derive(Debug)]
pub enum WebErrorKind {
    Hyper,
    HyperHTTP,
    Io,
    SerdeJSON,
    JWT,
    SerdeQs,
}

#[derive(Debug)]
pub struct WebError {
    pub msg: String,
    pub kind: WebErrorKind
}

impl fmt::Display for WebError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?} -> {}", self.kind, self.msg)
    }
}

impl error::Error for WebError {}

impl From<hyper::http::Error> for WebError {
    fn from(value: hyper::http::Error) -> Self {
        WebError {
            msg: value.to_string(),
            kind: WebErrorKind::HyperHTTP
        }
    }
}

impl From<hyper::Error> for WebError {
    fn from(value: hyper::Error) -> Self {
        WebError {
            msg: value.to_string(),
            kind: WebErrorKind::Hyper
        }
    }
}

impl From<io::Error> for WebError {
    fn from(value: io::Error) -> Self {
        WebError {
            msg: value.to_string(),
            kind: WebErrorKind::Io
        }
    }
}

impl From<serde_json::Error> for WebError {
    fn from(value: serde_json::Error) -> Self {
        WebError {
            msg: value.to_string(),
            kind: WebErrorKind::SerdeJSON
        }
    }
}

impl From<jwt::errors::Error> for WebError {
    fn from(value: jwt::errors::Error) -> Self {
        WebError {
            msg: value.to_string(),
            kind: WebErrorKind::JWT
        }
    }
}

impl From<serde_qs::Error> for WebError {
    fn from(value: serde_qs::Error) -> Self {
        WebError {
            msg: value.to_string(),
            kind: WebErrorKind::SerdeQs
        }
    }
}
