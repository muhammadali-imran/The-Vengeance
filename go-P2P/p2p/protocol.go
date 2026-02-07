package p2p

import (
	"bufio"
	"encoding/json"
	"errors"
	"io"
	"net"
	"strings"
	"time"
)

type MsgType string

const (
	MsgHello    MsgType = "HELLO"
	MsgPeerList MsgType = "PEERLIST"
	MsgChat     MsgType = "CHAT"
	MsgPing     MsgType = "PING"
	MsgPong     MsgType = "PONG"
)

type WireMessage struct {
	Type      MsgType           `json:"type"`
	ID        string            `json:"id"`         // unique msg id (dedupe)
	FromID    string            `json:"from_id"`    // sender peer id
	FromAddr  string            `json:"from_addr"`  // sender listen addr
	Timestamp int64             `json:"ts"`         // unix millis
	Payload   map[string]string `json:"payload"`    // small payloads (keep simple)
	Peers     []string          `json:"peers"`      // for PEERLIST
}

// JSON Lines framing: each message = one line of JSON
func writeJSONLine(conn net.Conn, msg WireMessage) error {
	b, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	_, err = conn.Write(append(b, '\n'))
	return err
}

func readJSONLine(r *bufio.Reader) (WireMessage, error) {
	line, err := r.ReadString('\n')
	if err != nil {
		if errors.Is(err, io.EOF) {
			return WireMessage{}, io.EOF
		}
		return WireMessage{}, err
	}
	line = strings.TrimSpace(line)
	if line == "" {
		return WireMessage{}, errors.New("empty line")
	}
	var msg WireMessage
	if err := json.Unmarshal([]byte(line), &msg); err != nil {
		return WireMessage{}, err
	}
	return msg, nil
}

func nowMillis() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}
