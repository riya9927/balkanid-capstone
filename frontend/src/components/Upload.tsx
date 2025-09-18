import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

type UploadProps = {
  onDone?: () => void;
};

export default function Upload({ onDone }: UploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    // accept: { "image/*": [], "application/pdf": [] } // optional accepted types
  });

  const uploadFiles = async () => {
    if (files.length === 0) return;
    setStatus("Uploading...");
    try {
      const username = localStorage.getItem("username") || "testuser";
      const form = new FormData();
      files.forEach((f) => form.append("files", f, f.name));

      await axios.post("/upload", form, {
        baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
        headers: {
          "X-User": username,
          // let axios set Content-Type (multipart/form-data with boundary)
        },
        onUploadProgress: (progressEvent) => {
          // compute overall progress
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress({ overall: percent });
        },
      });

      setStatus("Upload complete");
      setFiles([]);
      setProgress({});
      onDone && onDone();
    } catch (err: any) {
      setStatus("Upload failed: " + (err?.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div
        {...getRootProps()}
        style={{
          border: "2px dashed #999",
          padding: 20,
          textAlign: "center",
          background: isDragActive ? "#f0f8ff" : "#fff",
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? <p>Drop the files here ...</p> : <p>Drag & drop files here, or click to select files</p>}
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>Files to upload:</strong>
        <ul>
          {files.map((f, idx) => (
            <li key={idx}>
              {f.name} — {Math.round(f.size / 1024)} KB
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={uploadFiles} disabled={files.length === 0}>
          Upload
        </button>
        <span style={{ marginLeft: 10 }}>{status}</span>
      </div>

      {progress.overall ? (
        <div style={{ marginTop: 10 }}>
          <progress value={progress.overall} max={100} />
          <span> {progress.overall}%</span>
        </div>
      ) : null}
    </div>
  );
}
