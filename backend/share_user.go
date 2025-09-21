package main

import (
	"archive/zip"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// request body for share/unshare
type targetUserRequest struct {
	TargetUser string `json:"target_user"`
}

// Helper: get user by header
func getUserFromHeader(c *gin.Context) (User, error) {
	username := c.GetHeader("X-User")
	if username == "" {
		return User{}, gin.Error{Err: gin.Error{
			Err:  http.ErrNoCookie,
			Type: gin.ErrorTypePublic,
		}}
	}
	var user User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		// create user if not exist
		user = User{Username: username}
		DB.Create(&user)
	}
	return user, nil
}

func userHasAccessToFile(user User, file File) bool {
	// uploader
	if file.UploaderID == user.ID {
		return true
	}
	// admin
	if user.Role == "admin" || user.Username == "admin" {
		return true
	}
	// public
	if file.Public {
		return true
	}
	// check shared_file_access
	var count int64
	DB.Raw("SELECT COUNT(1) FROM shared_file_access WHERE file_id = ? AND target_user_id = ?", file.ID, user.ID).Scan(&count)
	return count > 0
}

func userHasAccessToFolder(user User, folder Folder) bool {
	if folder.UploaderID == user.ID {
		return true
	}
	if user.Role == "admin" || user.Username == "admin" {
		return true
	}
	if folder.Public {
		return true
	}
	var count int64
	DB.Raw("SELECT COUNT(1) FROM shared_folder_access WHERE folder_id = ? AND target_user_id = ?", folder.ID, user.ID).Scan(&count)
	return count > 0
}

// POST /files/:id/share/user
func ShareFileWithUserHandler(c *gin.Context) {
	user, err := getUserFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User header required"})
		return
	}

	// parse file id
	id, _ := strconv.Atoi(c.Param("id"))
	var file File
	if err := DB.First(&file, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	// only uploader or admin can share
	if file.UploaderID != user.ID && user.Role != "admin" && user.Username != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only uploader or admin can share file with users"})
		return
	}

	var body targetUserRequest
	if err := c.BindJSON(&body); err != nil || body.TargetUser == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target_user required"})
		return
	}

	// find or create target user
	var target User
	if err := DB.Where("username = ?", body.TargetUser).First(&target).Error; err != nil {
		target = User{Username: body.TargetUser}
		DB.Create(&target)
	}

	// insert shared_file_access if not exists
	if err := DB.Exec("INSERT INTO shared_file_access (file_id, target_user_id) VALUES (?, ?) ON CONFLICT (file_id, target_user_id) DO NOTHING", file.ID, target.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create share"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "shared_with_user", "file_id": file.ID, "target_user": target.Username})
}

// DELETE /files/:id/share/user
func UnshareFileWithUserHandler(c *gin.Context) {
	user, err := getUserFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User header required"})
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))
	var file File
	if err := DB.First(&file, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}
	// only uploader or admin can revoke
	if file.UploaderID != user.ID && user.Role != "admin" && user.Username != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only uploader or admin can unshare file"})
		return
	}
	var body targetUserRequest
	if err := c.BindJSON(&body); err != nil || body.TargetUser == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target_user required"})
		return
	}
	var target User
	if err := DB.Where("username = ?", body.TargetUser).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "target user not found"})
		return
	}

	if err := DB.Exec("DELETE FROM shared_file_access WHERE file_id = ? AND target_user_id = ?", file.ID, target.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not remove share"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "unshared", "file_id": file.ID, "target_user": target.Username})
}

// GET /files/:id/shared_with
func ListFileSharedWithHandler(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var file File
	if err := DB.First(&file, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}
	var rows []struct {
		Username string
	}
	DB.Raw(`
		SELECT u.username
		FROM shared_file_access s
		JOIN users u ON u.id = s.target_user_id
		WHERE s.file_id = ?
	`, file.ID).Scan(&rows)
	users := make([]string, 0, len(rows))
	for _, r := range rows {
		users = append(users, r.Username)
	}
	c.JSON(http.StatusOK, gin.H{"file_id": file.ID, "shared_with": users})
}

// POST /folders/:id/share/user
func ShareFolderWithUserHandler(c *gin.Context) {
	user, err := getUserFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User header required"})
		return
	}
	fid, _ := strconv.Atoi(c.Param("id"))
	var folder Folder
	if err := DB.First(&folder, fid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		return
	}
	if folder.UploaderID != user.ID && user.Role != "admin" && user.Username != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only owner or admin can share folder"})
		return
	}
	var body targetUserRequest
	if err := c.BindJSON(&body); err != nil || body.TargetUser == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target_user required"})
		return
	}
	var target User
	if err := DB.Where("username = ?", body.TargetUser).First(&target).Error; err != nil {
		target = User{Username: body.TargetUser}
		DB.Create(&target)
	}
	if err := DB.Exec("INSERT INTO shared_folder_access (folder_id, target_user_id) VALUES (?, ?) ON CONFLICT (folder_id, target_user_id) DO NOTHING", folder.ID, target.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create share"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "shared_with_user", "folder_id": folder.ID, "target_user": target.Username})
}

// DELETE /folders/:id/share/user
func UnshareFolderWithUserHandler(c *gin.Context) {
	user, err := getUserFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User header required"})
		return
	}
	fid, _ := strconv.Atoi(c.Param("id"))
	var folder Folder
	if err := DB.First(&folder, fid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		return
	}
	if folder.UploaderID != user.ID && user.Role != "admin" && user.Username != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only owner or admin can unshare folder"})
		return
	}
	var body targetUserRequest
	if err := c.BindJSON(&body); err != nil || body.TargetUser == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target_user required"})
		return
	}
	var target User
	if err := DB.Where("username = ?", body.TargetUser).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "target user not found"})
		return
	}
	if err := DB.Exec("DELETE FROM shared_folder_access WHERE folder_id = ? AND target_user_id = ?", folder.ID, target.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not remove share"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "unshared", "folder_id": folder.ID, "target_user": target.Username})
}

// GET /folders/:id/shared_with
func ListFolderSharedWithHandler(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var folder Folder
	if err := DB.First(&folder, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		return
	}
	var rows []struct{ Username string }
	DB.Raw(`SELECT u.username FROM shared_folder_access s JOIN users u ON u.id = s.target_user_id WHERE s.folder_id = ?`, folder.ID).Scan(&rows)
	users := make([]string, 0, len(rows))
	for _, r := range rows {
		users = append(users, r.Username)
	}
	c.JSON(http.StatusOK, gin.H{"folder_id": folder.ID, "shared_with": users})
}

// GET /files/:id/download
func AuthDownloadFileHandler(c *gin.Context) {
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

	// check ownership or sharing
	if file.UploaderID != user.ID {
		var access SharedFileAccess
		if err := DB.Where("file_id = ? AND target_user_id = ?", file.ID, user.ID).First(&access).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "no access"})
			return
		}
	}

	if err := DB.Model(&file).Update("download_count", gorm.Expr("download_count + 1")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update download count"})
		return
	}

	var updated File
	DB.First(&updated, file.ID)

	// broadcast realtime update
	notifyDownload(updated.ID, updated.DownloadCount)

	// check file exists
	fullPath := filepath.Join(cfg.UploadPath, file.Path)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "file missing"})
		return
	}

	// return file
	c.FileAttachment(fullPath, file.Filename)
}

// GET /folders/:id/download (authenticated download of folder contents as zip)
func AuthDownloadFolderHandler(c *gin.Context) {
	user, err := getUserFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User header required"})
		return
	}
	fid, _ := strconv.Atoi(c.Param("id"))
	var folder Folder
	if err := DB.First(&folder, fid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		return
	}
	if !userHasAccessToFolder(user, folder) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you do not have access to this folder"})
		return
	}

	// find files in folder and stream zip
	var files []File
	DB.Where("folder_id = ?", folder.ID).Find(&files)
	if len(files) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "folder empty"})
		return
	}

	zipName := folder.Name + ".zip"
	c.Header("Content-Disposition", "attachment; filename=\""+zipName+"\"")
	c.Header("Content-Type", "application/zip")

	zw := zip.NewWriter(c.Writer)
	defer zw.Close()

	for _, f := range files {
		DB.Model(&f).UpdateColumn("download_count", f.DownloadCount+1)
		fullPath := filepath.Join(cfg.UploadPath, f.Path)
		fi, err := os.Open(fullPath)
		if err != nil {
			continue
		}
		info, _ := fi.Stat()
		hdr, _ := zip.FileInfoHeader(info)
		hdr.Name = f.Filename
		hdr.Method = zip.Deflate
		w, _ := zw.CreateHeader(hdr)
		io.Copy(w, fi)
		fi.Close()
	}
}
