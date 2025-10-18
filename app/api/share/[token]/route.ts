export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/server/db';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const share = await prisma.shareToken.findUnique({
      where: { token: params.token },
      include: {
        recording: {
          include: { metrics: true, tips: { orderBy: { priority: 'asc' } } }
        }
      }
    });

    if (!share) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(share.recording);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load shared recording' }, { status: 500 });
  }
}
