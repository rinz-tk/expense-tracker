#!/bin/bash

(cd react_frontend/ && npm run build) && (cd go_backend && go build && clear && ./go_backend)
