# BalkanID File Vault System  

A **secure file vault system** built with **Go (Golang)**, **PostgreSQL**, **React + TypeScript**, and **Docker Compose**.  
It supports **efficient storage (deduplication)**, **powerful search**, and **controlled file sharing** with a modern frontend interface.  

---

## Features

### Core
- **File Deduplication** — SHA-256 content hashing prevents duplicate uploads, saving storage space.
- **File Uploads** — Single/multiple uploads, drag-and-drop, MIME validation.
- **File Management** — List files with metadata (owner, size, type, upload date, dedup info).
- **File Sharing**  
  - Public sharing with unique tokens.  
  - Private mode (owner only).  
  - Optional per-user sharing.  
- **Download Statistics** — Track file download counts (public + private).
- **File Deletion Rules** — Only owners can delete, deduplicated files respect reference counts.
- **Search & Filtering** — Filter by filename, MIME type, size range, dates, tags, and uploader.
- **Rate Limiting & Quotas**  
  - Default 2 API calls/second per user.  
- **Storage Statistics**  
  - Total storage used.  
  - Original storage size (pre-deduplication).  
  - Storage savings (bytes + %).  

### Bonus
- **Admin Panel** — Admins can upload, share, view all files, and track usage stats.
- **Realtime Updates (SSE)** — Live download count updates without page refresh.

---

## Tech Stack

- **Backend:** Go (Golang) with Gin + GORM  
- **Database:** PostgreSQL  
- **Frontend:** React.js + TypeScript + Vite  
- **Containerization:** Docker Compose  
- **API Layer:** REST 

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-riya9927
cd balkanid-file-vault 
```
### 2. Environment Variables
- Create a .env file in the project root:
```bash
# Backend
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=filevault
POSTGRES_PORT=5432
UPLOAD_PATH=/app/uploads
RATE_LIMIT=2
STORAGE_QUOTA=10485760  
# Frontend
VITE_API_URL=http://backend:8080
```
### 3. Run with Docker
```bash
docker compose up --build
```
### 4. Access the App
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080

---

## Database Schema Overview

This describes the core database schema for the file storage and sharing system.

---

### Users
| Column      | Type  | Notes                     |
|-------------|-------|---------------------------|
| `id`        | UUID  | Primary Key               |
| `username`  | text  | Unique                    |
| `quota_used`| bigint| Tracked storage usage     |

---

### Files
| Column         | Type   | Notes                               |
|----------------|--------|-------------------------------------|
| `id`           | UUID   | Primary Key                         |
| `filename`     | text   | Original file name                  |
| `hash`         | text   | SHA-256 deduplication hash          |
| `size`         | bigint | Original file size                  |
| `uploader_id`  | UUID   | Foreign Key → `users.id`            |
| `download_count` | int  | Increment on downloads              |
| `public`       | boolean | Sharing flag                       |
| `public_token` | text   | Random token for public download    |

---

### Shared File Access
| Column       | Type  | Notes                         |
|--------------|-------|-------------------------------|
| `id`         | UUID  | Primary Key                   |
| `file_id`    | UUID  | Foreign Key → `files.id`      |
| `shared_with`| UUID  | Foreign Key → `users.id`      |

---

### Shared Folder Access
| Column       | Type  | Notes                         |
|--------------|-------|-------------------------------|
| `id`         | UUID  | Primary Key                   |
| `folder_id`  | UUID  | Foreign Key → `folders.id`    |
| `shared_with`| UUID  | Foreign Key → `users.id`      |

## API Documentation

---

### Files
- **POST** `/upload` → Upload file(s).  
- **GET** `/files` → List user’s files.  
- **GET** `/files/:id` → Get file details.  
- **DELETE** `/files/:id` → Delete file *(owner only)*.  
- **GET** `/files/:id/download` → Authenticated file download.  
- **POST** `/files/:id/share` → Toggle public/private sharing.  
- **POST** `/files/:id/share/user` → Share with a specific user.  
- **DELETE** `/files/:id/share/user` → Remove user-level share.  

---

### Folders
- **POST** `/folders` → Create a folder.  
- **GET** `/folders/:id/files` → List folder files.  
- **POST** `/folders/:id/share/user` → Share folder with a user.  

---

### Search
- **GET** `/search?q=...&mime=...&minSize=...&maxSize=...&uploader=...`  
  - Search across files with filters.  

---

### Stats
- **GET** `/storage/stats` → Global + per-user storage stats.  
- **GET** `/files/:id/stats` → File-level stats.  

---

### Admin
- **GET** `/admin/files` → List all files.  
- **GET** `/admin/stats` → Download counts + usage.  
- **POST** `/admin/share/:fileID` → Force share a file.  

---

### Realtime
- **GET** `/realtime` → Server-Sent Events (SSE) for live download/upload updates.  

## License

- This project is for BalkanID Capstone Evaluation.
- Developed by: Riya Patel(22BCE10847), Vellore Institute of Technology
