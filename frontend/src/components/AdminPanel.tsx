import React, { useEffect, useState } from "react";
import api from "../api";

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

  useEffect(() => {
    fetchFiles();
    fetchStats();
    // subscribe realtime updates to update counts
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
      setMessage("Failed to load files");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch (err: any) {
      setMessage("Failed to load stats");
    }
  };

  const shareFile = async () => {
    if (!shareFileID || !shareUser) {
      setMessage("Enter ID and username");
      return;
    }
    try {
      await api.post(`/admin/share/${shareFileID}`, { target_user: shareUser });
      setMessage("Shared");
    } catch {
      setMessage("Share failed");
    }
  };

  return (
    <div>
      <h3>Global Stats</h3>
      {stats ? (
        <ul>
          <li>Original: {stats.total_original_bytes} bytes</li>
          <li>Deduped: {stats.total_deduped_bytes} bytes</li>
          <li>Savings: {stats.savings_bytes} bytes ({stats.savings_percent.toFixed(2)}%)</li>
          <li>Downloads: {stats.total_downloads}</li>
        </ul>
      ) : <p>Loading...</p>}

      <h3>All Files</h3>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th><th>Filename</th><th>Uploader</th><th>Size</th><th>Downloads</th>
          </tr>
        </thead>
        <tbody>
          {files.map(f => (
            <tr key={f.ID}>
              <td>{f.ID}</td>
              <td>{f.Filename}</td>
              <td>{f.Uploader?.Username}</td>
              <td>{(f.Size/1024).toFixed(1)} KB</td>
              <td>{f.DownloadCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Share file as admin</h3>
      <input type="number" placeholder="File ID" value={shareFileID ?? ""} onChange={(e)=>setShareFileID(Number(e.target.value))} />
      <input placeholder="username" value={shareUser} onChange={(e)=>setShareUser(e.target.value)} />
      <button onClick={shareFile}>Share</button>

      {message && <div className="small-muted">{message}</div>}
    </div>
  );
}
