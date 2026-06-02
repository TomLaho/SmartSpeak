/**
 * Helpers for running SmartSpeak with or without a configured backend.
 *
 * The trainer experience under /train is fully client-side and works with zero
 * external services ("demo mode"). The original authenticated cloud app under
 * /app still requires Clerk. These helpers let the shared root layout and
 * middleware degrade gracefully when Clerk keys are absent.
 */
export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const isClerkConfigured = Boolean(
  clerkPublishableKey && clerkPublishableKey.length > 0
);
