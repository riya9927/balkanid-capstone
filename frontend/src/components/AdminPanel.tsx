import React, { useEffect, useState } from "react";
import axios from "axios";

type FileItem = {
  ID: number;
  Filename: string;
  ContentType: string;
  Size: number;
  Hash: string;
  Uploader: { Username: string };
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

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
    headers: { "X-User": localStorage.getItem("username") || "" },
  });

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await api.get("/admin/files");
      setFiles(res.data.files || []);
    } catch (err: any) {
      setMessage("Failed to load files: " + (err?.response?.data?.error || err.message));
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch (err: any) {
      setMessage("Failed to load stats: " + (err?.response?.data?.error || err.message));
    }
  };

  const shareFile = async () => {
    if (!shareFileID || !shareUser) {
      setMessage("Enter File ID and target username");
      return;
    }
    try {
      const res = await api.post(`/admin/share/${shareFileID}`, { target_user: shareUser });
      setMessage(`File shared with ${shareUser}`);
      setShareFileID(null);
      setShareUser("");
    } catch (err: any) {
      setMessage("Share failed: " + (err?.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      <h2>Admin Panel</h2>
      {message && <p style={{ color: "red" }}>{message}</p>}

      <section style={{ marginBottom: 30 }}>
        <h3>Global Stats</h3>
        {stats ? (
          <ul>
            <li>Original Storage: {stats.total_original_bytes} bytes</li>
            <li>Deduped Storage: {stats.total_deduped_bytes} bytes</li>
            <li>Savings: {stats.savings_bytes} bytes ({stats.savings_percent.toFixed(2)}%)</li>
            <li>Total Downloads: {stats.total_downloads}</li>
          </ul>
        ) : (
          <p>Loading stats...</p>
        )}
      </section>

      <section style={{ marginBottom: 30 }}>
        <h3>All Files</h3>
        <table border={1} cellPadding={5} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Filename</th>
              <th>Uploader</th>
              <th>MIME</th>
              <th>Size</th>
              <th>Downloads</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.ID}>
                <td>{f.ID}</td>
                <td>{f.Filename}</td>
                <td>{f.Uploader?.Username}</td>
                <td>{f.ContentType}</td>
                <td>{(f.Size / 1024).toFixed(1)} KB</td>
                <td>{f.DownloadCount}</td>
                <td>{new Date(f.CreatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Share File With User</h3>
        <label>
          File ID:
          <input
            type="number"
            value={shareFileID || ""}
            onChange={(e) => setShareFileID(Number(e.target.value))}
            style={{ margin: "0 10px" }}
          />
        </label>
        <label>
          Target Username:
          <input
            type="text"
            value={shareUser}
            onChange={(e) => setShareUser(e.target.value)}
            style={{ margin: "0 10px" }}
          />
        </label>
        <button onClick={shareFile}>Share</button>
      </section>
    </div>
  );
}
