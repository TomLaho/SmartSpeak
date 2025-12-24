import { NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getOrCreateUser } from '@/lib/auth';
import { createUploadUrl } from '@/lib/storage';

const bodySchema = z.object({
  contentType: z.string().default('audio/wav'),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const json = await req.json();
    const { contentType } = bodySchema.parse(json);

    if (!process.env.S3_BUCKET) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const key = `${user.id}/${uuid()}`;
    const url = await createUploadUrl(key, contentType);

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('[upload-url]', error);
    return NextResponse.json({ error: 'Unable to generate upload URL' }, { status: 500 });
  }
}
