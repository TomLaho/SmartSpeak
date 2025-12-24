import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

const bucket = process.env.S3_BUCKET as string;

export async function createUploadUrl(key: string, contentType: string) {
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 15 * 60 }
  );
  return url;
}

export async function createDownloadUrl(key: string) {
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: 15 * 60 }
  );
  return url;
}

export async function fetchObjectStream(key: string): Promise<NodeJS.ReadableStream> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const body = response.Body;
  if (!body || !(body instanceof Readable || typeof (body as any).transformToWebStream === 'function')) {
    throw new Error('Unable to read object from storage');
  }
  if (body instanceof Readable) return body;
  const webStream = (body as any).transformToWebStream();
  return Readable.fromWeb(webStream as any);
}
