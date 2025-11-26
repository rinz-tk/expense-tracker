package connect

import (
	"fmt"
	"strings"

	"net/http"
)

const ROOT = ".."
const INDEX = "/react_frontend/dist/index.html"
const API = "api/"

type RegistryVal struct {
	password string
	uid uint32
}

type RegistryRead struct {
	Username string
	WriteTo chan<- RegistryVal
}

type RegistryWrite struct {
	Username string
	WriteVal RegistryVal
}

type Connect struct {
	Id uint32

	RegistryReadSend chan<- RegistryRead
	RegistryReadRecv <-chan RegistryVal
	RegistryWriteSend chan<- RegistryWrite
}

func (c *Connect) Log(msg string) {
	fmt.Printf("[Request %v] %v\n", c.Id, msg)
}

func (c *Connect) trigger_endpoint(w http.ResponseWriter, r *http.Request) {
	link := r.URL.Path
	endpoint := strings.TrimPrefix(link, "/" + API)

	switch {
	case r.Method == "POST" && endpoint == "register":
		c.Log("Endpoint register triggered")
	}
}

func (c *Connect) Route(w http.ResponseWriter, r *http.Request) {
	link := r.URL.Path
	split := strings.SplitAfterN(link, "/", 3)

	switch split[1] {
		case "":
			c.Log("Requested index")
			http.ServeFile(w, r, fmt.Sprintf("%v%v", ROOT, INDEX))

		case API:
			c.trigger_endpoint(w, r)

		default:
			c.Log(fmt.Sprintf("Requested file: %v", link))
			http.ServeFile(w, r, fmt.Sprintf("%v%v", ROOT, link))
	}
}
