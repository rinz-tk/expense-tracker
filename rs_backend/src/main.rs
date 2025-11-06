use std::collections::{HashMap, HashSet};
use std::net::SocketAddr;
use std::sync::Arc;
use futures_util::lock::Mutex;
use tokio::net::{TcpListener, TcpStream};

use http_body_util::combinators::BoxBody;
use hyper_util::rt::TokioIo;
use hyper::server::conn::http1;
use hyper::service::{service_fn};
use hyper::{Request, Response};
use hyper::body::{Bytes, Incoming};

mod connect;
mod web_error;

use connect::Connect;
use connect::Expense;
use web_error::WebError;

async fn process(wrapped_state: &Mutex<Connect>, req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, WebError>>, WebError> {
    let mut state = wrapped_state.lock().await;
    state.route(req).await
}

async fn respond(socket: TcpStream, state: Connect) {
    let wrapped_state = Mutex::new(state);
    let service_close = |req: Request<Incoming>| { process(&wrapped_state, req) };

    let ret = http1::Builder::new().serve_connection(TokioIo::new(socket), service_fn(service_close)).await;

    let state = wrapped_state.into_inner();
    match ret {
        Ok(()) => state.log_id("End"),
        Err(e) => state.log_id(&format!("End with Error -> {e}"))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = SocketAddr::from(([127, 0, 0, 1], 3003));
    println!("Connect to -> http://{addr}");

    let listener = TcpListener::bind(addr).await?;

    let mut count: u32 = 0;
    let next_user_id: Arc<Mutex<u32>> = Arc::new(Mutex::new(0));
    let next_session_id: Arc<Mutex<u32>> = Arc::new(Mutex::new(0));

    let registry: Arc<Mutex<HashMap<String, (String, u32)>>> = Arc::new(Mutex::new(HashMap::new()));
    let uids: Arc<Mutex<HashMap<u32, String>>> = Arc::new(Mutex::new(HashMap::new()));
    let sessions : Arc<Mutex<HashSet<u32>>> = Arc::new(Mutex::new(HashSet::new()));

    let user_exp: Arc<Mutex<HashMap<u32, Vec<Expense>>>> = Arc::new(Mutex::new(HashMap::new()));
    let session_exp: Arc<Mutex<HashMap<u32, Vec<Expense>>>> = Arc::new(Mutex::new(HashMap::new()));

    let pending = Arc::new(Mutex::new(HashMap::new()));
    let owed = Arc::new(Mutex::new(HashMap::new()));

    loop {
        let (socket, _) = listener.accept().await?;

        count += 1;
        let state = Connect::new(
            count,
            Arc::clone(&sessions),
            Arc::clone(&registry),
            Arc::clone(&next_session_id),
            Arc::clone(&next_user_id),
            Arc::clone(&uids),
            Arc::clone(&session_exp),
            Arc::clone(&user_exp),
            Arc::clone(&pending),
            Arc::clone(&owed),
        );
        state.log_id("Begin");

        tokio::spawn(respond(socket, state));
    }
}
