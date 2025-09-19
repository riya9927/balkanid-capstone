import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';

export interface FileItem {
  ID: number;
  Filename: string;
  ContentType: string;
  Size: number;
  Hash: string;
  Public: boolean;
  PublicToken?: string;
  DownloadCount: number;
  CreatedAt: string;
  FolderID?: number;
  Uploader?: {
    Username: string;
  };
}

export function useFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const { execute, loading, error } = useApi<{ files: FileItem[] }>();

  const fetchFiles = useCallback(async () => {
    const result = await execute({ method: 'GET', url: '/files' });
    if (result) {
      setFiles(result.files || []);
    }
  }, [execute]);

  const deleteFile = useCallback(async (fileId: number) => {
    const result = await execute({ method: 'DELETE', url: `/files/${fileId}` });
    if (result) {
      await fetchFiles();
      return true;
    }
    return false;
  }, [execute, fetchFiles]);

  const shareFile = useCallback(async (fileId: number, isPublic: boolean) => {
    const result = await execute({
      method: 'POST',
      url: `/files/${fileId}/share`,
      data: { public: isPublic }
    });
    if (result) {
      await fetchFiles();
      return true;
    }
    return false;
  }, [execute, fetchFiles]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    fetchFiles,
    deleteFile,
    shareFile,
  };
}