package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func ListFilesHandler(c *gin.Context) {
	username := c.GetHeader("X-User")
	var user User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	var files []File
	DB.Where("uploader_id = ?", user.ID).Find(&files)
	c.JSON(http.StatusOK, gin.H{"files": files})
}

func GetFileHandler(c *gin.Context) {
	fid, _ := strconv.Atoi(c.Param("id"))
	var file File
	if err := DB.Preload("Uploader").First(&file, fid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	if file.Public {
		c.JSON(http.StatusOK, gin.H{"file": file})
		return
	}
	user, err := getUserFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User required to view private file"})
		return
	}
	if !userHasAccessToFile(user, file) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you do not have access to this file"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"file": file})
}

func DeleteFileHandler(c *gin.Context) {
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

	// only uploader can delete
	if file.UploaderID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only uploader can delete"})
		return
	}

	// delete the record
	DB.Delete(&file)

	// check if any references remain
	var count int64
	DB.Model(&File{}).Where("hash = ?", file.Hash).Count(&count)
	if count == 0 {
		os.Remove(filepath.Join(cfg.UploadPath, file.Path))
	} else {
		DB.Model(&File{}).Where("hash = ?", file.Hash).Update("ref_count", count)
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
