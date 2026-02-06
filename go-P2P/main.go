package main

import (
	"flag"
	"fmt"
	"os"
	"strings"

	"go-p2p/p2p"
)

func main() {
	var port int
	var host string
	var id string
	var bootstrap string
	var httpPort int

	flag.StringVar(&host, "host", "127.0.0.1", "listen host")
	flag.IntVar(&port, "port", 9001, "p2p tcp port")
	flag.StringVar(&id, "id", "", "peer id (optional)")
	flag.StringVar(&bootstrap, "bootstrap", "", "comma-separated peers host:port")
	flag.IntVar(&httpPort, "http", 0, "optional http bridge port (0 disables)")
	flag.Parse()

	if id == "" {
		id = "peer-" + strings.ReplaceAll(fmt.Sprint(port), " ", "")
	}

	listenAddr := fmt.Sprintf("%s:%d", host, port)

	var boot []string
	if strings.TrimSpace(bootstrap) != "" {
		for _, a := range strings.Split(bootstrap, ",") {
			a = strings.TrimSpace(a)
			if a != "" {
				boot = append(boot, a)
			}
		}
	}

	httpAddr := ""
	if httpPort > 0 {
		httpAddr = fmt.Sprintf("%s:%d", host, httpPort)
	}

	peer := p2p.NewPeer(p2p.Config{
		ID:         id,
		ListenAddr: listenAddr,
		HTTPAddr:   httpAddr,
		Bootstrap:  boot,
		OnChat: func(m p2p.WireMessage) {
			text := m.Payload["text"]
			fmt.Printf("\n[CHAT] from=%s (%s): %s\n> ", m.FromID, m.FromAddr, text)
		},
	})

	if err := peer.Start(); err != nil {
		fmt.Println("start error:", err)
		os.Exit(1)
	}

	fmt.Println("======================================")
	fmt.Println("P2P peer running")
	fmt.Println("ID:     ", peer.ID)
	fmt.Println("Listen: ", peer.ListenAddr)
	if httpAddr != "" {
		fmt.Println("HTTP:   ", httpAddr, "(for Python bridge)")
	}
	fmt.Println("Bootstrap peers:", strings.Join(boot, ", "))
	fmt.Println("Type and press Enter to broadcast message.")
	fmt.Println("Commands: /peers   /add host:port   /quit")
	fmt.Println("======================================")
	fmt.Print("> ")

	// Simple CLI
	for {
		var line string
		_, err := fmt.Scanln(&line)
		if err != nil {
			// if user just presses enter, Scanln returns error; ignore
			fmt.Print("> ")
			continue
		}

		switch {
		case line == "/quit":
			peer.Stop()
			return

		case line == "/peers":
			fmt.Println("Known peers:", peer.KnownPeers())

		case strings.HasPrefix(line, "/add"):
			parts := strings.SplitN(line, " ", 2)
			if len(parts) == 2 {
				peer.AddPeer(parts[1])
				fmt.Println("Added:", parts[1])
			} else {
				fmt.Println("Usage: /add host:port")
			}

		default:
			peer.BroadcastChat(line)
		}

		fmt.Print("> ")
	}
}
