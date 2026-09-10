import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { createMcq, listMcqs } from "@/lib/services/mcq-service";
import { createMcqSchema } from "@/lib/validations/mcq";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!session) {
      return unauthorized();
    }

    const mcqs = await listMcqs();
    return NextResponse.json({ mcqs });
  } catch (error) {
    console.error("GET /api/mcqs failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!session) {
      return unauthorized();
    }

    const body = await request.json();
    const parsed = createMcqSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const mcq = await createMcq(parsed.data, session.userId);
    return NextResponse.json({ mcq }, { status: 201 });
  } catch (error) {
    console.error("POST /api/mcqs failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
