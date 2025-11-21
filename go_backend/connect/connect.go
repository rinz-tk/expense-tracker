package connect

import (
	"fmt"
	"strings"

	"net/http"
)

const ROOT = ".."
const INDEX = "/react_frontend/dist/index.html"
const API = "api/"

type Connect struct {
	Id uint32
}

func (c *Connect) Log(msg string) {
	fmt.Printf("[Request %v] %v\n", c.Id, msg)
}

func (c *Connect) Route(w http.ResponseWriter, r *http.Request) {
	link := r.URL.Path
	split := strings.SplitAfterN(link, "/", 2)

	switch split[1] {
		case "":
			c.Log("Requested index")
			http.ServeFile(w, r, fmt.Sprintf("%v%v", ROOT, INDEX))

		// case API:
		// 	c.trigger_endpoint(w, r)

		default:
			c.Log(fmt.Sprintf("Requested file: %v", split[1]))
			http.ServeFile(w, r, fmt.Sprintf("%v%v", ROOT, link))
	}
}
