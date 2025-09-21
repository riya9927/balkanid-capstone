package main

import "time"

type User struct {
	ID        uint   `gorm:"primaryKey"`
	Username  string `gorm:"uniqueIndex"`
	Role      string `gorm:"default:user"`
	Files     []File `gorm:"foreignKey:UploaderID"`
	CreatedAt time.Time
}

type Folder struct {
	ID          uint   `gorm:"primaryKey"`
	Name        string `gorm:"index"`
	UploaderID  uint
	Uploader    User
	Public      bool
	PublicToken *string `gorm:"uniqueIndex;default:null"`
	CreatedAt   time.Time
}

type File struct {
	ID            uint `gorm:"primaryKey"`
	Filename      string
	ContentType   string
	Size          int64
	Hash          string `gorm:"index"`
	Path          string
	UploaderID    uint
	Uploader      User
	FolderID      *uint
	Folder        *Folder
	Public        bool
	PublicToken   *string `gorm:"uniqueIndex;default:null"`
	DownloadCount int64
	RefCount      int64
	CreatedAt     time.Time
	Tags          string
}
type SharedFileAccess struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	FileID       uint      `gorm:"not null;index" json:"file_id"`
	TargetUserID uint      `gorm:"not null;index" json:"target_user_id"`
	CreatedAt    time.Time `json:"created_at"`

	// Relations
	File       File `gorm:"foreignKey:FileID"`
	TargetUser User `gorm:"foreignKey:TargetUserID"`
}
type SharedFolderAccess struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	FolderID     uint      `gorm:"not null;index" json:"folder_id"`
	TargetUserID uint      `gorm:"not null;index" json:"target_user_id"`
	CreatedAt    time.Time `json:"created_at"`
	Folder       Folder    `gorm:"foreignKey:FolderID"`
	TargetUser   User      `gorm:"foreignKey:TargetUserID"`
}
