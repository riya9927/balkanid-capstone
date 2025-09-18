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
	b, err := os.ReadFile(filepath.Join("migrations", "0001_init.sql"))
	if err != nil {
		return err
	}
	return DB.Exec(string(b)).Error
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
