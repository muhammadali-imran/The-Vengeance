package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"

	"go-p2p/p2p"
)

func main() {
	port := flag.Int("port", 9001, "p2p port")
	id := flag.String("id", "peer", "peer id")
	bootstrap := flag.String("bootstrap", "", "bootstrap addr")
	python := flag.String("python", "http://127.0.0.1:7001", "python truth node url")
	flag.Parse()

	peer := p2p.NewPeer(p2p.Config{
		ID:         *id,
		ListenAddr: fmt.Sprintf("127.0.0.1:%d", *port),
		PythonURL:  *python,
		Bootstrap: func() []string {
			if strings.TrimSpace(*bootstrap) == "" {
				return []string{}
			}
			return []string{*bootstrap}
		}(),
	})

	if err := peer.Start(); err != nil {
		panic(err)
	}

	fmt.Println("======================================")
	fmt.Println("P2P peer running")
	fmt.Println("ID:     ", *id)
	fmt.Println("Listen: ", fmt.Sprintf("127.0.0.1:%d", *port))
	fmt.Println("Python: ", *python)
	fmt.Println("Type a full line and press Enter.")
	fmt.Println("======================================")

	in := bufio.NewReader(os.Stdin)
	for {
		line, err := in.ReadString('\n')
		if err != nil {
			return
		}
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		peer.BroadcastEvent(
			"RUMOR_SUBMITTED",
			map[string]any{
				"text":  line,
				"topic": "general",
			},
		)
	}
}
