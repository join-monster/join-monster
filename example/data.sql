CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_address VARCHAR(150),
  first_name VARCHAR(255),
  last_name VARCHAR(255)
);

INSERT INTO accounts (email_address, first_name, last_name)
VALUES ('andrew@stem.is', 'andrew', 'carlson'),
       ('matt@stem.is', 'matt', 'elder');
