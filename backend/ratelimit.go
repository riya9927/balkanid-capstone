package main

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

var (
	limiterMap = map[uint]*rate.Limiter{}
	limiterMu  sync.Mutex
)

func getUserLimiter(userID uint) *rate.Limiter {
	limiterMu.Lock()
	defer limiterMu.Unlock()
	if l, ok := limiterMap[userID]; ok {
		return l
	}
	rl := rate.NewLimiter(rate.Limit(cfg.RateLimitPerSec), cfg.RateLimitBurst)
	limiterMap[userID] = rl
	return rl
}

// RateLimitMiddleware enforces per-user rate limit (2 req/sec default)
func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.GetHeader("X-User")
		if username == "" {
			// If no user header, apply a very strict anonymous limiter
			anonLimiter := rate.NewLimiter(rate.Limit(cfg.RateLimitPerSec/2), 1)
			if !anonLimiter.Allow() {
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded (anonymous)"})
				return
			}
			c.Next()
			return
		}
		// ensure user exists (convenience: create if missing)
		var user User
		if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
			user = User{Username: username}
			DB.Create(&user)
		}
		lim := getUserLimiter(user.ID)
		if !lim.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		// store user in context for downstream middlewares/handlers
		c.Set("user", user)
		c.Next()
	}
}
