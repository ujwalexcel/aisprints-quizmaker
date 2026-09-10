import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MCQ_ATTEMPTS_COLUMNS,
  MCQ_ATTEMPTS_TABLE_NAME,
  MCQ_CHOICES_COLUMNS,
  MCQ_CHOICES_TABLE_NAME,
  MCQ_MIGRATION_FILENAME,
  MCQ_MIGRATION_SQL,
  MCQS_COLUMNS,
  MCQS_TABLE_NAME,
} from "@/lib/db/mcq-schema";

function normalizeSql(sql: string): string {
  return sql.replace(/\r\n/g, "\n").trim();
}

describe("mcq schema contract", () => {
  it("defines the mcqs table name", () => {
    expect(MCQS_TABLE_NAME).toBe("mcqs");
  });

  it("lists all required mcqs columns", () => {
    expect(MCQS_COLUMNS).toEqual([
      "id",
      "name",
      "question",
      "created_by_user_id",
      "created_at",
      "updated_at",
    ]);
  });

  it("defines the mcq_choices table name and columns", () => {
    expect(MCQ_CHOICES_TABLE_NAME).toBe("mcq_choices");
    expect(MCQ_CHOICES_COLUMNS).toEqual([
      "id",
      "mcq_id",
      "choice_text",
      "is_correct",
      "created_at",
      "updated_at",
    ]);
  });

  it("defines the mcq_attempts table name and columns", () => {
    expect(MCQ_ATTEMPTS_TABLE_NAME).toBe("mcq_attempts");
    expect(MCQ_ATTEMPTS_COLUMNS).toEqual([
      "id",
      "mcq_id",
      "user_id",
      "choice_id",
      "is_correct",
      "created_at",
    ]);
  });

  it("includes create tables, foreign keys, and indexes in migration SQL", () => {
    const normalized = MCQ_MIGRATION_SQL.replace(/\s+/g, " ").trim();

    expect(normalized).toContain("CREATE TABLE mcqs");
    expect(normalized).toContain("question TEXT NOT NULL");
    expect(normalized).toContain("created_by_user_id TEXT NOT NULL");
    expect(normalized).toContain(
      "FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE CASCADE",
    );
    expect(normalized).toContain(
      "CREATE INDEX idx_mcqs_created_by_user_id ON mcqs (created_by_user_id)",
    );

    expect(normalized).toContain("CREATE TABLE mcq_choices");
    expect(normalized).toContain(
      "FOREIGN KEY (mcq_id) REFERENCES mcqs (id) ON DELETE CASCADE",
    );
    expect(normalized).toContain(
      "CREATE INDEX idx_mcq_choices_mcq_id ON mcq_choices (mcq_id)",
    );

    expect(normalized).toContain("CREATE TABLE mcq_attempts");
    expect(normalized).toContain(
      "FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE",
    );
    expect(normalized).toContain(
      "FOREIGN KEY (choice_id) REFERENCES mcq_choices (id) ON DELETE CASCADE",
    );
    expect(normalized).toContain(
      "CREATE INDEX idx_mcq_attempts_mcq_id ON mcq_attempts (mcq_id)",
    );
    expect(normalized).toContain(
      "CREATE INDEX idx_mcq_attempts_user_id ON mcq_attempts (user_id)",
    );
  });

  it("matches the checked-in D1 migration file", () => {
    const migrationsDir = join(process.cwd(), "migrations");
    const migrationFiles = readdirSync(migrationsDir);
    const migrationPath = join(migrationsDir, MCQ_MIGRATION_FILENAME);

    expect(migrationFiles).toContain(MCQ_MIGRATION_FILENAME);

    const migrationContents = readFileSync(migrationPath, "utf8");
    expect(normalizeSql(migrationContents)).toBe(
      normalizeSql(MCQ_MIGRATION_SQL),
    );
  });
});
