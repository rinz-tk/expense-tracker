package connect

import (
	"errors"
	"fmt"
	"strings"

	"encoding/json"
	"net/http"
)

const ROOT = ".."
const INDEX = "/react_frontend/dist/index.html"
const API = "api/"

type RegistryVal struct {
	password string
	uid uint32
}

type RegistryReadVal struct {
	Val RegistryVal
	Ok bool
}

type RegistryRead struct {
	Username string
	WriteTo chan RegistryReadVal
}

type RegistryWrite struct {
	Username string
	WriteVal RegistryVal
}

type RegistryCheck struct {
	Username string
	WriteTo chan bool
}

type RegisterInfo struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RegisterReturn struct {
	status string
	content string
}

type Connect struct {
	Id uint32
	UidChan chan uint32

	RegistryReadSend chan RegistryRead
	RegistryReadRecv chan RegistryVal
	RegistryWriteSend chan RegistryWrite
	RegistryCheckSend chan RegistryCheck
	RegistryCheckRecv chan bool
}

func (c *Connect) Log(msg string) {
	fmt.Printf("[Request %v] %v\n", c.Id, msg)
}

func (c *Connect) register_user(r *http.Request) (RegisterReturn, error) {
	var reg_info RegisterInfo
	if err := json.NewDecoder(r.Body).Decode(&reg_info); err != nil {
		c.Log("Error while parsing JSON")
		return RegisterReturn{}, err
	}

	c.RegistryCheckSend <- RegistryCheck{
		Username: reg_info.Username,
		WriteTo: c.RegistryCheckRecv,
	}

	if ok := <-c.RegistryCheckRecv; ok {
		c.Log(fmt.Sprintf("Username '%v' already exists", reg_info.Username))
		return RegisterReturn{ status: "Exists" }, nil
	}

	id := <-c.UidChan

	c.Log(fmt.Sprintf("Adding username '%v' with password '%v' and uid '%v'", reg_info.Username, reg_info.Password, id))
	c.RegistryWriteSend <- RegistryWrite{ reg_info.Username, RegistryVal{ reg_info.Password, id } }

	return RegisterReturn{}, errors.New("TODO")
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
