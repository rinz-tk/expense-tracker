package main

import (
	"fmt"

	"net/http"
)

const ROOT = ".."
const INDEX = "/react_frontend/dist/index.html"
const API = "/api"

func main() {
	http.HandleFunc("/{$}", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, fmt.Sprintf("%v%v", ROOT, INDEX))
	})

	http.Handle("/", http.FileServer(http.Dir(ROOT)))

	addr := "127.0.0.1:3003"
	fmt.Printf("Connect to -> http://%v\n", addr)
	http.ListenAndServe(addr, nil)
}
