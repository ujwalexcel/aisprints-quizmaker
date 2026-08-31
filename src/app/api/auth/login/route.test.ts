import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/services/user-service";

const {
  mockGetAuthUserByEmailOrUsername,
  mockVerifyPassword,
  mockCreateSession,
} = vi.hoisted(() => ({
  mockGetAuthUserByEmailOrUsername: vi.fn(),
  mockVerifyPassword: vi.fn(),
  mockCreateSession: vi.fn(),
}));

vi.mock("@/lib/services/user-service", () => ({
  getAuthUserByEmailOrUsername: mockGetAuthUserByEmailOrUsername,
  verifyPassword: mockVerifyPassword,
}));

vi.mock("@/lib/auth/session", () => ({
  createSession: mockCreateSession,
  SESSION_COOKIE_NAME: "session",
}));

const mockAuthUser: AuthUser = {
  id: "user-123",
  firstName: "Jane",
  lastName: "Doe",
  username: "jdoe",
  email: "jane.doe@school.edu",
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
  passwordHash: "hashed-password",
};

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserByEmailOrUsername.mockResolvedValue(mockAuthUser);
    mockVerifyPassword.mockResolvedValue(true);
    mockCreateSession.mockReturnValue(
      `${SESSION_COOKIE_NAME}=signed-token; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`,
    );
  });

  it("returns 200 with user data, redirect hint, and session cookie", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "jane.doe@school.edu",
          password: "securePassword123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user).toEqual({
      id: mockAuthUser.id,
      firstName: mockAuthUser.firstName,
      lastName: mockAuthUser.lastName,
      username: mockAuthUser.username,
      email: mockAuthUser.email,
      createdAt: mockAuthUser.createdAt,
      updatedAt: mockAuthUser.updatedAt,
    });
    expect(body.redirectTo).toBe("/mcqs");
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(response.headers.get("Set-Cookie")).toContain(SESSION_COOKIE_NAME);
  });

  it("returns 401 with a generic message for unknown users", async () => {
    mockGetAuthUserByEmailOrUsername.mockResolvedValue(null);

    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "missing@school.edu",
          password: "securePassword123",
        }),
      }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid email/username or password");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("returns 401 with a generic message for wrong passwords", async () => {
    mockVerifyPassword.mockResolvedValue(false);

    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "jane.doe@school.edu",
          password: "wrongPassword123",
        }),
      }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid email/username or password");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("accepts login by email or username", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "jdoe",
          password: "securePassword123",
        }),
      }),
    );

    expect(mockGetAuthUserByEmailOrUsername).toHaveBeenCalledWith("jdoe");
  });
});
