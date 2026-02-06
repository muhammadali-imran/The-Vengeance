package main

import (
	"flag"
	"fmt"
	"math/rand"
	"time"

	"go-p2p/p2p"
)

func main() {
	var n int
	var base int
	var host string
	flag.IntVar(&n, "n", 20, "number of peers")
	flag.IntVar(&base, "base", 9100, "base port (peers use base..base+n-1)")
	flag.StringVar(&host, "host", "127.0.0.1", "host")
	flag.Parse()

	rand.Seed(time.Now().UnixNano())

	peers := make([]*p2p.Peer, 0, n)

	// Start peers
	for i := 0; i < n; i++ {
		port := base + i
		listen := fmt.Sprintf("%s:%d", host, port)

		bootstrap := []string{}
		if i > 0 {
			// bootstrap to first peer
			bootstrap = []string{fmt.Sprintf("%s:%d", host, base)}
		}

		pp := p2p.NewPeer(p2p.Config{
			ID:         fmt.Sprintf("P%02d", i),
			ListenAddr: listen,
			Bootstrap:  bootstrap,
			OnChat: func(m p2p.WireMessage) {
				// keep quiet for large N (comment out to print)
				// fmt.Printf("[recv] %s: %s\n", m.FromID, m.Payload["text"])
			},
		})

		if err := pp.Start(); err != nil {
			panic(err)
		}
		peers = append(peers, pp)
	}

	fmt.Println("Started peers:", n)
	fmt.Println("Waiting for discovery...")
	time.Sleep(3 * time.Second)

	// Send random messages
	total := 80
	for i := 0; i < total; i++ {
		sender := peers[rand.Intn(len(peers))]
		sender.BroadcastChat(fmt.Sprintf("msg-%d from %s", i, sender.ID))
		time.Sleep(80 * time.Millisecond)
	}

	fmt.Println("Sent messages. Let gossip settle...")
	time.Sleep(3 * time.Second)

	// Print peer counts
	for _, pp := range peers {
		fmt.Printf("%s listen=%s known_peers=%d\n", pp.ID, pp.ListenAddr, len(pp.KnownPeers()))
	}

	// Stop
	for _, pp := range peers {
		pp.Stop()
	}
	fmt.Println("Done.")
}
