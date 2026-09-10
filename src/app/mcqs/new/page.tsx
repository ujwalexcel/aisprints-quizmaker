import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { McqForm } from "@/components/mcq/mcq-form";
import { getMcqsRedirectPath } from "@/lib/auth/mcqs-guard";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function NewMcqPage() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const redirectPath = getMcqsRedirectPath(session);

  if (redirectPath) {
    redirect(redirectPath);
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <McqForm mode="create" />
    </div>
  );
}
