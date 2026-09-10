import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { deleteMcq, getMcqById, updateMcq } from "@/lib/services/mcq-service";
import { updateMcqSchema } from "@/lib/validations/mcq";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function notFound() {
  return NextResponse.json({ error: "MCQ not found" }, { status: 404 });
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
    const mcq = await getMcqById(id);

    if (!mcq) {
      return notFound();
    }

    return NextResponse.json({ mcq });
  } catch (error) {
    console.error("GET /api/mcqs/[id] failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = requireSession(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!session) {
      return unauthorized();
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateMcqSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const mcq = await updateMcq(id, parsed.data);

    if (!mcq) {
      return notFound();
    }

    return NextResponse.json({ mcq });
  } catch (error) {
    console.error("PUT /api/mcqs/[id] failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = requireSession(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!session) {
      return unauthorized();
    }

    const { id } = await context.params;
    const deleted = await deleteMcq(id);

    if (!deleted) {
      return notFound();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/mcqs/[id] failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
