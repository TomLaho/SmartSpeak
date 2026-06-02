import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { isClerkConfigured } from '@/lib/clerk-config';

// Built lazily so the matchers (and Clerk) are only evaluated when Clerk is
// configured. In demo mode we let every request through — the /train trainer is
// entirely client-side.
function buildClerkMiddleware() {
  const isProtectedRoute = createRouteMatcher(['/app(.*)', '/api(.*)']);
  // The Stripe webhook must stay public (it authenticates via signature).
  const isPublicRoute = createRouteMatcher(['/api/stripe/webhook']);

  return clerkMiddleware((auth, req) => {
    if (isProtectedRoute(req) && !isPublicRoute(req)) {
      auth().protect();
    }
  });
}

const passthrough = () => NextResponse.next();

export default isClerkConfigured ? buildClerkMiddleware() : passthrough;

export const config = {
  matcher: ['/((?!_next|.*\..*).*)', '/'],
};
