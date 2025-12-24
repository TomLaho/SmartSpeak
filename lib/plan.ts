import { Plan, SpeechSession, SessionStatus, User } from '@prisma/client';

const FREE_SESSION_LIMIT = 3;

export function canUseSession(user: User, session?: SpeechSession) {
  if (user.plan === Plan.PRO) return true;
  if (session && session.status === SessionStatus.COMPLETED) return true;
  return user.lifetimeSessionsUsed < FREE_SESSION_LIMIT;
}

export function remainingSessions(user: User) {
  if (user.plan === Plan.PRO) return Infinity;
  return Math.max(0, FREE_SESSION_LIMIT - user.lifetimeSessionsUsed);
}

export { FREE_SESSION_LIMIT };
