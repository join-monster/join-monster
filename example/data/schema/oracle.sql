begin
execute immediate 'drop table "accounts" purge';
exception when others then null;
end;

CREATE TABLE "accounts" (
  "id" NUMBER(10),
  "email_address" VARCHAR(150),
  "first_name" VARCHAR(255),
  "last_name" VARCHAR(255),
  "num_legs" NUMBER(10) DEFAULT 2,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

ALTER TABLE "accounts" ADD (
  CONSTRAINT accounts_pk PRIMARY KEY ("id"))

begin
execute immediate 'drop sequence accounts_seq';
exception when others then null;
end;

CREATE SEQUENCE accounts_seq START WITH 1

CREATE OR REPLACE TRIGGER accounts_bir 
BEFORE INSERT ON "accounts" 
FOR EACH ROW
BEGIN
  SELECT accounts_seq.NEXTVAL
  INTO   :new."id"
  FROM   dual;
END;

begin
execute immediate 'drop table "comments" purge';
exception when others then null;
end;

CREATE TABLE "comments" (
  "id" NUMBER ,
  "body" VARCHAR2(4000) NOT NULL,
  "post_id" NUMBER NOT NULL,
  "author_id" NUMBER NOT NULL,
  "archived" NUMBER(1) DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

ALTER TABLE "comments" ADD (
  CONSTRAINT comments_pk PRIMARY KEY ("id"))

begin
execute immediate 'drop sequence comments_seq';
exception when others then null;
end;

CREATE SEQUENCE comments_seq START WITH 1

CREATE OR REPLACE TRIGGER comments_bir 
BEFORE INSERT ON "comments" 
FOR EACH ROW
BEGIN
  SELECT comments_seq.NEXTVAL
  INTO   :new."id"
  FROM   dual;
END;

begin
execute immediate 'drop table "posts" purge';
exception when others then null;
end;

CREATE TABLE "posts" (
  "id" NUMBER ,
  "body" VARCHAR2(4000) NOT NULL,
  "author_id" NUMBER NOT NULL,
  "archived" NUMBER(1) DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

ALTER TABLE "posts" ADD (
  CONSTRAINT posts_pk PRIMARY KEY ("id"))

begin
execute immediate 'drop sequence posts_seq';
exception when others then null;
end;

CREATE SEQUENCE posts_seq START WITH 1

CREATE OR REPLACE TRIGGER posts_bir 
BEFORE INSERT ON "posts" 
FOR EACH ROW
BEGIN
  SELECT posts_seq.NEXTVAL
  INTO   :new."id"
  FROM   dual;
END;

begin
execute immediate 'drop table "relationships" purge';
exception when others then null;
end;

CREATE TABLE "relationships" (
  "follower_id" NUMBER NOT NULL,
  "followee_id" NUMBER NOT NULL,
  "closeness" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("follower_id", "followee_id")
)

begin
execute immediate 'drop table "likes" purge';
exception when others then null;
end;

CREATE TABLE "likes" (
  "account_id" NUMBER NOT NULL,
  "comment_id" NUMBER NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("account_id", "comment_id")
)

begin
execute immediate 'drop table "sponsors" purge';
exception when others then null;
end;

CREATE TABLE "sponsors" (
  "generation" NUMBER NOT NULL,
  "first_name" VARCHAR(255),
  "last_name" VARCHAR(255),
  "num_legs" NUMBER DEFAULT 2,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

