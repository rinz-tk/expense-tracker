package connect

import (
	"encoding/json"
	"fmt"
	"net/http"

	mm "go_backend/connect/map_manager"

	"github.com/golang-jwt/jwt/v5"
)

type Token struct {
	Type string `json:"type"`
	Id uint32 `json:"id"`
}

type LoginInfo struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginReturn struct {
	Status string `json:"status"`
	Token string `json:"token"`
}

var LOGIN_KEY []byte

func (c *Connect) encode_token(token Token) (string, error) {
	var claims jwt.MapClaims
	token_json, err := json.Marshal(token)
	if err != nil { return "", err }

	if err := json.Unmarshal(token_json, &claims); err != nil {
		return "", err
	}

	encoded_token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return encoded_token.SignedString(LOGIN_KEY)
}

func (c *Connect) new_session_token() Token {
	id := <-c.SessionIdChan
	c.Log(fmt.Sprintf("Creating new session token with ID: %v", id))

	c.SessionsWriteSend <- mm.MapWrite[uint32, struct{}]{
		From: id,
		To: struct{}{},
	}

	return Token{ Type: "Session", Id: id }
}

func (c *Connect) login_user(r *http.Request) (LoginReturn, error) {
	var login_info LoginInfo
	if err := json.NewDecoder(r.Body).Decode(&login_info); err != nil {
		c.Log("Error while parsing JSON")
		return LoginReturn{}, err
	}

	c.RegistryReadSend <- mm.MapRead[string, RegistryVal]{
		From: login_info.Username,
		WriteTo: c.RegistryReadRecv,
	}

	read_val := <-c.RegistryReadRecv
	if !read_val.Ok {
		c.Log(fmt.Sprintf("Username %v does not exist", login_info.Username))
		return LoginReturn{ Status: "NotExist" }, nil
	}

	if login_info.Password == read_val.Val.Password {
		c.Log(fmt.Sprintf("%v logged in", login_info.Username))

		token := Token{ Type: "User", Id: read_val.Val.Uid }
		encoded_token, err := c.encode_token(token)
		if err != nil { return LoginReturn{}, err }

		return LoginReturn{ Status: "Ok", Token: encoded_token }, nil
	} else {
		c.Log(fmt.Sprintf("Password for %v doesn't match", login_info.Username))
		return LoginReturn{ Status: "NotMatch" }, nil
	}
}
