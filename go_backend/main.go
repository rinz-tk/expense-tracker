package main

import (
	"fmt"
	"os"

	"net/http"
	con "go_backend/connect"
	mm "go_backend/connect/map_manager"
)

func gen_id(id_ch chan<- uint32) {
	var counter uint32 = 0

	for {
		id_ch <- counter
		counter += 1
	}
}

func main() {
	var err error
	con.LOGIN_KEY, err = os.ReadFile("secret/secret_key")
	if err != nil { panic(err) }

	id_ch := make(chan uint32)
	uid_ch := make(chan uint32)
	session_id_ch := make(chan uint32)

	registry_read_chan := make(chan mm.MapRead[string, con.RegistryVal])
	registry_write_chan := make(chan mm.MapWrite[string, con.RegistryVal])
	registry_check_chan := make(chan mm.MapCheck[string])

	uids_read_chan := make(chan mm.MapRead[uint32, string])
	uids_write_chan := make(chan mm.MapWrite[uint32, string])
	uids_check_chan := make(chan mm.MapCheck[uint32])

	sessions_write_chan := make(chan mm.MapWrite[uint32, struct{}])
	sessions_check_chan := make(chan mm.MapCheck[uint32])

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		c := con.Connect {
			Id: <-id_ch,
			UidChan: uid_ch,
			SessionIdChan: session_id_ch,

			RegistryReadSend: registry_read_chan,
			RegistryReadRecv: make(chan mm.MapReadVal[con.RegistryVal]),
			RegistryWriteSend: registry_write_chan,
			RegistryCheckSend: registry_check_chan,
			RegistryCheckRecv: make(chan bool),

			UidsReadSend: uids_read_chan,
			UidsReadRecv: make(chan mm.MapReadVal[string]),
			UidsWriteSend: uids_write_chan,
			UidsCheckSend: uids_check_chan,
			UidsCheckRecv: make(chan bool),

			SessionsWriteSend: sessions_write_chan,
			SessionsCheckSend: sessions_check_chan,
			SessionsCheckRecv: make(chan bool),
		}
		c.Route(w, r)
	})

	go gen_id(id_ch)
	go gen_id(uid_ch)
	go gen_id(session_id_ch)

	go mm.ManageMap(registry_read_chan, registry_write_chan, registry_check_chan)
	go mm.ManageMap(uids_read_chan, uids_write_chan, uids_check_chan)
	go mm.ManageMap(nil, sessions_write_chan, sessions_check_chan)

	addr := "127.0.0.1:3003"
	fmt.Printf("Connect to -> http://%v\n", addr)
	http.ListenAndServe(addr, nil)
}
