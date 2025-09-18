// package main

// import (
// 	"fmt"
// 	"net/http"
// 	"os"
// 	"path/filepath"
// 	"time"

// 	"github.com/gin-gonic/gin"
// 	"gorm.io/gorm"
// )

// func UploadHandler(c *gin.Context) {
// 	user := User{Username: c.GetHeader("X-User")}
// 	DB.FirstOrCreate(&user, User{Username: user.Username})

// 	form, err := c.MultipartForm()
// 	if err != nil || len(form.File["files"]) == 0 {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "no files uploaded"})
// 		return
// 	}

// 	results := []gin.H{}
// 	for _, fh := range form.File["files"] {
// 		tmp := filepath.Join(os.TempDir(), fmt.Sprintf("%d_%s", time.Now().UnixNano(), fh.Filename))
// 		if err := c.SaveUploadedFile(fh, tmp); err != nil {
// 			results = append(results, gin.H{"filename": fh.Filename, "error": err.Error()})
// 			continue
// 		}

// 		f, _ := os.Open(tmp)
// 		h, _ := hashFile(f)
// 		f.Close()

// 		var existing File
// 		if err := DB.Where("hash = ?", h).First(&existing).Error; err == nil {
// 			// duplicate
// 			existing.RefCount++
// 			DB.Save(&existing)
// 			fmeta := File{
// 				Filename:    fh.Filename,
// 				ContentType: fh.Header.Get("Content-Type"),
// 				Size:        fh.Size,
// 				Hash:        h,
// 				Path:        existing.Path,
// 				UploaderID:  user.ID,
// 			}
// 			DB.Create(&fmeta)
// 			os.Remove(tmp)
// 			results = append(results, gin.H{"filename": fh.Filename, "status": "deduped"})
// 			continue
// 		} else if err != gorm.ErrRecordNotFound {
// 			results = append(results, gin.H{"filename": fh.Filename, "error": "db error"})
// 			continue
// 		}

// 		// new file
// 		mimeType, _ := detectMimeType(tmp)
// 		ext := getExtFromMime(mimeType)
// 		dest := filepath.Join(cfg.UploadPath, h+ext)
// 		os.Rename(tmp, dest)

// 		fmeta := File{
// 			Filename:    fh.Filename,
// 			ContentType: mimeType,
// 			Size:        fh.Size,
// 			Hash:        h,
// 			Path:        h + ext,
// 			UploaderID:  user.ID,
// 			RefCount:    1,
// 		}
// 		DB.Create(&fmeta)
// 		results = append(results, gin.H{"filename": fh.Filename, "status": "uploaded"})

// 		// After DB.Create(&fmeta), check quota
// 		var current int64
// 		DB.Model(&File{}).Where("uploader_id = ?", user.ID).Select("COALESCE(SUM(size),0)").Scan(&current)

// 		if current > cfg.StorageQuota {
// 			// rollback: delete the last uploaded file metadata
// 			DB.Delete(&fmeta)
// 			os.Remove(dest) // remove the blob
// 			c.JSON(http.StatusForbidden, gin.H{
// 				"error":         "storage quota exceeded",
// 				"quota_bytes":   cfg.StorageQuota,
// 				"current_bytes": current,
// 				"file_rejected": fmeta.Filename,
// 			})
// 			return
// 		}

// 	}

// 	c.JSON(http.StatusOK, gin.H{"results": results})
// }

package main

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Allowed mismatch tolerance: if major type matches (e.g., image/png vs image/jpeg) we still require exact
// but allow certain groups if you want -- here we enforce fairly strict check but allow "text/plain; charset=..." variations.
func mimeMatches(declared, detected string) bool {
	if declared == "" || detected == "" {
		// if one is missing, be permissive (but you can change to stricter)
		return true
	}
	// normalize (drop parameters like charset)
	decl := strings.Split(declared, ";")[0]
	det := strings.Split(detected, ";")[0]
	decl = strings.TrimSpace(decl)
	det = strings.TrimSpace(det)

	if decl == det {
		return true
	}

	// allow text/* with text/* variations (e.g., text/plain; charset=utf-8)
	if strings.HasPrefix(decl, "text/") && strings.HasPrefix(det, "text/") {
		return true
	}

	// allow common equivalences (zip vs application/zip)
	equivs := map[string][]string{
		"application/octet-stream": {"application/zip", "application/x-zip-compressed"},
	}
	if arr, ok := equivs[decl]; ok {
		for _, v := range arr {
			if v == det {
				return true
			}
		}
	}

	// allow when major type matches and user-declared is generic wildcard, e.g., image/* (rare in form)
	if strings.HasSuffix(decl, "/*") {
		major := strings.Split(decl, "/")[0]
		return strings.HasPrefix(det, major+"/")
	}

	return false
}

// validateDeclaredMime compares the multipart header MIME (declared) with detection
func validateDeclaredMime(fh *multipart.FileHeader, tmpFilePath string) (bool, string, string, error) {
	declared := fh.Header.Get("Content-Type")
	detected, err := detectMimeType(tmpFilePath)
	if err != nil {
		return false, declared, "", err
	}
	ok := mimeMatches(declared, detected)
	return ok, declared, detected, nil
}

func UploadHandler(c *gin.Context) {
	// load or create user (we rely on X-User header for dev auth stub)
	username := c.GetHeader("X-User")
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User header required"})
		return
	}
	var user User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		user = User{Username: username}
		DB.Create(&user)
	}

	// Ensure upload dir exists
	if err := ensureUploadPath(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot create upload path"})
		return
	}

	// Support both single "file" and multiple "files"
	form, err := c.MultipartForm()
	var fhs []*multipart.FileHeader
	if err == nil && form != nil {
		// try "files" first, then "file"
		if arr, ok := form.File["files"]; ok && len(arr) > 0 {
			fhs = arr
		} else if f, ok2 := form.File["file"]; ok2 && len(f) > 0 {
			fhs = f
		}
	} else {
		// fallback: try single file
		if fh, err2 := c.FormFile("file"); err2 == nil {
			fhs = []*multipart.FileHeader{fh}
		}
	}

	if len(fhs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no files provided (use field name 'files' or 'file')"})
		return
	}

	results := make([]gin.H, 0, len(fhs))

	// process each file sequentially (can be parallelized with care)
	for _, fh := range fhs {
		// Save uploaded part to a small temp file to sniff then move
		tmp := filepath.Join(os.TempDir(), fmt.Sprintf("%d_%s", time.Now().UnixNano(), sanitizeFilename(fh.Filename)))
		if err := c.SaveUploadedFile(fh, tmp); err != nil {
			results = append(results, gin.H{"filename": fh.Filename, "error": fmt.Sprintf("save temp failed: %v", err)})
			continue
		}

		// MIME validation
		ok, declared, detected, err := validateDeclaredMime(fh, tmp)
		if err != nil {
			os.Remove(tmp)
			results = append(results, gin.H{"filename": fh.Filename, "error": fmt.Sprintf("mime detect error: %v", err)})
			continue
		}
		if !ok {
			os.Remove(tmp)
			results = append(results, gin.H{
				"filename": fh.Filename,
				"status":   "rejected",
				"reason":   "MIME mismatch",
				"declared": declared,
				"detected": detected,
			})
			continue
		}

		// Compute hash
		f, _ := os.Open(tmp)
		h, err := hashFile(f)
		f.Close()
		if err != nil {
			os.Remove(tmp)
			results = append(results, gin.H{"filename": fh.Filename, "error": fmt.Sprintf("hash error: %v", err)})
			continue
		}

		// Dedup check
		var existing File
		result := DB.Where("hash = ?", h).Take(&existing)
		if result.Error == nil {
			// duplicate blob exists: create new metadata row linking to existing.Path and increment blob refcount
			tx := DB.Begin()
			if err := tx.Model(&File{}).Where("hash = ?", h).
				UpdateColumn("ref_count", gorm.Expr("ref_count + ?", 1)).Error; err != nil {
				tx.Rollback()
				os.Remove(tmp)
				results = append(results, gin.H{"filename": fh.Filename, "error": "db update error"})
				continue
			}
			fmeta := File{
				Filename:    fh.Filename,
				ContentType: detectedMimeOrHeader(fh),
				Size:        fh.Size,
				Hash:        h,
				Path:        existing.Path,
				UploaderID:  user.ID,
				RefCount:    1,
			}
			if err := tx.Create(&fmeta).Error; err != nil {
				tx.Rollback()
				os.Remove(tmp)
				results = append(results, gin.H{"filename": fh.Filename, "error": "db create failed"})
				continue
			}
			tx.Commit()
			os.Remove(tmp)
			results = append(results, gin.H{"filename": fh.Filename, "status": "deduped"})
			continue
		} else if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
			// unexpected DB error
			os.Remove(tmp)
			results = append(results, gin.H{"filename": fh.Filename, "error": "db error"})
			continue
		}

		// New blob: move to uploads directory with hash+ext
		mimeType, _ := detectMimeType(tmp)
		ext := getExtFromMime(mimeType)
		destName := h + ext
		destPath := filepath.Join(cfg.UploadPath, destName)
		// move
		if err := os.Rename(tmp, destPath); err != nil {
			// fallback to copy
			in, _ := os.Open(tmp)
			out, _ := os.Create(destPath)
			_, _ = io.Copy(out, in)
			in.Close()
			out.Close()
			os.Remove(tmp)
		}

		// create metadata row
		fmeta := File{
			Filename:    fh.Filename,
			ContentType: mimeType,
			Size:        fh.Size,
			Hash:        h,
			Path:        destName,
			UploaderID:  user.ID,
			RefCount:    1,
		}
		if err := DB.Create(&fmeta).Error; err != nil {
			// cleanup blob on failure
			os.Remove(destPath)
			results = append(results, gin.H{"filename": fh.Filename, "error": "db create failed"})
			continue
		}
		results = append(results, gin.H{"filename": fh.Filename, "status": "uploaded", "file_id": fmeta.ID})
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// sanitizeFilename removes path separators
func sanitizeFilename(name string) string {
	return strings.ReplaceAll(filepath.Base(name), string(os.PathSeparator), "_")
}

// detectedMimeOrHeader returns a reasonable content type (prefer detected, else header)
func detectedMimeOrHeader(fh *multipart.FileHeader) string {
	if detected, err := detectMimeType(filepath.Join(os.TempDir(), fh.Filename)); err == nil && detected != "" {
		return detected
	}
	if h := fh.Header.Get("Content-Type"); h != "" {
		return h
	}
	return "application/octet-stream"
}
