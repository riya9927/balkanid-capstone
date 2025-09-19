import React, { useEffect, useState } from "react";
import api from "../api";

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

export default function UserFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sharedWith, setSharedWith] = useState<Record<number, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  // realtime update of download counts
  useEffect(() => {
    // optional: subscribe SSE using global hook or local EventSource
    const url = (import.meta.env.VITE_API_URL || "http://localhost:8080") + "/realtime";
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "download") {
          setFiles((prev) => prev.map((f) => (f.ID === data.file_id ? { ...f, DownloadCount: data.count } : f)));
        } else if (data.type === "upload") {
          // ignore or refresh list
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
    <div>
      {message && <div className="small-muted">{message}</div>}

      <table className="table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>ID</th><th>File</th><th>Size</th><th>Type</th><th>Downloads</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.ID}>
              <td>{f.ID}</td>
              <td>
                <div className="file-cell">
                  <div className="file-icon">📁</div>
                  <div>
                    <div>{f.Filename}</div>
                    <div className="small-muted">#{f.Hash?.substring(0,8)}</div>
                  </div>
                </div>
              </td>
              <td>{(f.Size/1024).toFixed(1)} KB</td>
              <td>{f.ContentType}</td>
              <td>{f.DownloadCount}</td>
              <td>
                <button onClick={() => downloadFile(f)} className="btn-sm">Download</button>
                <button onClick={() => deleteFile(f.ID)} className="btn-sm">Delete</button>
                <button onClick={() => togglePublic(f.ID, f.Public)} className="btn-sm">
                  {f.Public ? "Make Private" : "Share Public"}
                </button>
                <button onClick={() => fetchSharedWith(f.ID)} className="btn-sm">Shared With</button>
                <button onClick={() => shareWithUser(f.ID)} className="btn-sm">Share User</button>

                {sharedWith[f.ID] && sharedWith[f.ID].length > 0 && (
                  <ul>
                    {sharedWith[f.ID].map((u) => <li key={u}>{u}</li>)}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
