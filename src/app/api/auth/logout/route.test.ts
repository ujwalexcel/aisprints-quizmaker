import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const { mockDestroySession } = vi.hoisted(() => ({
  mockDestroySession: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  destroySession: mockDestroySession,
  SESSION_COOKIE_NAME: "session",
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDestroySession.mockReturnValue(
      `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
    );
  });

  it("returns 200 with redirect hint and clears the session cookie", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=signed-token`,
        },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.redirectTo).toBe("/login");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(mockDestroySession).toHaveBeenCalled();
  });

  it("returns 200 and clears cookie when no session is present", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(mockDestroySession).toHaveBeenCalled();
  });
});
