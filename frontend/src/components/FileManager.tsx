import React, { useState, useEffect } from "react";
import axios from "axios";

interface FileItem {
  ID: number;
  Filename: string;
  ContentType: string;
  Size: number;
  Hash: string;
  Public: boolean;
  PublicToken?: string;
  DownloadCount: number;
  CreatedAt: string;
  FolderID?: number;
}

interface Folder {
  ID: number;
  Name: string;
  Public: boolean;
  PublicToken?: string;
  CreatedAt: string;
}

export default function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [shareTarget, setShareTarget] = useState("");
  const [message, setMessage] = useState("");

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
    headers: { "X-User": localStorage.getItem("username") || "" },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [filesRes, foldersRes] = await Promise.all([
        api.get("/files"),
        api.get("/folders")
      ]);
      setFiles(filesRes.data.files || []);
      setFolders(foldersRes.data.folders || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setMessage("Failed to load files and folders");
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await api.post("/folders", { name: newFolderName.trim() });
      setNewFolderName("");
      setShowCreateFolder(false);
      setMessage("Folder created successfully");
      fetchData();
    } catch (error: any) {
      setMessage("Failed to create folder: " + (error?.response?.data?.error || error.message));
    }
  };

  const shareFile = async (fileId: number, isPublic: boolean) => {
    try {
      await api.post(`/files/${fileId}/share`, { public: isPublic });
      setMessage(isPublic ? "File shared publicly" : "File made private");
      fetchData();
    } catch (error: any) {
      setMessage("Failed to update sharing: " + (error?.response?.data?.error || error.message));
    }
  };

  const shareWithUser = async (fileId: number) => {
    if (!shareTarget.trim()) return;
    
    try {
      await api.post(`/files/${fileId}/share/user`, { target_user: shareTarget.trim() });
      setMessage(`File shared with ${shareTarget}`);
      setShareTarget("");
    } catch (error: any) {
      setMessage("Failed to share with user: " + (error?.response?.data?.error || error.message));
    }
  };

  const deleteFile = async (fileId: number) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    
    try {
      await api.delete(`/files/${fileId}`);
      setMessage("File deleted successfully");
      fetchData();
    } catch (error: any) {
      setMessage("Failed to delete file: " + (error?.response?.data?.error || error.message));
    }
  };

  const downloadFile = async (fileId: number, filename: string) => {
    try {
      const response = await api.get(`/files/${fileId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setMessage("Failed to download file: " + (error?.response?.data?.error || error.message));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return "🖼️";
    if (contentType.includes("pdf")) return "📄";
    if (contentType.startsWith("video/")) return "🎥";
    if (contentType.startsWith("audio/")) return "🎵";
    if (contentType.includes("zip") || contentType.includes("archive")) return "📦";
    return "📁";
  };

  const copyPublicLink = (token: string) => {
    const link = `${window.location.origin}/download/${token}`;
    navigator.clipboard.writeText(link);
    setMessage("Public link copied to clipboard");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading files...</p>
      </div>
    );
  }

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h1 className="file-manager-title">File Manager</h1>
        <div className="header-actions">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="btn btn-secondary"
          >
            📁 New Folder
          </button>
          <a href="/upload" className="btn btn-primary">
            ⬆️ Upload Files
          </a>
        </div>
      </div>

      {message && (
        <div className="alert alert-success">
          {message}
          <button onClick={() => setMessage("")} className="alert-close">×</button>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create New Folder</h2>
              <button onClick={() => setShowCreateFolder(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="form-input"
                  placeholder="Enter folder name"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCreateFolder(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={createFolder} className="btn btn-primary">
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Folders ({folders.length})</h2>
          </div>
          <div className="card-body">
            <div className="folders-grid">
              {folders.map((folder) => (
                <div key={folder.ID} className="folder-card">
                  <div className="folder-icon">📁</div>
                  <div className="folder-info">
                    <div className="folder-name">{folder.Name}</div>
                    <div className="folder-meta">
                      Created {new Date(folder.CreatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="folder-actions">
                    {folder.Public && (
                      <span className="status-badge public">Public</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Files ({files.length})</h2>
          <div className="file-stats">
            Total Size: {formatFileSize(files.reduce((sum, file) => sum + file.Size, 0))}
          </div>
        </div>
        <div className="card-body">
          {files.length > 0 ? (
            <div className="files-table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>Downloads</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.ID}>
                      <td>
                        <div className="file-cell">
                          <div className="file-icon">
                            {getFileIcon(file.ContentType)}
                          </div>
                          <div className="file-details">
                            <div className="file-name">{file.Filename}</div>
                            <div className="file-hash">#{file.Hash.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td>{formatFileSize(file.Size)}</td>
                      <td>
                        <span className="content-type">{file.ContentType}</span>
                      </td>
                      <td>
                        <span className="download-count">{file.DownloadCount}</span>
                      </td>
                      <td>
                        {file.Public ? (
                          <span className="status-badge public">Public</span>
                        ) : (
                          <span className="status-badge private">Private</span>
                        )}
                      </td>
                      <td>{new Date(file.CreatedAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => downloadFile(file.ID, file.Filename)}
                            className="btn btn-sm btn-secondary"
                            title="Download"
                          >
                            ⬇️
                          </button>
                          <button
                            onClick={() => shareFile(file.ID, !file.Public)}
                            className="btn btn-sm btn-primary"
                            title={file.Public ? "Make Private" : "Make Public"}
                          >
                            {file.Public ? "🔒" : "🌐"}
                          </button>
                          {file.Public && file.PublicToken && (
                            <button
                              onClick={() => copyPublicLink(file.PublicToken!)}
                              className="btn btn-sm btn-success"
                              title="Copy Public Link"
                            >
                              📋
                            </button>
                          )}
                          <button
                            onClick={() => deleteFile(file.ID)}
                            className="btn btn-sm btn-error"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <p>No files found</p>
              <a href="/upload" className="btn btn-primary">
                Upload Your First File
              </a>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .file-manager {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: var(--space-4);
        }

        .file-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-8);
        }

        .file-manager-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--secondary-800);
        }

        .header-actions {
          display: flex;
          gap: var(--space-3);
        }

        .alert {
          position: relative;
        }

        .alert-close {
          position: absolute;
          top: var(--space-2);
          right: var(--space-3);
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: inherit;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          width: 100%;
          max-width: 500px;
          margin: var(--space-4);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-6);
          border-bottom: 1px solid var(--secondary-200);
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--secondary-500);
        }

        .modal-body {
          padding: var(--space-6);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          padding: var(--space-6);
          border-top: 1px solid var(--secondary-200);
        }

        .folders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: var(--space-4);
        }

        .folder-card {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          border: 1px solid var(--secondary-200);
          border-radius: var(--radius-md);
          background: var(--secondary-50);
          transition: all var(--transition-fast);
        }

        .folder-card:hover {
          background: var(--primary-50);
          border-color: var(--primary-200);
        }

        .folder-icon {
          font-size: 1.5rem;
        }

        .folder-info {
          flex: 1;
        }

        .folder-name {
          font-weight: 500;
          color: var(--secondary-800);
          margin-bottom: var(--space-1);
        }

        .folder-meta {
          font-size: 0.875rem;
          color: var(--secondary-600);
        }

        .file-stats {
          font-size: 0.875rem;
          color: var(--secondary-600);
        }

        .files-table-container {
          overflow-x: auto;
        }

        .file-cell {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .file-icon {
          font-size: 1.25rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--primary-50);
          border-radius: var(--radius-md);
        }

        .file-details {
          flex: 1;
        }

        .file-name {
          font-weight: 500;
          color: var(--secondary-800);
          margin-bottom: var(--space-1);
        }

        .file-hash {
          font-size: 0.75rem;
          color: var(--secondary-500);
          font-family: var(--font-mono);
        }

        .content-type {
          font-size: 0.875rem;
          color: var(--secondary-600);
          background: var(--secondary-100);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
        }

        .download-count {
          font-weight: 500;
          color: var(--primary-600);
        }

        .status-badge {
          font-size: 0.75rem;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge.public {
          background: var(--success-100);
          color: var(--success-700);
        }

        .status-badge.private {
          background: var(--secondary-100);
          color: var(--secondary-700);
        }

        .action-buttons {
          display: flex;
          gap: var(--space-2);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-12);
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
          .file-manager-header {
            flex-direction: column;
            gap: var(--space-4);
            align-items: stretch;
          }

          .header-actions {
            justify-content: center;
          }

          .folders-grid {
            grid-template-columns: 1fr;
          }

          .table {
            font-size: 0.875rem;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}