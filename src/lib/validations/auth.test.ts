import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

describe("registerSchema", () => {
  const validPayload = {
    firstName: "Jane",
    lastName: "Doe",
    username: "jdoe",
    email: "jane.doe@school.edu",
    password: "securePassword123",
  };

  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = registerSchema.safeParse({
      firstName: "Jane",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid username", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      username: "j",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid login payload", () => {
    const result = loginSchema.safeParse({
      identifier: "jane.doe@school.edu",
      password: "securePassword123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty identifier", () => {
    const result = loginSchema.safeParse({
      identifier: "",
      password: "securePassword123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      identifier: "jdoe",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
