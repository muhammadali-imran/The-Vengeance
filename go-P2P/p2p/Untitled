package p2p

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net"
	"strings"
)

func randHex(nBytes int) string {
	b := make([]byte, nBytes)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func normalizeAddr(addr string) string {
	addr = strings.TrimSpace(addr)
	addr = strings.TrimPrefix(addr, "tcp://")
	addr = strings.TrimPrefix(addr, "http://")
	addr = strings.TrimPrefix(addr, "https://")
	return addr
}

func isValidHostPort(addr string) bool {
	addr = normalizeAddr(addr)
	_, _, err := net.SplitHostPort(addr)
	return err == nil
}

func mustHostPort(addr string) string {
	addr = normalizeAddr(addr)
	if !isValidHostPort(addr) {
		panic(fmt.Sprintf("invalid addr: %s (expected host:port)", addr))
	}
	return addr
}
