export const USERS_TABLE_NAME = "users";

export const USERS_COLUMNS = [
  "id",
  "first_name",
  "last_name",
  "username",
  "email",
  "password_hash",
  "created_at",
  "updated_at",
] as const;

export const USERS_MIGRATION_SQL = `-- Migration: create users table for teacher authentication
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
`;

export const USERS_MIGRATION_FILENAME = "0001_create_users_table.sql";
