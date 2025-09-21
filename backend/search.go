package main

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SearchHandler(c *gin.Context) {
	q := c.Query("q")                // filename substring
	mime := c.Query("mime")          // MIME type
	minSizeStr := c.Query("minSize") // minimum size in bytes
	maxSizeStr := c.Query("maxSize") // maximum size in bytes
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	tags := c.Query("tags")
	uploaderName := c.Query("uploader")

	db := DB.Model(&File{}).Preload("Uploader")

	// apply filters
	if q != "" {
		db = db.Where("filename ILIKE ?", "%"+q+"%")
	}
	if mime != "" {
		db = db.Where("content_type = ?", mime)
	}
	if minSizeStr != "" {
		if minSize, err := strconv.ParseInt(minSizeStr, 10, 64); err == nil {
			db = db.Where("size >= ?", minSize)
		}
	}
	if maxSizeStr != "" {
		if maxSize, err := strconv.ParseInt(maxSizeStr, 10, 64); err == nil {
			db = db.Where("size <= ?", maxSize)
		}
	}
	if startDateStr != "" {
		if start, err := time.Parse("2006-01-02", startDateStr); err == nil {
			db = db.Where("created_at >= ?", start)
		}
	}
	if endDateStr != "" {
		if end, err := time.Parse("2006-01-02", endDateStr); err == nil {
			db = db.Where("created_at <= ?", end)
		}
	}
	if tags != "" {
		tagList := strings.Split(tags, ",")
		for _, t := range tagList {
			db = db.Where("tags ILIKE ?", "%"+strings.TrimSpace(t)+"%")
		}
	}
	if uploaderName != "" {
		// join with users
		var uploader User
		if err := DB.Where("username ILIKE ?", uploaderName).First(&uploader).Error; err == nil {
			db = db.Where("uploader_id = ?", uploader.ID)
		} else if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusOK, gin.H{"files": []File{}})
			return
		}
	}

	var results []File
	if err := db.Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"files": results})
}
