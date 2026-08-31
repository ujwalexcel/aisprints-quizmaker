import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMcqsRedirectPath } from "@/lib/auth/mcqs-guard";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/user-service";

export default async function McqsPage() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const redirectPath = getMcqsRedirectPath(session);

  if (redirectPath) {
    redirect(redirectPath);
  }

  const user = await getUserById(session!.userId);
  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : "Teacher";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>MCQ Test Bank</CardTitle>
            <CardDescription>
              Signed in as {displayName}. Question authoring arrives in a later
              phase.
            </CardDescription>
          </div>
          <LogoutButton />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
