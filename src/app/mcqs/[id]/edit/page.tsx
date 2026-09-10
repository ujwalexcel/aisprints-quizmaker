import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { McqForm } from "@/components/mcq/mcq-form";
import { getMcqsRedirectPath } from "@/lib/auth/mcqs-guard";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getMcqById } from "@/lib/services/mcq-service";

type EditMcqPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMcqPage({ params }: EditMcqPageProps) {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const redirectPath = getMcqsRedirectPath(session);

  if (redirectPath) {
    redirect(redirectPath);
  }

  const { id } = await params;
  const mcq = await getMcqById(id);

  if (!mcq) {
    notFound();
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <McqForm
        mode="edit"
        mcqId={mcq.id}
        initialValues={{
          name: mcq.name,
          question: mcq.question,
          choices: mcq.choices.map((choice) => ({
            choiceText: choice.choiceText,
            isCorrect: choice.isCorrect,
          })),
        }}
      />
    </div>
  );
}
