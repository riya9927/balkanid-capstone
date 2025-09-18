import React, { useState } from "react";
import axios from "axios";

interface SearchFilters {
  q: string;
  mime: string;
  minSize: string;
  maxSize: string;
  startDate: string;
  endDate: string;
  tags: string;
  uploader: string;
}

interface FileResult {
  ID: number;
  Filename: string;
  ContentType: string;
  Size: number;
  Hash: string;
  DownloadCount: number;
  CreatedAt: string;
  Uploader: {
    Username: string;
  };
}

export default function Search() {
  const [filters, setFilters] = useState<SearchFilters>({
    q: "",
    mime: "",
    minSize: "",
    maxSize: "",
    startDate: "",
    endDate: "",
    tags: "",
    uploader: "",
  });
  const [results, setResults] = useState<FileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
    headers: { "X-User": localStorage.getItem("username") || "" },
  });

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const response = await api.get(`/search?${params.toString()}`);
      setResults(response.data.files || []);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      q: "",
      mime: "",
      minSize: "",
      maxSize: "",
      startDate: "",
      endDate: "",
      tags: "",
      uploader: "",
    });
    setResults([]);
    setSearched(false);
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

  const commonMimeTypes = [
    { value: "", label: "All Types" },
    { value: "image/jpeg", label: "JPEG Images" },
    { value: "image/png", label: "PNG Images" },
    { value: "application/pdf", label: "PDF Documents" },
    { value: "text/plain", label: "Text Files" },
    { value: "application/zip", label: "ZIP Archives" },
    { value: "video/mp4", label: "MP4 Videos" },
    { value: "audio/mpeg", label: "MP3 Audio" },
  ];

  return (
    <div className="search-container">
      <div className="search-header">
        <h1 className="search-title">Advanced Search</h1>
        <p className="search-subtitle">
          Find files using multiple filters and criteria
        </p>
      </div>

      {/* Search Form */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Search Filters</h2>
          <button
            onClick={clearFilters}
            className="btn btn-secondary btn-sm"
          >
            Clear All
          </button>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Filename</label>
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => handleFilterChange("q", e.target.value)}
                  className="form-input"
                  placeholder="Search by filename..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">File Type</label>
                <select
                  value={filters.mime}
                  onChange={(e) => handleFilterChange("mime", e.target.value)}
                  className="form-select"
                >
                  {commonMimeTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Min Size (bytes)</label>
                <input
                  type="number"
                  value={filters.minSize}
                  onChange={(e) => handleFilterChange("minSize", e.target.value)}
                  className="form-input"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Max Size (bytes)</label>
                <input
                  type="number"
                  value={filters.maxSize}
                  onChange={(e) => handleFilterChange("maxSize", e.target.value)}
                  className="form-input"
                  placeholder="No limit"
                  min="0"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tags</label>
                <input
                  type="text"
                  value={filters.tags}
                  onChange={(e) => handleFilterChange("tags", e.target.value)}
                  className="form-input"
                  placeholder="Comma-separated tags"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Uploader</label>
                <input
                  type="text"
                  value={filters.uploader}
                  onChange={(e) => handleFilterChange("uploader", e.target.value)}
                  className="form-input"
                  placeholder="Username"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    🔍 Search Files
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Search Results */}
      {searched && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">
              Search Results ({results.length})
            </h2>
            {results.length > 0 && (
              <div className="results-stats">
                Total Size: {formatFileSize(results.reduce((sum, file) => sum + file.Size, 0))}
              </div>
            )}
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Searching files...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="results-table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Size</th>
                      <th>Type</th>
                      <th>Uploader</th>
                      <th>Downloads</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((file) => (
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
                          <span className="uploader-name">{file.Uploader?.Username || "Unknown"}</span>
                        </td>
                        <td>
                          <span className="download-count">{file.DownloadCount}</span>
                        </td>
                        <td>{new Date(file.CreatedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No files found matching your criteria</p>
                <p className="text-sm text-secondary">
                  Try adjusting your search filters or clearing them to see all files
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .search-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .search-header {
          margin-bottom: var(--space-8);
          text-align: center;
        }

        .search-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--secondary-800);
          margin-bottom: var(--space-2);
        }

        .search-subtitle {
          color: var(--secondary-600);
          font-size: 1rem;
        }

        .search-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .form-actions {
          display: flex;
          justify-content: center;
          margin-top: var(--space-2);
        }

        .results-stats {
          font-size: 0.875rem;
          color: var(--secondary-600);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12);
          gap: var(--space-4);
        }

        .results-table-container {
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

        .uploader-name {
          font-weight: 500;
          color: var(--primary-600);
        }

        .download-count {
          font-weight: 500;
          color: var(--success-600);
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
          margin-bottom: var(--space-2);
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .table {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}