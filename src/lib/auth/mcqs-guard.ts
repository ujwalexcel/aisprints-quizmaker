export function getMcqsRedirectPath(
  session: { userId: string } | null,
): string | null {
  if (!session) {
    return "/login";
  }

  return null;
}
