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

func manage_registry(read_chan <-chan con.RegistryRead, write_chan <-chan con.RegistryWrite) {
	registry := make(map[string]con.RegistryVal)

	for {
		select {
		case read := <-read_chan:
			read.WriteTo <- registry[read.Username]
		case write := <-write_chan:
			registry[write.Username] = write.WriteVal
		}
	}
}

func main() {
	id_ch := make(chan uint32)
	registry_read_chan := make(chan con.RegistryRead)
	registry_write_chan := make(chan con.RegistryWrite)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		c := con.Connect {
			Id: <-id_ch,
			RegistryReadSend: registry_read_chan,
			RegistryReadRecv: make(chan con.RegistryVal),
			RegistryWriteSend: registry_write_chan,
		}
		c.Route(w, r)
	})

	go gen_id(id_ch)
	go manage_registry(registry_read_chan, registry_write_chan)

	addr := "127.0.0.1:3003"
	fmt.Printf("Connect to -> http://%v\n", addr)
	http.ListenAndServe(addr, nil)
}
