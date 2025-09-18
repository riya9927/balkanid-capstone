import React, { useState, useEffect } from "react";
import axios from "axios";

interface DashboardStats {
  totalFiles: number;
  totalSize: number;
  recentUploads: number;
  storageUsed: number;
  storageQuota: number;
}

interface RecentFile {
  ID: number;
  Filename: string;
  Size: number;
  CreatedAt: string;
  ContentType: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
    headers: { "X-User": localStorage.getItem("username") || "" },
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [filesRes, statsRes] = await Promise.all([
        api.get("/files"),
        api.get("/stats")
      ]);

      const files = filesRes.data.files || [];
      const userStats = statsRes.data;

      // Calculate dashboard stats
      const totalFiles = files.length;
      const totalSize = files.reduce((sum: number, file: any) => sum + file.Size, 0);
      const recentUploads = files.filter((file: any) => {
        const uploadDate = new Date(file.CreatedAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return uploadDate > weekAgo;
      }).length;

      setStats({
        totalFiles,
        totalSize,
        recentUploads,
        storageUsed: userStats.original_bytes || 0,
        storageQuota: 10485760 // 10MB default
      });

      // Get recent files (last 5)
      const sortedFiles = files
        .sort((a: any, b: any) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime())
        .slice(0, 5);
      setRecentFiles(sortedFiles);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStoragePercentage = () => {
    if (!stats) return 0;
    return Math.min((stats.storageUsed / stats.storageQuota) * 100, 100);
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return "🖼️";
    if (contentType.includes("pdf")) return "📄";
    if (contentType.startsWith("video/")) return "🎥";
    if (contentType.startsWith("audio/")) return "🎵";
    if (contentType.includes("zip") || contentType.includes("archive")) return "📦";
    return "📁";
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">
          Welcome back! Here's an overview of your file storage.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.totalFiles || 0}</div>
            <div className="stat-label">Total Files</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-value">{formatFileSize(stats?.totalSize || 0)}</div>
            <div className="stat-label">Storage Used</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⬆️</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.recentUploads || 0}</div>
            <div className="stat-label">Recent Uploads</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{getStoragePercentage().toFixed(1)}%</div>
            <div className="stat-label">Quota Used</div>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Storage Usage</h2>
        </div>
        <div className="card-body">
          <div className="storage-info">
            <div className="storage-text">
              <span>{formatFileSize(stats?.storageUsed || 0)}</span>
              <span className="text-secondary"> of </span>
              <span>{formatFileSize(stats?.storageQuota || 0)}</span>
            </div>
            <div className="progress">
              <div 
                className="progress-bar" 
                style={{ width: `${getStoragePercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Recent Files</h2>
        </div>
        <div className="card-body">
          {recentFiles.length > 0 ? (
            <div className="recent-files">
              {recentFiles.map((file) => (
                <div key={file.ID} className="recent-file-item">
                  <div className="file-icon">
                    {getFileIcon(file.ContentType)}
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.Filename}</div>
                    <div className="file-meta">
                      {formatFileSize(file.Size)} • {new Date(file.CreatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <p>No files uploaded yet</p>
              <a href="/upload" className="btn btn-primary btn-sm">
                Upload Your First File
              </a>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: var(--space-4);
        }

        .dashboard-header {
          margin-bottom: var(--space-8);
        }

        .dashboard-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--secondary-800);
          margin-bottom: var(--space-2);
        }

        .dashboard-subtitle {
          color: var(--secondary-600);
          font-size: 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-6);
          margin-bottom: var(--space-8);
        }

        .stat-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--secondary-200);
          display: flex;
          align-items: center;
          gap: var(--space-4);
          transition: all var(--transition-normal);
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .stat-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--primary-50);
          border-radius: var(--radius-lg);
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--secondary-800);
          margin-bottom: var(--space-1);
        }

        .stat-label {
          color: var(--secondary-600);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .storage-info {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .storage-text {
          font-weight: 500;
          color: var(--secondary-700);
        }

        .recent-files {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .recent-file-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          transition: background-color var(--transition-fast);
        }

        .recent-file-item:hover {
          background-color: var(--secondary-50);
        }

        .file-icon {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--primary-50);
          border-radius: var(--radius-md);
        }

        .file-info {
          flex: 1;
        }

        .file-name {
          font-weight: 500;
          color: var(--secondary-800);
          margin-bottom: var(--space-1);
        }

        .file-meta {
          font-size: 0.875rem;
          color: var(--secondary-600);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-8);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: var(--space-4);
        }

        .empty-state p {
          color: var(--secondary-600);
          margin-bottom: var(--space-4);
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: var(--space-4);
          }

          .stat-card {
            padding: var(--space-4);
          }

          .dashboard-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}