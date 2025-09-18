package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type StatsResponse struct {
	Username       string  `json:"username"`
	OriginalBytes  int64   `json:"original_bytes"`
	DedupedBytes   int64   `json:"deduped_bytes"`
	SavingsBytes   int64   `json:"savings_bytes"`
	SavingsPercent float64 `json:"savings_percent"`
}

// GET /stats  -> per-user storage stats
// GET /stats
func UserStatsHandler(c *gin.Context) {
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

	// original bytes: sum of sizes of all files by this user
	var orig int64
	DB.Model(&File{}).Where("uploader_id = ?", user.ID).Select("COALESCE(SUM(size),0)").Scan(&orig)

	// deduped bytes: sum of unique hashes per user
	type Row struct {
		Size int64
		Hash string
	}
	var rows []Row
	DB.Raw(`
        SELECT MIN(size) AS size, hash
        FROM files
        WHERE uploader_id = ?
        GROUP BY hash
    `, user.ID).Scan(&rows)

	var deduped int64
	for _, r := range rows {
		deduped += r.Size
	}

	savings := orig - deduped
	var percent float64
	if orig > 0 {
		percent = (float64(savings) / float64(orig)) * 100.0
	}

	c.JSON(http.StatusOK, gin.H{
		"username":        username,
		"original_bytes":  orig,
		"deduped_bytes":   deduped,
		"savings_bytes":   savings,
		"savings_percent": percent,
	})
}

// small helper type for scanning nullable int64
type sqlNullInt64 struct {
	Int64 int64
	Valid bool
}
