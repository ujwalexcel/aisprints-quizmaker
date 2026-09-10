import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  createAttempt,
  listAttemptsByMcqId,
} from "@/lib/services/mcq-service";
import { createAttemptSchema } from "@/lib/validations/mcq";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function notFound() {
  return NextResponse.json({ error: "MCQ not found" }, { status: 404 });
}

function mapAttemptError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "MCQ not found") {
      return notFound();
    }

    if (error.message === "Choice not found for MCQ") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = requireSession(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!session) {
      return unauthorized();
    }

    const { id } = await context.params;
    const attempts = await listAttemptsByMcqId(id);
    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("GET /api/mcqs/[id]/attempts failed:", error);
    return mapAttemptError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = requireSession(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!session) {
      return unauthorized();
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = createAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const attempt = await createAttempt(
      id,
      session.userId,
      parsed.data.choiceId,
    );

    return NextResponse.json({ attempt }, { status: 201 });
  } catch (error) {
    console.error("POST /api/mcqs/[id]/attempts failed:", error);
    return mapAttemptError(error);
  }
}
