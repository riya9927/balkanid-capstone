package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

// Simple in-memory store for SSE connections
var (
	clients = make(map[chan string]bool)
	clientsMu sync.RWMutex
)

// broadcast sends a message to all connected SSE clients
func broadcast(message string) {
	clientsMu.RLock()
	defer clientsMu.RUnlock()
	
	for client := range clients {
		select {
		case client <- message:
		default:
			// Client channel is full, remove it
			close(client)
			delete(clients, client)
		}
	}
}

// GET /realtime - Server-Sent Events endpoint for real-time updates
func RealtimeHandler(c *gin.Context) {
	// Set headers for SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	// Create a channel for this client
	clientChan := make(chan string, 10)
	
	// Add client to the map
	clientsMu.Lock()
	clients[clientChan] = true
	clientsMu.Unlock()

	// Remove client when done
	defer func() {
		clientsMu.Lock()
		delete(clients, clientChan)
		close(clientChan)
		clientsMu.Unlock()
	}()

	// Send initial connection message
	c.SSEvent("connected", "Real-time updates connected")
	c.Writer.Flush()

	// Listen for messages
	for {
		select {
		case message := <-clientChan:
			c.SSEvent("update", message)
			c.Writer.Flush()
		case <-c.Request.Context().Done():
			return
		}
	}
}

// Example usage: call this when a file is downloaded
func notifyFileDownload(fileID int, downloadCount int64) {
	message := fmt.Sprintf(`{"type": "download", "file_id": %d, "download_count": %d}`, fileID, downloadCount)
	broadcast(message)
}