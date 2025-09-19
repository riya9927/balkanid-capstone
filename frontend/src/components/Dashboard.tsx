import React, { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { Card, CardHeader, CardBody } from "./ui/Card";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { formatFileSize, formatDate, getFileIcon } from "../utils/formatters";

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
  const { execute, loading } = useApi();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [filesResult, statsResult] = await Promise.all([
        execute({ method: 'GET', url: '/files' }),
        execute({ method: 'GET', url: '/stats' })
      ]);

      const files = filesResult?.files || [];
      const userStats = statsResult || {};

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
    }
  };

  const getStoragePercentage = () => {
    if (!stats) return 0;
    return Math.min((stats.storageUsed / stats.storageQuota) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back! Here's an overview of your file storage.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardBody className="flex items-center space-x-4">
            <div className="text-3xl">📁</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalFiles || 0}</div>
              <div className="text-sm text-gray-600">Total Files</div>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardBody className="flex items-center space-x-4">
            <div className="text-3xl">💾</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{formatFileSize(stats?.totalSize || 0)}</div>
              <div className="text-sm text-gray-600">Storage Used</div>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardBody className="flex items-center space-x-4">
            <div className="text-3xl">⬆️</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.recentUploads || 0}</div>
              <div className="text-sm text-gray-600">Recent Uploads</div>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardBody className="flex items-center space-x-4">
            <div className="text-3xl">📊</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{getStoragePercentage().toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Quota Used</div>
            </div>
          </CardBody>
        </Card>
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
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Storage Usage</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>{formatFileSize(stats?.storageUsed || 0)}</span>
              <span className="text-gray-500"> of </span>
              <span>{formatFileSize(stats?.storageQuota || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getStoragePercentage()}%` }}
              ></div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Recent Files</h2>
        </CardHeader>
        <CardBody>
          {recentFiles.length > 0 ? (
            <div className="space-y-4">
              {recentFiles.map((file) => (
                <div key={file.ID} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-2xl">
                    {getFileIcon(file.ContentType)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{file.Filename}</div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(file.Size)} • {formatDate(file.CreatedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📂</div>
              <p className="text-gray-500 mb-4">No files uploaded yet</p>
              <a href="/upload" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Upload Your First File
              </a>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}