package p2p

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type Peer struct {
	ID         string
	ListenAddr string
	HTTPAddr   string
	PythonURL  string // NEW: http://127.0.0.1:7001

	mu         sync.Mutex
	knownPeers map[string]struct{}
	conns      map[string]net.Conn
	seenMsg    map[string]int64

	onChat     func(WireMessage)
	httpServer *http.Server
	ctx        context.Context
	cancel     context.CancelFunc
}

type Config struct {
	ID         string
	ListenAddr string
	HTTPAddr   string
	PythonURL  string // NEW
	Bootstrap  []string
	OnChat     func(WireMessage)
}

func NewPeer(cfg Config) *Peer {
	ctx, cancel := context.WithCancel(context.Background())

	p := &Peer{
		ID:         cfg.ID,
		ListenAddr: mustHostPort(cfg.ListenAddr),
		HTTPAddr:   strings.TrimSpace(cfg.HTTPAddr),
		PythonURL:  strings.TrimSpace(cfg.PythonURL),
		knownPeers: map[string]struct{}{},
		conns:      map[string]net.Conn{},
		seenMsg:    map[string]int64{},
		onChat:     cfg.OnChat,
		ctx:        ctx,
		cancel:     cancel,
	}

	for _, b := range cfg.Bootstrap {
		b = normalizeAddr(b)
		if b != "" && isValidHostPort(b) && b != p.ListenAddr {
			p.knownPeers[b] = struct{}{}
		}
	}
	return p
}

func (p *Peer) Start() error {
	ln, err := net.Listen("tcp", p.ListenAddr)
	if err != nil {
		return err
	}

	go func() {
		defer ln.Close()
		for {
			conn, err := ln.Accept()
			if err != nil {
				select {
				case <-p.ctx.Done():
					return
				default:
				}
				continue
			}
			go p.handleConn(conn)
		}
	}()

	go p.dialKnownPeersLoop()
	go p.gcSeenLoop()

	if p.HTTPAddr != "" {
		if err := p.startHTTPBridge(); err != nil {
			return err
		}
	}

	return nil
}

func (p *Peer) BroadcastEvent(eventType string, payload map[string]any) {
	event := map[string]any{
		"event_type": eventType,
		"payload":    payload,
		"peer_id":    p.ID,
		"timestamp":  time.Now().Unix(),
	}

	raw, _ := json.Marshal(event)

	msg := WireMessage{
		Type:      MsgChat,
		ID:        fmt.Sprintf("%s-%s", p.ID, randHex(8)),
		FromID:    p.ID,
		FromAddr:  p.ListenAddr,
		Timestamp: nowMillis(),
		Payload: map[string]string{
			"event": string(raw),
		},
	}

	p.markSeen(msg.ID)
	p.broadcast(msg, "")

	// 🔥 Forward locally-created event to Python
	p.forwardToPython(event)
}

func (p *Peer) handleConn(conn net.Conn) {
	reader := bufio.NewReader(conn)
	defer conn.Close()

	for {
		msg, err := readJSONLine(reader)
		if err != nil {
			return
		}

		if msg.ID != "" && p.hasSeen(msg.ID) {
			continue
		}
		p.markSeen(msg.ID)

		if msg.Type == MsgChat {
			raw, ok := msg.Payload["event"]
			if !ok {
				continue
			}

			var event map[string]any
			if err := json.Unmarshal([]byte(raw), &event); err != nil {
				continue
			}

			fmt.Println("[EVENT RECEIVED]", event)

			// 🔥 Forward received event to Python
			p.forwardToPython(event)

			p.broadcast(msg, msg.FromAddr)
		}
	}
}

func (p *Peer) forwardToPython(event map[string]any) {
	if p.PythonURL == "" {
		return
	}

	body, _ := json.Marshal(event)

	go func() {
		http.Post(
			p.PythonURL+"/event",
			"application/json",
			bytes.NewBuffer(body),
		)
	}()
}

func (p *Peer) broadcast(msg WireMessage, exclude string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	for addr, c := range p.conns {
		if addr == exclude {
			continue
		}
		_ = writeJSONLine(c, msg)
	}
}

func (p *Peer) dialKnownPeersLoop() {
	t := time.NewTicker(2 * time.Second)
	defer t.Stop()

	for {
		select {
		case <-p.ctx.Done():
			return
		case <-t.C:
			for _, addr := range p.KnownPeers() {
				p.mu.Lock()
				_, ok := p.conns[addr]
				p.mu.Unlock()
				if !ok {
					conn, err := net.Dial("tcp", addr)
					if err == nil {
						p.mu.Lock()
						p.conns[addr] = conn
						p.mu.Unlock()
						go p.handleConn(conn)
					}
				}
			}
		}
	}
}

func (p *Peer) KnownPeers() []string {
	p.mu.Lock()
	defer p.mu.Unlock()
	out := make([]string, 0, len(p.knownPeers))
	for a := range p.knownPeers {
		out = append(out, a)
	}
	return out
}

func (p *Peer) hasSeen(id string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	_, ok := p.seenMsg[id]
	return ok
}

func (p *Peer) markSeen(id string) {
	p.mu.Lock()
	p.seenMsg[id] = nowMillis()
	p.mu.Unlock()
}

func (p *Peer) gcSeenLoop() {
	t := time.NewTicker(30 * time.Second)
	defer t.Stop()

	for {
		select {
		case <-p.ctx.Done():
			return
		case <-t.C:
			cut := nowMillis() - 5*60*1000
			p.mu.Lock()
			for k, v := range p.seenMsg {
				if v < cut {
					delete(p.seenMsg, k)
				}
			}
			p.mu.Unlock()
		}
	}
}

func (p *Peer) startHTTPBridge() error {
	if !isValidHostPort(p.HTTPAddr) {
		return errors.New("invalid HTTPAddr")
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/publish", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			EventType string         `json:"event_type"`
			Payload   map[string]any `json:"payload"`
		}
		json.NewDecoder(r.Body).Decode(&body)
		p.BroadcastEvent(body.EventType, body.Payload)
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})
	p.httpServer = &http.Server{Addr: p.HTTPAddr, Handler: mux}
	go p.httpServer.ListenAndServe()
	return nil
}
