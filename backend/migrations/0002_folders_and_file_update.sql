-- 0002_folders_and_file_update.sql

CREATE TABLE IF NOT EXISTS folders (
  id serial PRIMARY KEY,
  name varchar(1000) NOT NULL,
  uploader_id integer REFERENCES users(id),
  public boolean DEFAULT false,
  public_token varchar(255) UNIQUE,
  created_at timestamp DEFAULT now()
);

-- Add folder_id column to files if not exists
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS folder_id integer;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
CREATE INDEX IF NOT EXISTS idx_files_uploader ON files(uploader_id);
