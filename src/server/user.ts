import { cookies } from 'next/headers';
import { verifyToken } from '@/src/features/auth/service';
import { prisma } from '@/src/server/db';

export async function getCurrentUser() {
  const token = cookies().get('smartspeak_token')?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return prisma.user.findUnique({ where: { id: payload.sub } });
  } catch (error) {
    console.error('Failed to verify auth token', error);
    return null;
  }
}
