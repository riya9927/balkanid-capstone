package main

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DBUrl           string
	UploadPath      string
	ServerPort      string
	StorageQuota    int64
	RateLimitPerSec float64
	RateLimitBurst  int
}

var cfg Config

func initConfig() {
	// load .env if present
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment")
	}

	cfg = Config{
		DBUrl:           getEnv("DATABASE_URL", "host=localhost user=postgres password=riya9927 dbname=balkanid port=5432 sslmode=disable"),
		UploadPath:      getEnv("UPLOAD_PATH", "./uploads"),
		ServerPort:      getEnv("PORT", "8080"),
		StorageQuota:    mustParseInt64(getEnv("STORAGE_QUOTA_BYTES", "10485760")), // 10 MB default
		RateLimitPerSec: mustParseFloat(getEnv("RATE_LIMIT_PER_SEC", "2")),         // 2 req/sec default
		RateLimitBurst:  mustParseInt(getEnv("RATE_LIMIT_BURST", "4")),             // burst size
	}
}

func getEnv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func mustParseInt64(s string) int64 {
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		log.Fatalf("invalid int64 for config: %v", err)
	}
	return v
}

func mustParseInt(s string) int {
	v, err := strconv.Atoi(s)
	if err != nil {
		log.Fatalf("invalid int for config: %v", err)
	}
	return v
}

func mustParseFloat(s string) float64 {
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		log.Fatalf("invalid float for config: %v", err)
	}
	return v
}
