#!/bin/bash

(cd react_frontend/ && npm run build) && (cd rs_backend && cargo build --release && clear && ./target/release/rs_backend)
