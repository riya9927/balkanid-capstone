package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /storage/stats  -> global storage stats (deduped vs original)
func StorageStatsHandler(c *gin.Context) {
	// original: sum of all sizes (counts each metadata row)
	var original int64
	DB.Model(&File{}).Select("COALESCE(SUM(size),0)").Scan(&original)

	// deduped: sum of unique hashes' sizes, take MIN(size) per hash as canonical blob size
	var deduped int64
	DB.Raw(`
		SELECT COALESCE(SUM(min_size),0) FROM (
			SELECT MIN(size) AS min_size, hash FROM files GROUP BY hash
		) t
	`).Scan(&deduped)

	savings := original - deduped
	var percent float64
	if original > 0 {
		percent = (float64(savings) / float64(original)) * 100.0
	}

	c.JSON(http.StatusOK, gin.H{
		"original_bytes":  original,
		"deduped_bytes":   deduped,
		"savings_bytes":   savings,
		"savings_percent": percent,
	})
}
