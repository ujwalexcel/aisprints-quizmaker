import "server-only";

import bcrypt from "bcryptjs";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const SALT_ROUNDS = 10;

const USER_SELECT =
  "SELECT id, first_name, last_name, username, email, password_hash, created_at, updated_at FROM users";

type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type PublicUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
};

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  password?: string;
};

export type AuthUser = PublicUser & {
  passwordHash: string;
};

async function getDb() {
  const { env } = await getCloudflareContext();
  return env.DB;
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getUserRowById(id: string): Promise<UserRow | null> {
  const db = await getDb();
  const result = await db
    .prepare(`${USER_SELECT} WHERE id = ?1`)
    .bind(id)
    .all<UserRow>();

  return result.results[0] ?? null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);

  await db
    .prepare(
      "INSERT INTO users (id, first_name, last_name, username, email, password_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(
      id,
      input.firstName,
      input.lastName,
      input.username,
      input.email,
      passwordHash,
    )
    .run();

  const row = await getUserRowById(id);
  if (!row) {
    throw new Error("Failed to create user");
  }

  return toPublicUser(row);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const row = await getUserRowById(id);
  return row ? toPublicUser(row) : null;
}

export async function getUserByEmail(email: string): Promise<PublicUser | null> {
  const db = await getDb();
  const result = await db
    .prepare(`${USER_SELECT} WHERE email = ?1`)
    .bind(email)
    .all<UserRow>();

  const row = result.results[0];
  return row ? toPublicUser(row) : null;
}

export async function getUserByUsername(
  username: string,
): Promise<PublicUser | null> {
  const db = await getDb();
  const result = await db
    .prepare(`${USER_SELECT} WHERE username = ?1`)
    .bind(username)
    .all<UserRow>();

  const row = result.results[0];
  return row ? toPublicUser(row) : null;
}

export async function getUserByEmailOrUsername(
  identifier: string,
): Promise<PublicUser | null> {
  const db = await getDb();
  const result = await db
    .prepare(`${USER_SELECT} WHERE email = ?1 OR username = ?1`)
    .bind(identifier)
    .all<UserRow>();

  const row = result.results[0];
  return row ? toPublicUser(row) : null;
}

export async function getAuthUserByEmailOrUsername(
  identifier: string,
): Promise<AuthUser | null> {
  const db = await getDb();
  const result = await db
    .prepare(`${USER_SELECT} WHERE email = ?1 OR username = ?1`)
    .bind(identifier)
    .all<UserRow>();

  const row = result.results[0];
  if (!row) {
    return null;
  }

  return {
    ...toPublicUser(row),
    passwordHash: row.password_hash,
  };
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<PublicUser | null> {
  const existing = await getUserRowById(id);
  if (!existing) {
    return null;
  }

  const db = await getDb();
  const firstName = input.firstName ?? existing.first_name;
  const lastName = input.lastName ?? existing.last_name;
  const username = input.username ?? existing.username;
  const email = input.email ?? existing.email;

  if (input.password) {
    const passwordHash = await hashPassword(input.password);
    await db
      .prepare(
        "UPDATE users SET password_hash = ?1, first_name = ?2, last_name = ?3, username = ?4, email = ?5, updated_at = CURRENT_TIMESTAMP WHERE id = ?6",
      )
      .bind(passwordHash, firstName, lastName, username, email, id)
      .run();
  } else {
    await db
      .prepare(
        "UPDATE users SET first_name = ?1, last_name = ?2, username = ?3, email = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5",
      )
      .bind(firstName, lastName, username, email, id)
      .run();
  }

  return getUserById(id);
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM users WHERE id = ?1").bind(id).run();
}
