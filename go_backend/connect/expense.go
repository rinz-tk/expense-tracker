package connect

import (
	"encoding/json"
	"errors"
	"net/http"
)

type AddExpIn struct {
	Exp uint32 `json:"exp"`
	Desc string `json:"desc"`
	SplitList []string `json:"split_list"`
}

type AddExpReturn struct {
	Status string `json:"status"`
	Token string `json:"token"`
}

func (c *Connect) add_expense(r *http.Request) (AddExpReturn, error) {
	new_session := false

	var token Token
	validate := c.validate_token(r)
	switch validate.Status {
	case TokenValid:
		token = validate.Token
	case TokenAbsent:
		new_session = true
		token = c.new_session_token()
	case TokenInvalid:
		return AddExpReturn{ Status: "Invalid" }, nil
	}

	var exp_info AddExpIn
	if err := json.NewDecoder(r.Body).Decode(&exp_info); err != nil {
		c.Log("Error while parsing JSON")
		return AddExpReturn{}, err
	}

	switch token.Type {
	case "User":
	case "Session":
	default:
		return AddExpReturn{}, errors.New("Invalid token type")
	}

	if new_session {
		encoded_token, err := c.encode_token(&token)
		if err != nil { return AddExpReturn{}, err }

		return AddExpReturn{ Status: "New", Token: encoded_token }, nil
	} else {
		return AddExpReturn{ Status: "Ok" }, nil
	}
}
