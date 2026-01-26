package connect

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	em "go_backend/connect/expense_manager"
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
		return AddExpReturn{}, errors.New("TODO: User implementation of Add Expense")

	case "Session":
		new_exp := em.Expense{
			Exp: exp_info.Exp,
			Desc: exp_info.Desc,
			Target: exp_info.Exp,
		}

		c.SessionExpAddSend <- em.AddExpense{
			Uid: token.Id,
			Exp: new_exp,
		}

		c.Log(fmt.Sprintf("Added expense for session ID %v: %v", token.Id, new_exp))

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

func (c *Connect) get_expenses(r *http.Request) ([]byte, error) {
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
		ret := em.GetExpReturn{ Status: "Invalid" }
		out, err := json.Marshal(ret)
		return out, err
	}

	switch token.Type {
	case "User":
		return nil, errors.New("TODO: User implementation of Get Expense")

	case "Session":
		ret := em.GetExpReturn{ Status: "Ok" }

		if new_session {
			new_token, err := c.encode_token(&token)
			if err != nil { return nil, err }

			ret.Status = "New"
			ret.Token = new_token
		}

		c.SessionExpGetSend <- em.GetExpense{
			Uid: token.Id,
			ReturnObject: ret,
			ReturnTo: c.SessionExpGetRecv,
		}

		out := <-c.SessionExpGetRecv
		return out.Return, out.Error

	default:
		return nil, errors.New("Invalid token type")
	}
}
