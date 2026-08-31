import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  USERS_COLUMNS,
  USERS_MIGRATION_FILENAME,
  USERS_MIGRATION_SQL,
  USERS_TABLE_NAME,
} from "@/lib/db/users-schema";

function normalizeSql(sql: string): string {
  return sql.replace(/\r\n/g, "\n").trim();
}

describe("users schema contract", () => {
  it("defines the users table name", () => {
    expect(USERS_TABLE_NAME).toBe("users");
  });

  it("lists all required user columns", () => {
    expect(USERS_COLUMNS).toEqual([
      "id",
      "first_name",
      "last_name",
      "username",
      "email",
      "password_hash",
      "created_at",
      "updated_at",
    ]);
  });

  it("includes create table, unique constraints, and indexes in migration SQL", () => {
    const normalized = USERS_MIGRATION_SQL.replace(/\s+/g, " ").trim();

    expect(normalized).toContain("CREATE TABLE users");
    expect(normalized).toContain("username TEXT NOT NULL UNIQUE");
    expect(normalized).toContain("email TEXT NOT NULL UNIQUE");
    expect(normalized).toContain("CREATE INDEX idx_users_email ON users (email)");
    expect(normalized).toContain(
      "CREATE INDEX idx_users_username ON users (username)",
    );
  });

  it("matches the checked-in D1 migration file", () => {
    const migrationsDir = join(process.cwd(), "migrations");
    const migrationFiles = readdirSync(migrationsDir);
    const migrationPath = join(migrationsDir, USERS_MIGRATION_FILENAME);

    expect(migrationFiles).toContain(USERS_MIGRATION_FILENAME);

    const migrationContents = readFileSync(migrationPath, "utf8");
    expect(normalizeSql(migrationContents)).toBe(
      normalizeSql(USERS_MIGRATION_SQL),
    );
  });
});
