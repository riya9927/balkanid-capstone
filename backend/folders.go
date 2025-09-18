package main

import (
	"archive/zip"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

// POST /folders         -> create folder { "name": "MyDocs" }
func CreateFolderHandler(c *gin.Context) {
	username := c.GetHeader("X-User")
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User header required"})
		return
	}
	var user User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	var body struct {
		Name string `json:"name"`
	}
	if err := c.BindJSON(&body); err != nil || body.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name required"})
		return
	}

	fold := Folder{
		Name:       body.Name,
		UploaderID: user.ID,
	}
	if err := DB.Create(&fold).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create folder failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"folder": fold})
}

// GET /folders       -> list user's folders
func ListFoldersHandler(c *gin.Context) {
	username := c.GetHeader("X-User")
	var user User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}
	var folders []Folder
	DB.Where("uploader_id = ?", user.ID).Find(&folders)
	c.JSON(http.StatusOK, gin.H{"folders": folders})
}

// GET /folders/:id/files  -> list files in folder
func ListFilesInFolderHandler(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid folder id"})
		return
	}
	var files []File
	DB.Where("folder_id = ?", id).Find(&files)
	c.JSON(http.StatusOK, gin.H{"files": files})
}

// POST /files/:id/move  { "folder_id": 2 }
func MoveFileToFolderHandler(c *gin.Context) {
	username := c.GetHeader("X-User")
	var user User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	fileID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file id"})
		return
	}
	var body struct {
		FolderID uint `json:"folder_id"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad body"})
		return
	}

	var file File
	if err := DB.First(&file, fileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}
	if file.UploaderID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only uploader can move file"})
		return
	}

	// ensure folder exists and belongs to user (or admin)
	var folder Folder
	if err := DB.First(&folder, body.FolderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		return
	}
	if folder.UploaderID != user.ID && user.Username != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot move into folder you don't own"})
		return
	}

	file.FolderID = &body.FolderID
	DB.Save(&file)
	c.JSON(http.StatusOK, gin.H{"status": "moved", "file": file})
}

// POST /folders/:id/share  { "public": true }
func ShareFolderHandler(c *gin.Context) {
	username := c.GetHeader("X-User")
	var user User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}
	fid, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var folder Folder
	if err := DB.First(&folder, fid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		return
	}
	if folder.UploaderID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only owner can share folder"})
		return
	}
	var body struct {
		Public bool `json:"public"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad body"})
		return
	}
	if body.Public {
		token := generateToken()
		folder.Public = true
		folder.PublicToken = &token
		DB.Save(&folder)
		c.JSON(http.StatusOK, gin.H{"status": "shared", "public_token": token})
		return
	}
	// unshare
	folder.Public = false
	folder.PublicToken = nil
	DB.Save(&folder)
	c.JSON(http.StatusOK, gin.H{"status": "unshared"})
}

// GET /download/folder/:token  -> streams a zip of folder contents
func DownloadFolderHandler(c *gin.Context) {
	token := c.Param("token")
	var folder Folder
	if err := DB.Where("public_token = ?", token).First(&folder).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		return
	}

	// find all files in folder
	var files []File
	DB.Where("folder_id = ?", folder.ID).Find(&files)
	if len(files) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "folder empty"})
		return
	}

	zipName := folder.Name + ".zip"
	c.Header("Content-Disposition", "attachment; filename=\""+zipName+"\"")
	c.Header("Content-Type", "application/zip")

	// create zip writer writing to response
	zw := zip.NewWriter(c.Writer)
	defer zw.Close()

	for _, f := range files {
		// increment download count per file
		DB.Model(&f).UpdateColumn("download_count", f.DownloadCount+1)

		fullPath := filepath.Join(cfg.UploadPath, f.Path)
		fi, err := os.Open(fullPath)
		if err != nil {
			// skip missing files but continue
			continue
		}
		defer fi.Close()
		info, _ := fi.Stat()
		hdr, _ := zip.FileInfoHeader(info)
		hdr.Name = f.Filename
		hdr.Method = zip.Deflate
		w, _ := zw.CreateHeader(hdr)
		io.Copy(w, fi)
	}
	// zip writer will be closed by defer; streamed to client
}
