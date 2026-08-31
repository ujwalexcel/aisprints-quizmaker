import { beforeEach, describe, expect, it, vi } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";

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

function createMockD1() {
  const users = new Map<string, UserRow>();

  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async run() {
              if (sql.includes("INSERT INTO users")) {
                const row: UserRow = {
                  id: params[0] as string,
                  first_name: params[1] as string,
                  last_name: params[2] as string,
                  username: params[3] as string,
                  email: params[4] as string,
                  password_hash: params[5] as string,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                users.set(row.id, row);
                return { success: true };
              }

              if (sql.includes("DELETE FROM users")) {
                users.delete(params[0] as string);
                return { success: true };
              }

              if (sql.includes("UPDATE users")) {
                const id = params[params.length - 1] as string;
                const existing = users.get(id);
                if (!existing) {
                  return { success: true };
                }

                if (sql.includes("password_hash = ?1")) {
                  users.set(id, {
                    ...existing,
                    password_hash: params[0] as string,
                    first_name: params[1] as string,
                    last_name: params[2] as string,
                    username: params[3] as string,
                    email: params[4] as string,
                    updated_at: new Date().toISOString(),
                  });
                } else {
                  users.set(id, {
                    ...existing,
                    first_name: params[0] as string,
                    last_name: params[1] as string,
                    username: params[2] as string,
                    email: params[3] as string,
                    updated_at: new Date().toISOString(),
                  });
                }

                return { success: true };
              }

              return { success: true };
            },
            async all() {
              const results = [...users.values()];

              if (sql.includes("WHERE id = ?1")) {
                const row = users.get(params[0] as string);
                return { results: row ? [row] : [] };
              }

              if (sql.includes("WHERE email = ?1 OR username = ?1")) {
                return {
                  results: results.filter(
                    (user) =>
                      user.email === params[0] || user.username === params[0],
                  ),
                };
              }

              if (sql.includes("WHERE email = ?1")) {
                return {
                  results: results.filter((user) => user.email === params[0]),
                };
              }

              if (sql.includes("WHERE username = ?1")) {
                return {
                  results: results.filter(
                    (user) => user.username === params[0],
                  ),
                };
              }

              return { results: [] };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, users };
}

let mockDb: D1Database;
let users: Map<string, UserRow>;

vi.mock("server-only", () => ({}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(async () => ({
    env: { DB: mockDb },
  })),
}));

describe("UserService", () => {
  beforeEach(() => {
    const mock = createMockD1();
    mockDb = mock.db;
    users = mock.users;
  });

  it("createUser stores a hashed password and returns a public user", async () => {
    const { createUser } = await import("@/lib/services/user-service");

    const user = await createUser({
      firstName: "Jane",
      lastName: "Doe",
      username: "jdoe",
      email: "jane.doe@school.edu",
      password: "securePassword123",
    });

    expect(user.firstName).toBe("Jane");
    expect(user.email).toBe("jane.doe@school.edu");
    expect(user).not.toHaveProperty("password_hash");
    expect(user).not.toHaveProperty("passwordHash");

    const stored = [...users.values()][0];
    expect(stored.password_hash).not.toBe("securePassword123");
    expect(stored.password_hash.length).toBeGreaterThan(0);
  });

  it("getUserByEmail returns a user when found", async () => {
    const { createUser, getUserByEmail } = await import(
      "@/lib/services/user-service"
    );

    await createUser({
      firstName: "Jane",
      lastName: "Doe",
      username: "jdoe",
      email: "jane.doe@school.edu",
      password: "securePassword123",
    });

    const user = await getUserByEmail("jane.doe@school.edu");
    expect(user?.email).toBe("jane.doe@school.edu");
  });

  it("getUserByUsername returns a user when found", async () => {
    const { createUser, getUserByUsername } = await import(
      "@/lib/services/user-service"
    );

    await createUser({
      firstName: "Jane",
      lastName: "Doe",
      username: "jdoe",
      email: "jane.doe@school.edu",
      password: "securePassword123",
    });

    const user = await getUserByUsername("jdoe");
    expect(user?.username).toBe("jdoe");
  });

  it("getUserByEmailOrUsername finds users by email or username", async () => {
    const { createUser, getUserByEmailOrUsername } = await import(
      "@/lib/services/user-service"
    );

    await createUser({
      firstName: "Jane",
      lastName: "Doe",
      username: "jdoe",
      email: "jane.doe@school.edu",
      password: "securePassword123",
    });

    const byEmail = await getUserByEmailOrUsername("jane.doe@school.edu");
    const byUsername = await getUserByEmailOrUsername("jdoe");

    expect(byEmail?.id).toBe(byUsername?.id);
  });

  it("lookup methods return null when no user exists", async () => {
    const {
      getUserByEmail,
      getUserByUsername,
      getUserByEmailOrUsername,
    } = await import("@/lib/services/user-service");

    expect(await getUserByEmail("missing@school.edu")).toBeNull();
    expect(await getUserByUsername("missing")).toBeNull();
    expect(await getUserByEmailOrUsername("missing")).toBeNull();
  });

  it("updateUser updates fields and re-hashes password when provided", async () => {
    const { createUser, updateUser, verifyPassword } = await import(
      "@/lib/services/user-service"
    );

    const created = await createUser({
      firstName: "Jane",
      lastName: "Doe",
      username: "jdoe",
      email: "jane.doe@school.edu",
      password: "securePassword123",
    });

    const updated = await updateUser(created.id, {
      firstName: "Janet",
      password: "newSecurePassword456",
    });

    expect(updated?.firstName).toBe("Janet");
    expect(updated?.lastName).toBe("Doe");

    const stored = users.get(created.id);
    expect(stored?.password_hash).toBeDefined();
    expect(
      await verifyPassword("newSecurePassword456", stored!.password_hash),
    ).toBe(true);
    expect(
      await verifyPassword("securePassword123", stored!.password_hash),
    ).toBe(false);
  });

  it("deleteUser removes the user row", async () => {
    const { createUser, deleteUser, getUserByEmail } = await import(
      "@/lib/services/user-service"
    );

    const created = await createUser({
      firstName: "Jane",
      lastName: "Doe",
      username: "jdoe",
      email: "jane.doe@school.edu",
      password: "securePassword123",
    });

    await deleteUser(created.id);

    expect(users.has(created.id)).toBe(false);
    expect(await getUserByEmail("jane.doe@school.edu")).toBeNull();
  });

  it("verifyPassword compares passwords correctly", async () => {
    const { hashPassword, verifyPassword } = await import(
      "@/lib/services/user-service"
    );

    const hash = await hashPassword("securePassword123");

    expect(await verifyPassword("securePassword123", hash)).toBe(true);
    expect(await verifyPassword("wrongPassword123", hash)).toBe(false);
  });
});
