import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { verifyToken } from '@/src/features/auth/service';

const AUTH_COOKIE = 'smartspeak_token';

export function setAuthCookie(token: string) {
  cookies().set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearAuthCookie() {
  cookies().delete(AUTH_COOKIE);
}

export function getAuthToken() {
  const cookie = cookies().get(AUTH_COOKIE);
  return cookie?.value;
}

export function requireUser(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) throw new Error('Unauthorized');
  return verifyToken(token);
}
