import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { PublicUser } from "@/lib/services/user-service";

const {
  mockCreateUser,
  mockGetUserByEmail,
  mockGetUserByUsername,
  mockCreateSession,
} = vi.hoisted(() => ({
  mockCreateUser: vi.fn(),
  mockGetUserByEmail: vi.fn(),
  mockGetUserByUsername: vi.fn(),
  mockCreateSession: vi.fn(),
}));

vi.mock("@/lib/services/user-service", () => ({
  createUser: mockCreateUser,
  getUserByEmail: mockGetUserByEmail,
  getUserByUsername: mockGetUserByUsername,
}));

vi.mock("@/lib/auth/session", () => ({
  createSession: mockCreateSession,
  SESSION_COOKIE_NAME: "session",
}));

const validBody = {
  firstName: "Jane",
  lastName: "Doe",
  username: "jdoe",
  email: "jane.doe@school.edu",
  password: "securePassword123",
};

const mockUser: PublicUser = {
  id: "user-123",
  firstName: "Jane",
  lastName: "Doe",
  username: "jdoe",
  email: "jane.doe@school.edu",
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserByEmail.mockResolvedValue(null);
    mockGetUserByUsername.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(mockUser);
    mockCreateSession.mockReturnValue(
      `${SESSION_COOKIE_NAME}=signed-token; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`,
    );
  });

  it("returns 201 with user data, redirect hint, and session cookie", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user).toEqual(mockUser);
    expect(body.redirectTo).toBe("/mcqs");
    expect(body.user).not.toHaveProperty("password_hash");
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(response.headers.get("Set-Cookie")).toContain(SESSION_COOKIE_NAME);
    expect(mockCreateUser).toHaveBeenCalledWith(validBody);
    expect(mockCreateSession).toHaveBeenCalledWith("user-123");
  });

  it("returns 400 for invalid request bodies", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "Jane" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("returns 400 when email is already registered", async () => {
    mockGetUserByEmail.mockResolvedValue(mockUser);

    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/email/i);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("returns 400 when username is already taken", async () => {
    mockGetUserByUsername.mockResolvedValue(mockUser);

    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/username/i);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });
});
