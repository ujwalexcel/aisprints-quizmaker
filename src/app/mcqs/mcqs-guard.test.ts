import { describe, expect, it } from "vitest";
import { getMcqsRedirectPath } from "@/lib/auth/mcqs-guard";

describe("getMcqsRedirectPath", () => {
  it("redirects unauthenticated users to login", () => {
    expect(getMcqsRedirectPath(null)).toBe("/login");
  });

  it("allows authenticated users to access mcqs", () => {
    expect(getMcqsRedirectPath({ userId: "user-123" })).toBeNull();
  });
});
