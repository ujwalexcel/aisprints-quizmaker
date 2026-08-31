import { beforeEach, describe, expect, it } from "vitest";
import {
  createSession,
  destroySession,
  getSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const TEST_SECRET = "test-session-secret-at-least-32-characters-long";

describe("session helpers", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  it("createSession returns an HTTP-only session cookie", () => {
    const cookie = createSession("user-123");

    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("getSession reads a valid session cookie", () => {
    const cookieHeader = createSession("user-123");
    const cookieValue = cookieHeader
      .split(";")[0]
      .slice(`${SESSION_COOKIE_NAME}=`.length);

    expect(getSession(cookieValue)).toEqual({ userId: "user-123" });
  });

  it("getSession returns null for invalid or expired sessions", () => {
    expect(getSession("not-a-valid-session")).toBeNull();
    expect(getSession(undefined)).toBeNull();
  });

  it("destroySession returns a cookie clearing header", () => {
    const cookie = destroySession();

    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Path=/");
  });
});
