select * from foo;

begin
execute immediate 'drop table "accounts"';
exception when others then null;
end;

CREATE TABLE "accounts" (
  "id" NUMBER(10),
  "email_address" VARCHAR(150),
  "first_name" VARCHAR(255),
  "last_name" VARCHAR(255),
  "num_legs" NUMBER(10) DEFAULT 2,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "accounts" ADD (
  CONSTRAINT accounts_pk PRIMARY KEY ("id"));

CREATE SEQUENCE accounts_seq START WITH 1;

CREATE OR REPLACE TRIGGER dept_bir 
BEFORE INSERT ON "accounts" 
FOR EACH ROW
BEGIN
  SELECT dept_seq.NEXTVAL
  INTO   :new."id"
  FROM   dual;
END;

BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE comments';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -942 THEN
         RAISE;
      END IF;
END;

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE posts';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -942 THEN
         RAISE;
      END IF;
END;

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  author_id INTEGER NOT NULL,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE relationships';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -942 THEN
         RAISE;
      END IF;
END;

CREATE TABLE relationships (
  follower_id INTEGER NOT NULL,
  followee_id INTEGER NOT NULL,
  closeness VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (follower_id, followee_id)
);

BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE likes';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -942 THEN
         RAISE;
      END IF;
END;

CREATE TABLE likes (
  account_id INTEGER NOT NULL,
  comment_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id, comment_id)
);

BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE sponsors';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -942 THEN
         RAISE;
      END IF;
END;

CREATE TABLE sponsors (
  generation INTEGER NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  num_legs INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

