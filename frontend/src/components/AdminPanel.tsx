import React, { useEffect, useState } from "react";
import api from "../api";
import { Shield, Users, Share2, AlertCircle, CheckCircle } from "lucide-react";

type FileItem = {
  ID: number;
  Filename: string;
  ContentType: string;
  Size: number;
  Hash: string;
  Uploader?: { Username?: string };
  DownloadCount: number;
  CreatedAt: string;
};

type Stats = {
  total_original_bytes: number;
  total_deduped_bytes: number;
  savings_bytes: number;
  savings_percent: number;
  total_downloads: number;
};

export default function AdminPanel() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [shareUser, setShareUser] = useState("");
  const [shareFileID, setShareFileID] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  useEffect(() => {
    fetchFiles();
    fetchStats();
    
    const es = new EventSource((import.meta.env.VITE_API_URL || "http://localhost:8080") + "/realtime");
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "download") {
          setFiles((prev) => prev.map((f) => (f.ID === d.file_id ? { ...f, DownloadCount: d.count } : f)));
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await api.get("/admin/files");
      setFiles(res.data.files || []);
    } catch (err: any) {
      showMessage("Failed to load files", "error");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch (err: any) {
      showMessage("Failed to load stats", "error");
    }
  };

  const shareFile = async () => {
    if (!shareFileID || !shareUser) {
      showMessage("Enter both File ID and username", "error");
      return;
    }
    try {
      await api.post(`/admin/share/${shareFileID}`, { target_user: shareUser });
      showMessage("File shared successfully", "success");
      setShareUser("");
      setShareFileID(null);
    } catch {
      showMessage("Share failed", "error");
    }
  };

  const showMessage = (msg: string, type: "success" | "error" | "info" = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if user has admin access (this should be a real check in production)
  const hasAdminAccess = true; // Replace with actual admin check

  if (!hasAdminAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 text-center max-w-md">
          You need administrator privileges to access this panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-2">
        <Shield className="w-6 h-6 text-red-600" />
        <h2 className="text-2xl font-semibold text-gray-900">Admin Panel</h2>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg ${
          messageType === "success" 
            ? "bg-green-50 border border-green-200 text-green-800"
            : messageType === "error"
            ? "bg-red-50 border border-red-200 text-red-800"
            : "bg-blue-50 border border-blue-200 text-blue-800"
        }`}>
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message}</span>
        </div>
      )}

      {/* Global Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Statistics</h3>
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatBytes(stats.total_original_bytes)}</p>
              <p className="text-sm text-gray-500">Original Size</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatBytes(stats.total_deduped_bytes)}</p>
              <p className="text-sm text-gray-500">After Deduplication</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{formatBytes(stats.savings_bytes)}</p>
              <p className="text-sm text-gray-500">Space Saved ({stats.savings_percent.toFixed(2)}%)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.total_downloads}</p>
              <p className="text-sm text-gray-500">Total Downloads</p>
            </div>
          </div>
        ) : (
          <div className="animate-pulse">
            <div className="grid grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center space-y-2">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share File Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Share2 className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Share File as Admin</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="number"
            placeholder="File ID"
            value={shareFileID ?? ""}
            onChange={(e) => setShareFileID(Number(e.target.value))}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            placeholder="Username"
            value={shareUser}
            onChange={(e) => setShareUser(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={shareFile}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Share
          </button>
        </div>
      </div>

      {/* All Files */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Files ({files.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploader
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Downloads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.ID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{file.ID}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{file.Filename}</div>
                    <div className="text-sm text-gray-500">{file.ContentType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{file.Uploader?.Username || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatBytes(file.Size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {file.DownloadCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(file.CreatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {files.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No files found</p>
          </div>
        )}
      </div>
    </div>
  );
}