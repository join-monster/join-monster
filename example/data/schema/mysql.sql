DROP TABLE IF EXISTS accounts;
CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email_address VARCHAR(150),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  num_legs INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS comments;
CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  body TEXT NOT NULL,
  post_id INT NOT NULL,
  author_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  body TEXT NOT NULL,
  author_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS relationships;
CREATE TABLE relationships (
  follower_id INT NOT NULL,
  followee_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (follower_id, followee_id)
);

DROP TABLE IF EXISTS sponsors;
CREATE TABLE sponsors (
  generation INT NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  num_legs INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

