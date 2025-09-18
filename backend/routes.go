package main

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func setupRouter() *gin.Engine {
	r := gin.Default()

	// Enable CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"}, // frontend origin
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "X-User"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check
	r.GET("/ping", func(c *gin.Context) { c.JSON(200, gin.H{"message": "pong"}) })

	// Upload
	r.POST("/upload", UploadHandler)

	// File Management
	r.GET("/files", ListFilesHandler)
	r.GET("/files/:id", GetFileHandler)
	r.DELETE("/files/:id", DeleteFileHandler)
	r.GET("/files/:id/stats", FileStatsHandler)

	// Sharing & Download
	r.POST("/files/:id/share", ShareFileHandler)
	r.GET("/download/:token", PublicDownloadHandler)

	// Folders
	r.POST("/folders", CreateFolderHandler)
	r.GET("/folders", ListFoldersHandler)
	r.GET("/folders/:id/files", ListFilesInFolderHandler)
	r.POST("/files/:id/move", MoveFileToFolderHandler)
	r.POST("/folders/:id/share", ShareFolderHandler)
	r.GET("/download/folder/:token", DownloadFolderHandler)

	// storage stats global & per-user
	r.GET("/storage/stats", StorageStatsHandler)
	r.GET("/stats", UserStatsHandler)

	// Admin routes
	admin := r.Group("/admin")
	admin.Use(AdminOnly())
	{
		admin.GET("/files", AdminListFiles)
		admin.GET("/stats", AdminStats)
		admin.POST("/share/:fileID", AdminShareFile)
	}

	// selective file share (user-level)
	r.POST("/files/:id/share/user", ShareFileWithUserHandler)
	r.DELETE("/files/:id/share/user", UnshareFileWithUserHandler)
	r.GET("/files/:id/shared_with", ListFileSharedWithHandler)
	r.GET("/files/:id/download", AuthDownloadFileHandler)

	// selective folder share (user-level)
	r.POST("/folders/:id/share/user", ShareFolderWithUserHandler)
	r.DELETE("/folders/:id/share/user", UnshareFolderWithUserHandler)
	r.GET("/folders/:id/shared_with", ListFolderSharedWithHandler)
	r.GET("/folders/:id/download", AuthDownloadFolderHandler)

	// search endpoint
	r.GET("/search", SearchHandler)

	r.GET("/realtime", RealtimeHandler)

	return r
}
