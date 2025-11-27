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

func manage_registry(read_chan <-chan con.RegistryRead, write_chan <-chan con.RegistryWrite, check_chan <-chan con.RegistryCheck) {
	registry := make(map[string]con.RegistryVal)

	for {
		select {
		case read := <-read_chan:
			val, ok := registry[read.Username]
			read.WriteTo <- con.RegistryReadVal{ Val: val, Ok: ok }
		case write := <-write_chan:
			registry[write.Username] = write.WriteVal
		case check := <-check_chan:
			_, ok := registry[check.Username]
			check.WriteTo <- ok
		}
	}
}

func main() {
	id_ch := make(chan uint32)
	uid_ch := make(chan uint32)
	registry_read_chan := make(chan con.RegistryRead)
	registry_write_chan := make(chan con.RegistryWrite)
	registry_check_chan := make(chan con.RegistryCheck)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		c := con.Connect {
			Id: <-id_ch,
			UidChan: uid_ch,
			RegistryReadSend: registry_read_chan,
			RegistryReadRecv: make(chan con.RegistryVal),
			RegistryWriteSend: registry_write_chan,
			RegistryCheckSend: registry_check_chan,
			RegistryCheckRecv: make(chan bool),
		}
		c.Route(w, r)
	})

	go gen_id(id_ch)
	go gen_id(uid_ch)
	go manage_registry(registry_read_chan, registry_write_chan, registry_check_chan)

	addr := "127.0.0.1:3003"
	fmt.Printf("Connect to -> http://%v\n", addr)
	http.ListenAndServe(addr, nil)
}
