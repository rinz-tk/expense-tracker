package main

import (
	"fmt"

	"net/http"
	con "go_backend/connect"
)

func gen_id(id_ch chan<- uint32) {
	var counter uint32 = 0

	for {
		id_ch <- counter
		counter += 1
	}
}

func main() {
	id_ch := make(chan uint32)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		c := con.Connect { Id: <-id_ch }
		c.Route(w, r)
	})

	go gen_id(id_ch)

	addr := "127.0.0.1:3003"
	fmt.Printf("Connect to -> http://%v\n", addr)
	http.ListenAndServe(addr, nil)
}
