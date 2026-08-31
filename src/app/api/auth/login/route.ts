import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth/session";
import {
  getAuthUserByEmailOrUsername,
  verifyPassword,
} from "@/lib/services/user-service";
import { loginSchema } from "@/lib/validations/auth";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email/username or password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { identifier, password } = parsed.data;
    const authUser = await getAuthUserByEmailOrUsername(identifier);

    if (!authUser || !(await verifyPassword(password, authUser.passwordHash))) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 },
      );
    }

    const user = {
      id: authUser.id,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      username: authUser.username,
      email: authUser.email,
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt,
    };

    return NextResponse.json(
      { user, redirectTo: "/mcqs" },
      {
        status: 200,
        headers: {
          "Set-Cookie": createSession(user.id),
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
