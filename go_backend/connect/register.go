package connect

import (
	"fmt"
	"encoding/json"
	"net/http"

	mm "go_backend/connect/map_manager"
)

type RegistryVal struct {
	Password string
	Uid uint32
}

type RegisterInfo struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RegisterReturn struct {
	Status string `json:"status"`
	Token string `json:"token"`
}

func (c *Connect) register_user(r *http.Request) (RegisterReturn, error) {
	var reg_info RegisterInfo
	if err := json.NewDecoder(r.Body).Decode(&reg_info); err != nil {
		c.Log("Error while parsing JSON")
		return RegisterReturn{}, err
	}

	c.RegistryCheckSend <- mm.MapCheck[string]{
		From: reg_info.Username,
		WriteTo: c.RegistryCheckRecv,
	}

	if ok := <-c.RegistryCheckRecv; ok {
		c.Log(fmt.Sprintf("Username '%v' already exists", reg_info.Username))
		return RegisterReturn{ Status: "Exists" }, nil
	}

	id := <-c.UidChan

	c.Log(fmt.Sprintf("Adding username '%v' with password '%v' and uid '%v'", reg_info.Username, reg_info.Password, id))

	c.RegistryWriteSend <- mm.MapWrite[string, RegistryVal]{
		From: reg_info.Username,
		To: RegistryVal{
			Password: reg_info.Password,
			Uid: id,
		},
	}

	c.UidsWriteSend <- mm.MapWrite[uint32, string]{
		From: id,
		To: reg_info.Username,
	}

	token := Token{ Type: "User", Id: id }
	encoded_token, err := c.encode_token(token)
	if err != nil { return RegisterReturn{}, err }

	return RegisterReturn{ Status: "Ok", Token: encoded_token }, nil
}
