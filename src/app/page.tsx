import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function Home() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (session) {
    redirect("/mcqs");
  }

  redirect("/login");
}
