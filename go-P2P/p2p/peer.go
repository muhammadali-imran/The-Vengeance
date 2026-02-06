package p2p

import (
	"bufio"
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
	ListenAddr string // host:port
	HTTPAddr   string // host:port (optional)

	mu         sync.Mutex
	knownPeers map[string]struct{} // addr -> set
	conns      map[string]net.Conn // addr -> conn
	seenMsg    map[string]int64    // msgID -> timestamp millis

	onChat     func(WireMessage)
	httpServer *http.Server
	ctx        context.Context
	cancel     context.CancelFunc
}

type Config struct {
	ID         string
	ListenAddr string
	HTTPAddr   string
	Bootstrap  []string
	OnChat     func(WireMessage)
}

func NewPeer(cfg Config) *Peer {
	ctx, cancel := context.WithCancel(context.Background())

	p := &Peer{
		ID:         cfg.ID,
		ListenAddr: mustHostPort(cfg.ListenAddr),
		HTTPAddr:   strings.TrimSpace(cfg.HTTPAddr),
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

	// Accept loop
	go func() {
		defer ln.Close()
		for {
			conn, err := ln.Accept()
			if err != nil {
				select {
				case <-p.ctx.Done():
					return
				default:
					continue
				}
			}
			go p.handleConn(conn, true)
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

func (p *Peer) Stop() {
	p.cancel()

	p.mu.Lock()
	for _, c := range p.conns {
		_ = c.Close()
	}
	p.conns = map[string]net.Conn{}
	p.mu.Unlock()

	if p.httpServer != nil {
		_ = p.httpServer.Shutdown(context.Background())
	}
}

func (p *Peer) AddPeer(addr string) {
	addr = normalizeAddr(addr)
	if addr == "" || !isValidHostPort(addr) || addr == p.ListenAddr {
		return
	}
	p.mu.Lock()
	p.knownPeers[addr] = struct{}{}
	p.mu.Unlock()
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

func (p *Peer) BroadcastChat(text string) {
	msg := WireMessage{
		Type:      MsgChat,
		ID:        fmt.Sprintf("%s-%s", p.ID, randHex(8)),
		FromID:    p.ID,
		FromAddr:  p.ListenAddr,
		Timestamp: nowMillis(),
		Payload:   map[string]string{"text": text},
	}

	p.markSeen(msg.ID)
	p.broadcast(msg, "")

	if p.onChat != nil {
		p.onChat(msg)
	}
}

func (p *Peer) dialKnownPeersLoop() {
	ticker := time.NewTicker(1200 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-p.ctx.Done():
			return
		case <-ticker.C:
			for _, addr := range p.KnownPeers() {
				if addr == p.ListenAddr {
					continue
				}
				p.mu.Lock()
				_, ok := p.conns[addr]
				p.mu.Unlock()
				if !ok {
					go p.dial(addr)
				}
			}
		}
	}
}

func (p *Peer) dial(addr string) {
	conn, err := net.DialTimeout("tcp", addr, 2*time.Second)
	if err != nil {
		return
	}
	p.handleConn(conn, false)
}

func (p *Peer) handleConn(conn net.Conn, inbound bool) {
	reader := bufio.NewReader(conn)

	hello := WireMessage{
		Type:      MsgHello,
		ID:        fmt.Sprintf("%s-%s", p.ID, randHex(8)),
		FromID:    p.ID,
		FromAddr:  p.ListenAddr,
		Timestamp: nowMillis(),
		Payload:   map[string]string{"inbound": fmt.Sprintf("%v", inbound)},
	}
	_ = writeJSONLine(conn, hello)
	p.sendPeerList(conn)

	var theirAddr string

	for {
		msg, err := readJSONLine(reader)
		if err != nil {
			_ = conn.Close()
			if theirAddr != "" {
				p.mu.Lock()
				delete(p.conns, theirAddr)
				p.mu.Unlock()
			}
			return
		}

		if msg.FromAddr != "" && isValidHostPort(msg.FromAddr) {
			theirAddr = msg.FromAddr
			p.AddPeer(theirAddr)
			p.mu.Lock()
			p.conns[theirAddr] = conn
			p.mu.Unlock()
		}

		if msg.ID != "" && p.hasSeen(msg.ID) {
			continue
		}
		p.markSeen(msg.ID)

		switch msg.Type {
		case MsgHello:
			p.sendPeerList(conn)

		case MsgPeerList:
			for _, a := range msg.Peers {
				p.AddPeer(a)
			}

		case MsgChat:
			if p.onChat != nil {
				p.onChat(msg)
			}
			p.broadcast(msg, msg.FromAddr)

		case MsgPing:
			pong := WireMessage{
				Type:      MsgPong,
				ID:        fmt.Sprintf("%s-%s", p.ID, randHex(8)),
				FromID:    p.ID,
				FromAddr:  p.ListenAddr,
				Timestamp: nowMillis(),
			}
			_ = writeJSONLine(conn, pong)
		}
	}
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

func (p *Peer) sendPeerList(conn net.Conn) {
	peers := append(p.KnownPeers(), p.ListenAddr)
	m := WireMessage{
		Type:      MsgPeerList,
		ID:        fmt.Sprintf("%s-%s", p.ID, randHex(8)),
		FromID:    p.ID,
		FromAddr:  p.ListenAddr,
		Timestamp: nowMillis(),
		Peers:     peers,
	}
	_ = writeJSONLine(conn, m)
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
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			Text string `json:"text"`
		}
		defer r.Body.Close()

		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Text) == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		p.BroadcastChat(body.Text)
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})

	mux.HandleFunc("/peers", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":     p.ID,
			"listen": p.ListenAddr,
			"peers":  p.KnownPeers(),
		})
	})

	p.httpServer = &http.Server{
		Addr:    p.HTTPAddr,
		Handler: mux,
	}

	go p.httpServer.ListenAndServe()
	return nil
}
