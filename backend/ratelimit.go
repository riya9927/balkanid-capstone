package main

import (
	"fmt"
	"io"
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	subscribers = make([]chan string, 0)
	mu          sync.Mutex
)

// broadcast sends a message to all connected clients
func broadcast(msg string) {
	mu.Lock()
	defer mu.Unlock()
	for _, ch := range subscribers {
		select {
		case ch <- msg:
		default:
		}
	}
}

// RealtimeHandler registers a new client for SSE
func RealtimeHandler(c *gin.Context) {
	// make a new channel for this client
	msgChan := make(chan string, 10)

	// add to global subscribers
	mu.Lock()
	subscribers = append(subscribers, msgChan)
	mu.Unlock()

	// remove subscriber on exit
	defer func() {
		mu.Lock()
		for i, ch := range subscribers {
			if ch == msgChan {
				subscribers = append(subscribers[:i], subscribers[i+1:]...)
				break
			}
		}
		mu.Unlock()
		close(msgChan)
	}()

	// set headers for SSE
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	// stream messages
	c.Stream(func(w io.Writer) bool {
		if msg, ok := <-msgChan; ok {
			c.SSEvent("message", msg)
			return true
		}
		return false
	})
}

// Example helper for download events
func notifyDownload(fileID uint, count int64) {
	msg := fmt.Sprintf(`{"type":"download","file_id":%d,"count":%d}`, fileID, count)
	broadcast(msg)
}

// Example helper for uploads
func notifyUpload(fileID uint, filename string) {
	msg := fmt.Sprintf(`{"type":"upload","file_id":%d,"filename":"%s"}`, fileID, filename)
	broadcast(msg)
}
