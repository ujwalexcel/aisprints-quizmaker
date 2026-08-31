import { NextResponse } from "next/server";

import { destroySession } from "@/lib/auth/session";

export async function POST() {
  return NextResponse.json(
    { redirectTo: "/login" },
    {
      status: 200,
      headers: {
        "Set-Cookie": destroySession(),
      },
    },
  );
}
