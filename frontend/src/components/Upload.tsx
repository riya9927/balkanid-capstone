import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

interface UploadResult {
  filename: string;
  status: string;
  error?: string;
  file_id?: number;
}

export default function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setResults([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgress(0);
    
    try {
      const username = localStorage.getItem("username") || "testuser";
      const formData = new FormData();
      
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await axios.post("/upload", formData, {
        baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
        headers: {
          "X-User": username,
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setProgress(percent);
        },
      });

      setResults(response.data.results || []);
      setFiles([]);
    } catch (error: any) {
      console.error("Upload failed:", error);
      setResults([{
        filename: "Upload Error",
        status: "error",
        error: error?.response?.data?.error || error.message
      }]);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith("image/")) return "🖼️";
    if (type.includes("pdf")) return "📄";
    if (type.startsWith("video/")) return "🎥";
    if (type.startsWith("audio/")) return "🎵";
    if (type.includes("zip") || type.includes("archive")) return "📦";
    return "📁";
  };

  const getResultIcon = (status: string) => {
    switch (status) {
      case "uploaded": return "✅";
      case "deduped": return "🔄";
      case "error": return "❌";
      case "rejected": return "⚠️";
      default: return "📁";
    }
  };

  const getResultClass = (status: string) => {
    switch (status) {
      case "uploaded": return "result-success";
      case "deduped": return "result-info";
      case "error": return "result-error";
      case "rejected": return "result-warning";
      default: return "";
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h1 className="upload-title">Upload Files</h1>
        <p className="upload-subtitle">
          Drag and drop files or click to browse. Duplicate files will be automatically detected.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="card mb-6">
        <div className="card-body">
          <div
            {...getRootProps()}
            className={`upload-zone ${isDragActive ? "active" : ""}`}
          >
            <input {...getInputProps()} />
            <div className="upload-icon">
              {isDragActive ? "📤" : "📁"}
            </div>
            <div className="upload-text">
              {isDragActive ? (
                <p>Drop the files here...</p>
              ) : (
                <>
                  <p className="upload-primary">
                    Drag & drop files here, or <span className="upload-link">click to browse</span>
                  </p>
                  <p className="upload-secondary">
                    Supports all file types • Max 10MB per user
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Files to Upload ({files.length})</h2>
            <button
              onClick={() => setFiles([])}
              className="btn btn-secondary btn-sm"
            >
              Clear All
            </button>
          </div>
          <div className="card-body">
            <div className="file-list">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-icon">
                    {getFileIcon(file)}
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-meta">
                      {formatFileSize(file.size)} • {file.type || "Unknown type"}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="btn btn-error btn-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="card-footer">
            <div className="upload-actions">
              <div className="upload-info">
                Total: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
              </div>
              <button
                onClick={uploadFiles}
                disabled={uploading || files.length === 0}
                className="btn btn-primary"
              >
                {uploading ? (
                  <>
                    <div className="spinner"></div>
                    Uploading...
                  </>
                ) : (
                  `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="card mb-6">
          <div className="card-body">
            <div className="progress-container">
              <div className="progress-info">
                <span>Uploading files...</span>
                <span>{progress}%</span>
              </div>
              <div className="progress">
                <div 
                  className="progress-bar" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Upload Results</h2>
          </div>
          <div className="card-body">
            <div className="results-list">
              {results.map((result, index) => (
                <div key={index} className={`result-item ${getResultClass(result.status)}`}>
                  <div className="result-icon">
                    {getResultIcon(result.status)}
                  </div>
                  <div className="result-info">
                    <div className="result-filename">{result.filename}</div>
                    <div className="result-status">
                      {result.status === "uploaded" && "Successfully uploaded"}
                      {result.status === "deduped" && "File already exists (deduplicated)"}
                      {result.status === "error" && `Error: ${result.error}`}
                      {result.status === "rejected" && `Rejected: ${result.error}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .upload-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .upload-header {
          margin-bottom: var(--space-8);
          text-align: center;
        }

        .upload-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--secondary-800);
          margin-bottom: var(--space-2);
        }

        .upload-subtitle {
          color: var(--secondary-600);
          font-size: 1rem;
        }

        .upload-zone {
          border: 2px dashed var(--secondary-300);
          border-radius: var(--radius-lg);
          padding: var(--space-12);
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-normal);
          background: var(--secondary-50);
        }

        .upload-zone:hover,
        .upload-zone.active {
          border-color: var(--primary-400);
          background: var(--primary-50);
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: var(--space-4);
        }

        .upload-primary {
          font-size: 1.125rem;
          font-weight: 500;
          color: var(--secondary-700);
          margin-bottom: var(--space-2);
        }

        .upload-link {
          color: var(--primary-600);
          font-weight: 600;
        }

        .upload-secondary {
          color: var(--secondary-500);
          font-size: 0.875rem;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border: 1px solid var(--secondary-200);
          border-radius: var(--radius-md);
          background: var(--secondary-50);
        }

        .file-icon {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
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

        .upload-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .upload-info {
          font-weight: 500;
          color: var(--secondary-700);
        }

        .progress-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          font-weight: 500;
          color: var(--secondary-700);
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid;
        }

        .result-success {
          background: var(--success-50);
          border-color: var(--success-200);
        }

        .result-info {
          background: var(--primary-50);
          border-color: var(--primary-200);
        }

        .result-warning {
          background: var(--warning-50);
          border-color: var(--warning-200);
        }

        .result-error {
          background: var(--error-50);
          border-color: var(--error-200);
        }

        .result-icon {
          font-size: 1.25rem;
        }

        .result-info {
          flex: 1;
        }

        .result-filename {
          font-weight: 500;
          color: var(--secondary-800);
          margin-bottom: var(--space-1);
        }

        .result-status {
          font-size: 0.875rem;
          color: var(--secondary-600);
        }

        @media (max-width: 768px) {
          .upload-zone {
            padding: var(--space-8);
          }

          .upload-actions {
            flex-direction: column;
            gap: var(--space-3);
            align-items: stretch;
          }

          .file-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-2);
          }
        }
      `}</style>
    </div>
  );
}