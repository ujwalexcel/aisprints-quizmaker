import { getSession } from "@/lib/auth/session";

export function requireSession(
  cookieValue: string | undefined,
): { userId: string } | null {
  return getSession(cookieValue);
}
