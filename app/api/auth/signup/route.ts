import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/server/db';
import { signup } from '@/src/features/auth/service';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = schema.parse(body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    const user = await signup(email, password, name);
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to sign up' }, { status: 500 });
  }
}
