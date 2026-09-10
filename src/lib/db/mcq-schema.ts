export const MCQS_TABLE_NAME = "mcqs";

export const MCQS_COLUMNS = [
  "id",
  "name",
  "question",
  "created_by_user_id",
  "created_at",
  "updated_at",
] as const;

export const MCQ_CHOICES_TABLE_NAME = "mcq_choices";

export const MCQ_CHOICES_COLUMNS = [
  "id",
  "mcq_id",
  "choice_text",
  "is_correct",
  "created_at",
  "updated_at",
] as const;

export const MCQ_ATTEMPTS_TABLE_NAME = "mcq_attempts";

export const MCQ_ATTEMPTS_COLUMNS = [
  "id",
  "mcq_id",
  "user_id",
  "choice_id",
  "is_correct",
  "created_at",
] as const;

export const MCQ_MIGRATION_SQL = `-- Migration: create MCQ tables for quiz management
CREATE TABLE mcqs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  question TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_mcqs_created_at ON mcqs (created_at);
CREATE INDEX idx_mcqs_created_by_user_id ON mcqs (created_by_user_id);

CREATE TABLE mcq_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mcq_id TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mcq_id) REFERENCES mcqs (id) ON DELETE CASCADE
);

CREATE INDEX idx_mcq_choices_mcq_id ON mcq_choices (mcq_id);

CREATE TABLE mcq_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mcq_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mcq_id) REFERENCES mcqs (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (choice_id) REFERENCES mcq_choices (id) ON DELETE CASCADE
);

CREATE INDEX idx_mcq_attempts_mcq_id ON mcq_attempts (mcq_id);
CREATE INDEX idx_mcq_attempts_user_id ON mcq_attempts (user_id);
`;

export const MCQ_MIGRATION_FILENAME = "0002_create_mcq_tables.sql";
