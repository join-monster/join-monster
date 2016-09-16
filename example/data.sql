CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_address VARCHAR(150),
  first_name VARCHAR(255),
  last_name VARCHAR(255)
);

INSERT INTO accounts (email_address, first_name, last_name)
VALUES ('andrew@stem.is', 'andrew', 'carlson'),
       ('matt@stem.is', 'matt', 'elder');

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL
);

INSERT INTO comments (body, post_id, author_id)
VALUES ('Wow this is a great post, Matt.', 1, 1);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  author_id INTEGER NOT NULL
);

INSERT INTO posts (body, author_id)
VALUES ('If I could marry a programming language, it would be Haskell.', 2);
