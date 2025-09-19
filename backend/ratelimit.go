// package main

// import (
// 	"net/http"
// 	"sync"

// 	"github.com/gin-gonic/gin"
// 	"golang.org/x/time/rate"
// )

// var (
// 	limiterMap = map[uint]*rate.Limiter{}
// 	limiterMu  sync.Mutex
// )

// func getUserLimiter(userID uint) *rate.Limiter {
// 	limiterMu.Lock()
// 	defer limiterMu.Unlock()
// 	if l, ok := limiterMap[userID]; ok {
// 		return l
// 	}
// 	rl := rate.NewLimiter(rate.Limit(cfg.RateLimitPerSec), cfg.RateLimitBurst)
// 	limiterMap[userID] = rl
// 	return rl
// }

// // RateLimitMiddleware enforces per-user rate limit (2 req/sec default)
//
//	func RateLimitMiddleware() gin.HandlerFunc {
//		return func(c *gin.Context) {
//			username := c.GetHeader("X-User")
//			if username == "" {
//				// If no user header, apply a very strict anonymous limiter
//				anonLimiter := rate.NewLimiter(rate.Limit(cfg.RateLimitPerSec/2), 1)
//				if !anonLimiter.Allow() {
//					c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded (anonymous)"})
//					return
//				}
//				c.Next()
//				return
//			}
//			// ensure user exists (convenience: create if missing)
//			var user User
//			if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
//				user = User{Username: username}
//				DB.Create(&user)
//			}
//			lim := getUserLimiter(user.ID)
//			if !lim.Allow() {
//				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
//				return
//			}
//			// store user in context for downstream middlewares/handlers
//			c.Set("user", user)
//			c.Next()
//		}
//	}
package main

import (
	"fmt"
	"io"
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	subscribers = make([]chan string, 0) // list of all SSE clients
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
			// skip if channel is blocked
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
