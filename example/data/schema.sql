CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_address VARCHAR(150),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  num_legs INTEGER DEFAULT 2
);


CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL
);


CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  author_id INTEGER NOT NULL
);


CREATE TABLE relationships (
  follower_id INTEGER NOT NULL,
  followee_id INTEGER NOT NULL,
  UNIQUE (follower_id, followee_id) ON CONFLICT REPLACE
);
