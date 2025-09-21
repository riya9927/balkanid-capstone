package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// QuotaMiddlewareForUpload checks that sum of sizes of uploaded files won't exceed quota.
func QuotaMiddlewareForUpload() gin.HandlerFunc {
	return func(c *gin.Context) {
		var user User
		if u, ok := c.Get("user"); ok {
			user = u.(User)
		} else {
			username := c.GetHeader("X-User")
			if username == "" {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "X-User header required"})
				return
			}
			if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
				user = User{Username: username}
				DB.Create(&user)
			}
			c.Set("user", user)
		}

		// Get sum of existing sizes uploaded by user (original usage)
		var current int64
		DB.Model(&File{}).Where("uploader_id = ?", user.ID).Select("COALESCE(SUM(size),0)").Scan(&current)

		if err := c.Request.ParseMultipartForm(32 << 20); err != nil && err != http.ErrNotMultipart {
			c.Next()
			return
		}

		var incomingTotal int64 = 0
		if c.Request.MultipartForm != nil && c.Request.MultipartForm.File != nil {
			for _, fhs := range c.Request.MultipartForm.File {
				for _, fh := range fhs {
					incomingTotal += fh.Size
				}
			}
		}
		// If no multipart info, check Content-Length header
		if incomingTotal == 0 {
			if cl := c.Request.Header.Get("Content-Length"); cl != "" {
			}
		}

		if current+incomingTotal > cfg.StorageQuota {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":          "storage quota exceeded",
				"quota_bytes":    cfg.StorageQuota,
				"current_bytes":  current,
				"incoming_bytes": incomingTotal,
				"bytes_if_saved": current + incomingTotal,
			})
			return
		}
		c.Next()
	}
}
