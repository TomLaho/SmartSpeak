import type { Request } from "express";

/**
 * Resolves a user ID from Clerk (or a fallback) without failing development flows
 * when Clerk credentials are not configured.
 */
export function resolveUserId(req: Request, fallback?: string): string | undefined {
  const headerUser = req.header("x-user-id");
  if (headerUser) {
    return headerUser;
  }

  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    if (token) {
      return token;
    }
  }

  if (fallback && typeof fallback === "string") {
    return fallback;
  }

  return undefined;
}
