ALTER TABLE files
  ADD COLUMN IF NOT EXISTS tags varchar(1000);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename);
CREATE INDEX IF NOT EXISTS idx_files_contenttype ON files(content_type);
CREATE INDEX IF NOT EXISTS idx_files_size ON files(size);
CREATE INDEX IF NOT EXISTS idx_files_createdat ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_files_tags ON files(tags);
