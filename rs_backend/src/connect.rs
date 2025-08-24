use futures_util::lock::Mutex;
use http_body_util::StreamBody;
use tokio::fs::File;
use tokio_util::io::ReaderStream;
use futures_util::TryStreamExt;
use std::path::Path;
use std::collections::HashMap;
use std::sync::Arc;

use hyper::body::{Bytes, Frame, Incoming};
use hyper::{Method, Request, Response, StatusCode};
use http_body_util::{combinators::BoxBody, Full, Empty, BodyExt};
use mime_guess;

mod register;
mod login;
mod expense;

use crate::WebError;

const ROOT: &str = "..";
const INDEX: &str = "/react_frontend/dist/index.html";
const API: &str = "/api";

fn empty_err() -> Response<BoxBody<Bytes, WebError>> {
    let mut r = Response::new(Empty::<Bytes>::new()
        .map_err(|e| match e {})
        .boxed());

    *r.status_mut() = StatusCode::NOT_FOUND;
    return r;
}

fn full_err<T: Into<Bytes>>(data: T) -> Response<BoxBody<Bytes, WebError>> {
    let mut r = Response::new(Full::new(data.into())
        .map_err(|e| match e {})
        .boxed());

    *r.status_mut() = StatusCode::NOT_FOUND;
    return r;
}

fn full<T: Into<Bytes>>(data: T) -> Response<BoxBody<Bytes, WebError>> {
    Response::new(Full::new(data.into())
        .map_err(|e| match e {})
        .boxed())
}

pub struct Connect {
    id: u32,
    num: u32,

    registry: Arc<Mutex<HashMap<String, String>>>
}

impl Connect {
    pub fn new(id: u32, registry: Arc<Mutex<HashMap<String, String>>>) -> Connect {
        Connect { id: id, num: 0, registry: registry }
    }

    pub fn log_id(&self, msg: &str) {
        println!("[Connection {}] {}", self.id, msg);
    }

    fn log(&self, msg: &str) {
        println!("[Connection {}] <Request {}> {}", self.id, self.num, msg);
    }

    async fn serve_file(&self, filename: &str) -> Result<Response<BoxBody<Bytes, WebError>>, WebError> {
        let fname = format!("{ROOT}{filename}");
        match File::open(&fname).await {
            Ok(f) => {
                let mime_type = mime_guess::from_path(Path::new(&fname));
                let rs = ReaderStream::new(f).map_ok(|v| Frame::data(v)).map_err(|e| e.into());
                Ok(Response::builder()
                    .header("Content-Type", mime_type.first_or_text_plain().as_ref())
                    .body(StreamBody::new(rs).boxed())?)
            }

            Err(e) => {
                self.log(&format!("Unable to open file {}: {}", &fname, e));
                Ok(empty_err())
            }
        }
    }

    async fn trigger_endpoint(&mut self, req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, WebError>>, WebError> {
        let link = req.uri().path();
        match (req.method(), link.strip_prefix(API).unwrap()) {
            (&Method::POST, "/register") => {
                self.log("Endpoint register triggered");
                match self.register_user(req).await {
                    Ok(data) => Ok(full(serde_json::to_string(&data)?)),
                    Err(e) => Err(e)
                }
            }

            (&Method::POST, "/login") => {
                self.log("Endpoint login triggered");
                match self.login_user(req).await {
                    Ok(data) => Ok(full(serde_json::to_string(&data)?)),
                    Err(e) => Err(e)
                }
            }

            _ => {
                let err_msg = format!("Route doesn't exist: {link}");
                self.log(&err_msg);
                Ok(full_err(err_msg))
            }
        }
    }

    pub async fn route(&mut self, req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, WebError>>, WebError> {
        self.num += 1;

        let link = req.uri().path();
        let pt = Path::new(link);
        let ret = match pt.parent().map(|p| p.to_str().unwrap()) {
            None | Some(INDEX) => {
                self.log("Requested index");
                self.serve_file(&format!("{INDEX}")).await
            }

            Some(API) => {
                self.trigger_endpoint(req).await
            }

            _ => {
                self.log(&format!("Requested file: {link}"));
                self.serve_file(link).await
            }
        };

        if let Err(e) = &ret {
            self.log(&format!("Error: {e}"));
        }

        ret
    }
}
