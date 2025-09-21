
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import api from "../api";
import { Upload as UploadIcon, File, X, CheckCircle, AlertCircle } from "lucide-react";

type Props = { onDone?: () => void };

export default function Upload({ onDone }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const upload = async () => {
    if (files.length === 0) return;
    
    setMessage(null);
    setUploading(true);
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

      const results = res.data.results;
      setMessage("Upload completed successfully!");
      setFiles([]);
      setProgress(0);
      onDone && onDone();
    } catch (err: any) {
      setMessage("Upload failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <UploadIcon className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <UploadIcon className="w-8 h-8 text-blue-600" />
          </div>
          {isDragActive ? (
            <p className="text-lg font-medium text-blue-700">Drop files here...</p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900">Drag & drop files here</p>
              <p className="text-gray-500">or click to browse</p>
            </>
          )}
          
          {/* File type badges */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {["PDF", "Images", "Documents", "ZIP"].map((type) => (
              <span
                key={type}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Selected Files ({files.length})</h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <File className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button and progress */}
      <div className="flex items-center justify-between">
        <button
          onClick={upload}
          disabled={files.length === 0 || uploading}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UploadIcon className="w-4 h-4" />
          <span>{uploading ? "Uploading..." : "Upload Files"}</span>
        </button>

        {files.length > 0 && (
          <p className="text-sm text-gray-500">
            Total size: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
          </p>
        )}
      </div>

      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Uploading files...</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg ${
          message.includes("failed") 
            ? "bg-red-50 border border-red-200 text-red-800"
            : "bg-green-50 border border-green-200 text-green-800"
        }`}>
          {message.includes("failed") ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}
    </div>
  );
}