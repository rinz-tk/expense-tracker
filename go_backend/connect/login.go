package connect

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	mm "go_backend/connect/map_manager"

	"github.com/golang-jwt/jwt/v5"
)

const AUTH_HEADER string = "Authorization"
const AUTH_BEARER string = "Bearer "

type Token struct {
	Type string `json:"type"`
	Id uint32 `json:"id"`
}

type ValidateTokenStatus uint32

const (
	TokenValid ValidateTokenStatus = iota
	TokenAbsent
	TokenInvalid
)

type ValidateToken struct {
	Status ValidateTokenStatus
	Token
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

func (c *Connect) encode_token(token *Token) (string, error) {
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
		encoded_token, err := c.encode_token(&token)
		if err != nil { return LoginReturn{}, err }

		return LoginReturn{ Status: "Ok", Token: encoded_token }, nil
	} else {
		c.Log(fmt.Sprintf("Password for %v doesn't match", login_info.Username))
		return LoginReturn{ Status: "NotMatch" }, nil
	}
}

func (c *Connect) validate_token(r *http.Request) ValidateToken {
	auth_slice, ok := r.Header["Authorization"]

	if !ok || len(auth_slice) == 0 {
		c.Log("Authorization header missing in request")
		return ValidateToken{ Status: TokenAbsent }
	}

	auth_header := auth_slice[0]
	if !strings.HasPrefix(auth_header, AUTH_BEARER) {
		c.Log(fmt.Sprintf("Bearer prefix absent in authorization header: %v", auth_header))
		return ValidateToken{ Status: TokenInvalid }
	}

	encoded_token := strings.TrimPrefix(auth_header, AUTH_BEARER)

	decoded, err := jwt.Parse(encoded_token,
		func(_ *jwt.Token) (any, error) { return LOGIN_KEY, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}))

	if err != nil {
		c.Log(fmt.Sprintf("Unable to parse token (%v): %v", encoded_token, err.Error()))
		return ValidateToken{ Status: TokenInvalid }
	}

	decoded_claims, ok := decoded.Claims.(jwt.MapClaims)
	if !ok {
		c.Log("Unexpected claims type")
		return ValidateToken{ Status: TokenInvalid }
	}

	decoded_json, err := json.Marshal(decoded_claims)
	if err != nil {
		c.Log(fmt.Sprintf("Error decoding claims: %v", err.Error()))
		return ValidateToken{ Status: TokenInvalid }
	}

	var token Token
	if err := json.Unmarshal(decoded_json, &token); err != nil {
		c.Log(fmt.Sprintf("Error decoding claims: %v", err.Error()))
		return ValidateToken{ Status: TokenInvalid }
	}

	switch token.Type {
	case "Session":
		c.SessionsCheckSend <- mm.MapCheck[uint32]{
			From: token.Id,
			WriteTo: c.SessionsCheckRecv,
		}

		if ok := <-c.SessionsCheckRecv; ok {
			c.Log(fmt.Sprintf("Authorization verified for session ID %v", token.Id))
		} else {
			c.Log(fmt.Sprintf("Invalid session id %v", token.Id))
			return ValidateToken{ Status: TokenInvalid }
		}

	case "User":
		c.UidsCheckSend <- mm.MapCheck[uint32]{
			From: token.Id,
			WriteTo: c.UidsCheckRecv,
		}

		if ok := <-c.UidsCheckRecv; ok {
			c.Log(fmt.Sprintf("Authorization verified for uid %v", token.Id))
		} else {
			c.Log(fmt.Sprintf("Invalid uid %v", token.Id))
			return ValidateToken{ Status: TokenInvalid }
		}
	}

	return ValidateToken{ Status: TokenValid, Token: token }
}
