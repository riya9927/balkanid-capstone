package main

import (
	"log"
	"os"
	"path/filepath"
)

func main() {
	initConfig()
	initDB()

	if err := os.MkdirAll(cfg.UploadPath, 0755); err != nil {
		log.Fatalf("cannot create upload dir: %v", err)
	}

	if err := runMigrations(); err != nil {
		log.Printf("migration error: %v", err)
	}

	r := setupRouter()

	log.Println("Backend running on :" + cfg.ServerPort)
	r.Run(":" + cfg.ServerPort)
}

func runMigrations() error {
	migrationFiles := []string{
		"0001_init.sql",
		"0002_folders_and_file_update.sql", 
		"0003_add_tags.sql",
		"0004_add_role.sql",
		"0005_shared_access.sql",
	}
	
	for _, filename := range migrationFiles {
		b, err := os.ReadFile(filepath.Join("migrations", filename))
		if err != nil {
			log.Printf("Warning: Could not read migration %s: %v", filename, err)
			continue
		}
		if err := DB.Exec(string(b)).Error; err != nil {
			log.Printf("Warning: Migration %s failed: %v", filename, err)
		} else {
			log.Printf("Applied migration: %s", filename)
		}
	}
	return nil
}

// package main

// import (
// 	"log"
// 	"os"
// 	"path/filepath"

// 	"github.com/gin-gonic/gin"
// )

// func main() {
// 	initConfig()
// 	initDB()

// 	if err := os.MkdirAll(cfg.UploadPath, 0755); err != nil {
// 		log.Fatalf("cannot create upload dir: %v", err)
// 	}

// 	if err := runMigrations(); err != nil {
// 		log.Printf("migration error: %v", err)
// 	}

// 	r := gin.Default()
// 	r.GET("/ping", func(c *gin.Context) {
// 		c.JSON(200, gin.H{"message": "pong"})
// 	})

// 	log.Println("Backend running on :" + cfg.ServerPort)
// 	r.Run(":" + cfg.ServerPort)
// }

// func runMigrations() error {
// 	b, err := os.ReadFile(filepath.Join("migrations", "0001_init.sql"))
// 	if err != nil {
// 		return err
// 	}
// 	return DB.Exec(string(b)).Error
// }
