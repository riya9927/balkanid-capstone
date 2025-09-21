
import React, { useEffect, useState } from "react";
import api from "../api";
import { File, Image, FileText, Archive, Music, Video, Download, Trash2, Share2, Users, Eye } from "lucide-react";

type FileItem = {
  ID: number;
  Filename: string;
  ContentType: string;
  Size: number;
  Hash: string;
  Public: boolean;
  DownloadCount: number;
  CreatedAt: string;
  Uploader?: { Username?: string };
};

type SharedUser = { id: number; username: string };

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) return Image;
  if (contentType === 'application/pdf') return FileText;
  if (contentType.includes('zip') || contentType.includes('rar')) return Archive;
  if (contentType.startsWith('audio/')) return Music;
  if (contentType.startsWith('video/')) return Video;
  return File;
};

const formatFileSize = (bytes: number) => {
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

export default function UserFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sharedWith, setSharedWith] = useState<Record<number, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Count files by category
  const fileCounts = {
    all: files.length,
    images: files.filter(f => f.ContentType.startsWith('image/')).length,
    docs: files.filter(f => f.ContentType === 'application/pdf' || f.ContentType.includes('document')).length,
    videos: files.filter(f => f.ContentType.startsWith('video/')).length,
    audio: files.filter(f => f.ContentType.startsWith('audio/')).length,
    other: files.filter(f => !f.ContentType.startsWith('image/') && !f.ContentType.startsWith('video/') && !f.ContentType.startsWith('audio/') && f.ContentType !== 'application/pdf' && !f.ContentType.includes('document')).length,
  };

  const categories = [
    { id: "all", label: `All (${fileCounts.all})` },
    { id: "images", label: `Images (${fileCounts.images})` },
    { id: "docs", label: `Docs (${fileCounts.docs})` },
    { id: "videos", label: `Videos (${fileCounts.videos})` },
    { id: "audio", label: `Audio (${fileCounts.audio})` },
    { id: "other", label: `Other (${fileCounts.other})` },
  ];

  const filteredFiles = files.filter(f => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "images") return f.ContentType.startsWith('image/');
    if (selectedCategory === "docs") return f.ContentType === 'application/pdf' || f.ContentType.includes('document');
    if (selectedCategory === "videos") return f.ContentType.startsWith('video/');
    if (selectedCategory === "audio") return f.ContentType.startsWith('audio/');
    if (selectedCategory === "other") return !f.ContentType.startsWith('image/') && !f.ContentType.startsWith('video/') && !f.ContentType.startsWith('audio/') && f.ContentType !== 'application/pdf' && !f.ContentType.includes('document');
    return true;
  });

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    const url = (import.meta.env.VITE_API_URL || "http://localhost:8080") + "/realtime";
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "download") {
          setFiles((prev) => prev.map((f) => (f.ID === data.file_id ? { ...f, DownloadCount: data.count } : f)));
        } else if (data.type === "upload") {
          fetchFiles();
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await api.get("/files");
      setFiles(res.data.files || []);
    } catch (err: any) {
      setMessage("Failed to load files: " + (err?.response?.data?.error || err.message));
    }
  };

  const fetchSharedWith = async (fileID: number) => {
    try {
      const res = await api.get(`/files/${fileID}/shared_with`);
      setSharedWith((p) => ({ ...p, [fileID]: res.data.shared_with || [] }));
    } catch (err: any) {
      setMessage("Failed to fetch shared users");
    }
  };

  const deleteFile = async (id: number) => {
    if (!confirm("Delete file?")) return;
    try {
      await api.delete(`/files/${id}`);
      setMessage("Deleted");
      fetchFiles();
    } catch (err: any) {
      setMessage("Delete failed: " + (err?.response?.data?.error || err.message));
    }
  };

  const downloadFile = async (f: FileItem) => {
  try {
    // Get file blob with auth
    const res = await api.get(`/files/${f.ID}/download`, { responseType: "blob" });

    // Create a download link
    const url = URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", f.Filename); // ✅ force download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup object URL
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err: any) {
    setMessage("Download failed: " + (err?.response?.data?.error || err.message));
  }
};


  const togglePublic = async (fileID: number, current: boolean) => {
    try {
      const res = await api.post(`/files/${fileID}/share`, { public: !current });
      setMessage(res.data.status || "updated");
      fetchFiles();
    } catch (err: any) {
      setMessage("Share toggle failed");
    }
  };

  const shareWithUser = async (fileID: number) => {
    const user = prompt("Enter username to share with:");
    if (!user) return;
    try {
      await api.post(`/files/${fileID}/share/user`, { target_user: user });
      setMessage("Shared");
      fetchSharedWith(fileID);
    } catch (err: any) {
      setMessage("Share failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category.id
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Files grid - 4 files per row */}
      <div className="grid grid-cols-4 gap-4">
        {filteredFiles.map((file) => {
          const IconComponent = getFileIcon(file.ContentType);
          return (
            <div key={file.ID} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              {/* File preview - smaller */}
              <div className="p-3 flex items-center justify-center h-24 bg-gray-50 rounded-t-lg">
                <IconComponent className="w-8 h-8 text-gray-400" />
              </div>

              {/* File info - compact */}
              <div className="p-3">
                <h3 className="font-medium text-gray-900 truncate mb-1 text-sm">{file.Filename}</h3>
                
                {/* Size and downloads */}
                <div className="text-xs text-gray-500 mb-2">
                  <div className="flex justify-between">
                    <span>{formatFileSize(file.Size)}</span>
                    <span className="flex items-center space-x-1">
                      <Download className="w-3 h-3" />
                      <span>{file.DownloadCount}</span>
                    </span>
                  </div>
                  <div className="mt-1">{file.Uploader?.Username}</div>
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {file.Public ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Private
                    </span>
                  )}
                  {/* {file.Hash && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      Duplicate
                    </span>
                  )} */}
                </div>

                {/* Hash */}
                {/* <div className="text-xs text-gray-400 mb-3">
                  #{file.Hash?.substring(0, 8)}
                </div> */}

                {/* Actions - stacked buttons */}
                <div className="space-y-1">
                  <button
                    onClick={() => downloadFile(file)}
                    className="w-full flex items-center justify-center space-x-1 px-2 py-1.5 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => deleteFile(file.ID)}
                      className="flex-1 flex items-center justify-center px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => togglePublic(file.ID, file.Public)}
                      className="flex-1 flex items-center justify-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => shareWithUser(file.ID)}
                      className="flex-1 flex items-center justify-center px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100 transition-colors"
                    >
                      <Users className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Shared with list - compact */}
                {sharedWith[file.ID] && sharedWith[file.ID].length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Shared:</p>
                    <div className="flex flex-wrap gap-1">
                      {sharedWith[file.ID].slice(0, 2).map((user) => (
                        <span key={user} className="text-xs bg-gray-100 text-gray-700 px-1 py-0.5 rounded">
                          {user}
                        </span>
                      ))}
                      {sharedWith[file.ID].length > 2 && (
                        <span className="text-xs text-gray-400">+{sharedWith[file.ID].length - 2}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No files found in this category</p>
        </div>
      )}
    </div>
  );
}