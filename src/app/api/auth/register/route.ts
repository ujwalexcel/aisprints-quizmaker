import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth/session";
import {
  createUser,
  getUserByEmail,
  getUserByUsername,
} from "@/lib/services/user-service";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (await getUserByEmail(data.email)) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 400 },
      );
    }

    if (await getUserByUsername(data.username)) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 },
      );
    }

    const user = await createUser(data);

    return NextResponse.json(
      { user, redirectTo: "/mcqs" },
      {
        status: 201,
        headers: {
          "Set-Cookie": createSession(user.id),
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
