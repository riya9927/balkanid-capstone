CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username varchar(255) UNIQUE NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  id serial PRIMARY KEY,
  filename varchar(1000) NOT NULL,
  content_type varchar(255),
  size bigint NOT NULL,
  hash varchar(128),
  path varchar(2000),
  uploader_id integer REFERENCES users(id),
  public boolean DEFAULT false,
  public_token varchar(255) UNIQUE,
  download_count bigint DEFAULT 0,
  ref_count bigint DEFAULT 1,
  created_at timestamp DEFAULT now()
);
