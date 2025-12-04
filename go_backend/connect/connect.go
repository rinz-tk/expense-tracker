package connect

import (
	"errors"
	"fmt"
	"strings"

	"encoding/json"
	"net/http"

	mm "go_backend/connect/map_manager"
)

const ROOT = ".."
const INDEX = "/react_frontend/dist/index.html"
const API = "api/"

type Connect struct {
	Id uint32
	UidChan chan uint32
	SessionIdChan chan uint32

	RegistryReadSend chan mm.MapRead[string, RegistryVal]
	RegistryReadRecv chan mm.MapReadVal[RegistryVal]
	RegistryWriteSend chan mm.MapWrite[string, RegistryVal]
	RegistryCheckSend chan mm.MapCheck[string]
	RegistryCheckRecv chan bool

	UidsReadSend chan mm.MapRead[uint32, string]
	UidsReadRecv chan mm.MapReadVal[string]
	UidsWriteSend chan mm.MapWrite[uint32, string]
	UidsCheckSend chan mm.MapCheck[uint32]
	UidsCheckRecv chan bool

	SessionsWriteSend chan mm.MapWrite[uint32, struct{}]
	SessionsCheckSend chan mm.MapCheck[uint32]
	SessionsCheckRecv chan bool
}

func (c *Connect) Log(msg string) {
	fmt.Printf("[Request %v] %v\n", c.Id, msg)
}

func (c *Connect) trigger_endpoint(w http.ResponseWriter, r *http.Request) error {
	link := r.URL.Path
	endpoint := strings.TrimPrefix(link, "/" + API)

	var out []byte
	switch {
	case r.Method == "POST" && endpoint == "register":
		c.Log("Endpoint register triggered")

		data, err := c.register_user(r)
		if err != nil { return err }

		out, err = json.Marshal(data)
		if err != nil { return err }

	case r.Method == "POST" && endpoint == "login":
		c.Log("Endpoint login triggered")

		data, err := c.login_user(r)
		if err != nil { return err }

		out, err = json.Marshal(data)
		if err != nil { return err }

	default:
		err_msg := fmt.Sprintf("Route doesn't exist: %v", link)
		return errors.New(err_msg)
	}

	w.Write(out)
	return nil
}

func (c *Connect) Route(w http.ResponseWriter, r *http.Request) {
	link := r.URL.Path
	split := strings.SplitAfterN(link, "/", 3)

	switch split[1] {
		case "":
			c.Log("Requested index")
			http.ServeFile(w, r, fmt.Sprintf("%v%v", ROOT, INDEX))

		case API:
			if err := c.trigger_endpoint(w, r); err != nil {
				c.Log(fmt.Sprintf("Error: %v", err.Error()))
				http.Error(w, err.Error(), http.StatusBadRequest)
			}

		default:
			c.Log(fmt.Sprintf("Requested file: %v", link))
			http.ServeFile(w, r, fmt.Sprintf("%v%v", ROOT, link))
	}
}
