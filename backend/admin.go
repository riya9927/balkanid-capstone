package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /admin/files
func AdminListFiles(c *gin.Context) {
	var files []File
	if err := DB.Preload("Uploader").Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch files"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"files": files})
}

// GET /admin/stats
func AdminStats(c *gin.Context) {
	var totalOriginal int64
	var totalDeduped int64
	var downloadCount int64

	// original storage = sum of sizes
	DB.Model(&File{}).Select("sum(size)").Scan(&totalOriginal)

	// deduped storage = unique hashes
	type Blob struct {
		Hash string
		Size int64
	}
	var blobs []Blob
	DB.Model(&File{}).Select("hash, max(size) as size").Group("hash").Scan(&blobs)
	for _, b := range blobs {
		totalDeduped += b.Size
	}

	// total downloads
	DB.Model(&File{}).Select("sum(download_count)").Scan(&downloadCount)

	savings := totalOriginal - totalDeduped
	percent := float64(savings) / float64(totalOriginal) * 100.0

	c.JSON(http.StatusOK, gin.H{
		"total_original_bytes": totalOriginal,
		"total_deduped_bytes":  totalDeduped,
		"savings_bytes":        savings,
		"savings_percent":      percent,
		"total_downloads":      downloadCount,
	})
}

// POST /admin/share/:fileID
type ShareRequest struct {
	TargetUser string `json:"target_user"`
}

func AdminShareFile(c *gin.Context) {
	fileID := c.Param("fileID")
	var req ShareRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	// find target user
	var target User
	if err := DB.Where("username = ?", req.TargetUser).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "target user not found"})
		return
	}

	// find file
	var file File
	if err := DB.First(&file, fileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	// create a duplicate metadata record for the target user
	newFile := File{
		Filename:    file.Filename,
		ContentType: file.ContentType,
		Size:        file.Size,
		Hash:        file.Hash,
		Path:        file.Path,
		UploaderID:  target.ID,
		RefCount:    1,
	}

	if err := DB.Create(&newFile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not share file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "shared", "shared_with": req.TargetUser})
}
