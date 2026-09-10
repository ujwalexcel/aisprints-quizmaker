import { beforeEach, describe, expect, it } from "vitest";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { requireSession } from "@/lib/auth/require-session";

const TEST_SECRET = "test-session-secret-at-least-32-characters-long";

describe("requireSession", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  it("returns userId for a valid session cookie value", () => {
    const cookieHeader = createSession("user-123");
    const cookieValue = cookieHeader
      .split(";")[0]
      .slice(`${SESSION_COOKIE_NAME}=`.length);

    expect(requireSession(cookieValue)).toEqual({ userId: "user-123" });
  });

  it("returns null for invalid or missing cookie values", () => {
    expect(requireSession(undefined)).toBeNull();
    expect(requireSession("not-a-valid-session")).toBeNull();
  });
});
