package main

import (
	"fmt"
	"strings"

	"net/http"
)

const ROOT = ".."
const INDEX = "/react_frontend/dist/index.html"
const API = "api/"

func main() {
	ch := make(chan int32)

	go func() {
		var counter int32 = 0

		for {
			ch <- counter
			counter += 1
		}
	}()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		i := <-ch

		link := r.URL.Path
		split := strings.SplitAfterN(link, "/", 2)

		switch split[1] {
			case "":
				fmt.Printf("[Request %v] Requested index\n", i)
				http.ServeFile(w, r, fmt.Sprintf("%v%v", ROOT, INDEX))

			default:
				fmt.Printf("[Request %v] Requested file: %v\n", i, split[1])
				http.ServeFile(w, r, fmt.Sprintf("%v%v", ROOT, link))
		}
	})

	addr := "127.0.0.1:3003"
	fmt.Printf("Connect to -> http://%v\n", addr)
	http.ListenAndServe(addr, nil)
}
