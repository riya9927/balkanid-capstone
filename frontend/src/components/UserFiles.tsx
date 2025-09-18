import React, { useEffect, useState } from "react";
import axios from "axios";

type FileItem = {
  ID: number;
  Filename: string;
  ContentType: string;
  Size: number;
  Hash: string;
  Public: boolean;
  DownloadCount: number;
  CreatedAt: string;
};

type SharedUser = {
  id: number;
  username: string;
};

export default function UserFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [shareFileID, setShareFileID] = useState<number | null>(null);
  const [targetUser, setTargetUser] = useState("");
  const [sharedWith, setSharedWith] = useState<Record<number, SharedUser[]>>({});
  const [message, setMessage] = useState("");

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
    headers: { "X-User": localStorage.getItem("username") || "" },
  });

  useEffect(() => {
    fetchFiles();
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
      setSharedWith((prev) => ({ ...prev, [fileID]: res.data.shared_with || [] }));
    } catch (err: any) {
      setMessage("Failed to fetch shared users: " + (err?.response?.data?.error || err.message));
    }
  };

  const shareFile = async () => {
    if (!shareFileID || !targetUser) {
      setMessage("Please enter a file ID and target username");
      return;
    }
    try {
      await api.post(`/files/${shareFileID}/share/user`, { target_user: targetUser });
      setMessage(`File ${shareFileID} shared with ${targetUser}`);
      fetchSharedWith(shareFileID);
      setTargetUser("");
      setShareFileID(null);
    } catch (err: any) {
      setMessage("Share failed: " + (err?.response?.data?.error || err.message));
    }
  };

  const unshareFile = async (fileID: number, username: string) => {
    try {
      await api.delete(`/files/${fileID}/share/user`, { data: { target_user: username } });
      setMessage(`File ${fileID} unshared from ${username}`);
      fetchSharedWith(fileID);
    } catch (err: any) {
      setMessage("Unshare failed: " + (err?.response?.data?.error || err.message));
    }
  };

  return (
    <div>
      <h2>Your Files</h2>
      {message && <p style={{ color: "red" }}>{message}</p>}

      <table border={1} cellPadding={5} style={{ width: "100%", marginTop: 10 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Filename</th>
            <th>MIME</th>
            <th>Size</th>
            <th>Downloads</th>
            <th>Created</th>
            <th>Sharing</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.ID}>
              <td>{f.ID}</td>
              <td>{f.Filename}</td>
              <td>{f.ContentType}</td>
              <td>{(f.Size / 1024).toFixed(1)} KB</td>
              <td>{f.DownloadCount}</td>
              <td>{new Date(f.CreatedAt).toLocaleString()}</td>
              <td>
                <button onClick={() => fetchSharedWith(f.ID)}>View Shared Users</button>
                {sharedWith[f.ID] && (
                  <ul>
                    {sharedWith[f.ID].map((u) => (
                      <li key={u.id}>
                        {u.username}{" "}
                        <button onClick={() => unshareFile(f.ID, u.username)}>Unshare</button>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20 }}>
        <h3>Share File With User</h3>
        <input
          type="number"
          placeholder="File ID"
          value={shareFileID || ""}
          onChange={(e) => setShareFileID(Number(e.target.value))}
          style={{ marginRight: 10 }}
        />
        <input
          type="text"
          placeholder="Target Username"
          value={targetUser}
          onChange={(e) => setTargetUser(e.target.value)}
          style={{ marginRight: 10 }}
        />
        <button onClick={shareFile}>Share</button>
      </div>
    </div>
  );
}
