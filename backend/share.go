package main

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// generate random token for public sharing
func generateToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// POST /files/:id/share  { "public": true }
func ShareFileHandler(c *gin.Context) {
	username := c.GetHeader("X-User")
	var user User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	id, _ := strconv.Atoi(c.Param("id"))
	var file File
	if err := DB.First(&file, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	// only uploader can share
	if file.UploaderID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only uploader can share"})
		return
	}

	var body struct {
		Public bool `json:"public"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	if body.Public {
		token := generateToken()
		file.Public = true
		file.PublicToken = &token
		DB.Save(&file)
		c.JSON(http.StatusOK, gin.H{"status": "shared", "public_token": token})
	} else {
		file.Public = false
		file.PublicToken = nil
		DB.Save(&file)
		c.JSON(http.StatusOK, gin.H{"status": "unshared"})
	}
}
func PublicDownloadHandler(c *gin.Context) {
	token := c.Param("token")
	var file File
	if err := DB.Where("public_token = ?", token).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	// atomically increment
	if err := DB.Model(&file).Update("download_count", gorm.Expr("download_count + 1")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update download count"})
		return
	}

	// reload & broadcast
	var updated File
	DB.First(&updated, file.ID)
	notifyDownload(updated.ID, updated.DownloadCount)

	fullPath := filepath.Join(cfg.UploadPath, file.Path)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "file missing"})
		return
	}

	c.FileAttachment(fullPath, file.Filename)
}
