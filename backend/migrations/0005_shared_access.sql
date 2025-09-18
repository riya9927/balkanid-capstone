CREATE TABLE IF NOT EXISTS shared_file_access (
  id serial PRIMARY KEY,
  file_id integer REFERENCES files(id) ON DELETE CASCADE,
  target_user_id integer REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  UNIQUE (file_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS shared_folder_access (
  id serial PRIMARY KEY,
  folder_id integer REFERENCES folders(id) ON DELETE CASCADE,
  target_user_id integer REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  UNIQUE (folder_id, target_user_id)
);
