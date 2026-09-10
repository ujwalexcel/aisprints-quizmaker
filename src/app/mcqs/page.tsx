import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { McqList } from "@/components/mcq/mcq-list";
import { getMcqsRedirectPath } from "@/lib/auth/mcqs-guard";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { listMcqs } from "@/lib/services/mcq-service";
import { getUserById } from "@/lib/services/user-service";

export default async function McqsPage() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const redirectPath = getMcqsRedirectPath(session);

  if (redirectPath) {
    redirect(redirectPath);
  }

  const [user, mcqs] = await Promise.all([
    getUserById(session!.userId),
    listMcqs(),
  ]);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : "Teacher";

  return <McqList mcqs={mcqs} displayName={displayName} />;
}
