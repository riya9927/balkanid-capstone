import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import api from "../api";

type Props = { onDone?: () => void };

export default function Upload({ onDone }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const upload = async () => {
    if (files.length === 0) return;
    setMessage(null);
    const form = new FormData();
    files.forEach((f) => form.append("files", f, f.name));

    try {
      const res = await api.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress(e) {
          const pct = Math.round((e.loaded * 100) / (e.total || 1));
          setProgress(pct);
        },
      });
      // backend returns results array with statuses (uploaded/deduped/rejected)
      const results = res.data.results;
      setMessage(JSON.stringify(results));
      setFiles([]);
      setProgress(0);
      onDone && onDone();
    } catch (err: any) {
      setMessage("Upload failed: " + (err?.response?.data?.error || err.message));
    }
  };

  return (
    <div>
      <div {...getRootProps()} className="card" style={{ cursor: "pointer", border: "2px dashed #ddd" }}>
        <input {...getInputProps()} />
        {isDragActive ? <p>Drop files here...</p> : <p>Drag & drop files here or click to select</p>}
        <div className="small-muted">Supports single or multiple files. Files are validated server-side.</div>
      </div>

      <div style={{ marginTop: 8 }}>
        <ul>
          {files.map((f, i) => (
            <li key={i}>
              {f.name} — {(f.size / 1024).toFixed(1)} KB
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 8 }}>
        <button onClick={upload} className="btn-sm">Upload</button>
        {progress > 0 && (
          <div style={{ marginTop: 8 }}>
            <div className="progress"><div style={{ width: `${progress}%` }} /></div>
            <div className="small-muted">{progress}%</div>
          </div>
        )}
      </div>

      {message && <div style={{ marginTop: 8 }} className="small-muted">{message}</div>}
    </div>
  );
}
