package main

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GET /files/:id/stats
func FileStatsHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var f File
	if err := DB.First(&f, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":             f.ID,
		"filename":       f.Filename,
		"uploader_id":    f.UploaderID,
		"size":           f.Size,
		"hash":           f.Hash,
		"ref_count":      f.RefCount,
		"download_count": f.DownloadCount,
		"public":         f.Public,
	})
}
