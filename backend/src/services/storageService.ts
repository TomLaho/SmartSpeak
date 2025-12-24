import axios from "axios";
import crypto from "crypto";
import { randomUUID } from "crypto";

type StorageMode = "s3" | "memory";

const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const sessionToken = process.env.S3_SESSION_TOKEN;
const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION || "auto";
const endpoint = process.env.S3_ENDPOINT;

const storageMode: StorageMode = accessKeyId && secretAccessKey && bucket ? "s3" : "memory";

const inMemoryStorage = new Map<
  string,
  {
    buffer: Buffer;
    contentType: string;
  }
>();

export interface PresignedUpload {
  uploadUrl: string;
  storageKey: string;
  mode: StorageMode;
  expiresIn: number;
}

export interface RetrievedAudio {
  buffer: Buffer;
  contentType: string;
  location: string;
  mode: StorageMode;
}

function getBaseUrl() {
  if (endpoint) {
    return endpoint.replace(/\/$/, "");
  }
  return `https://s3.${region}.amazonaws.com`;
}

function encodePath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function createSignatureKey(date: string, regionValue: string, service: string, secret: string) {
  const kDate = crypto.createHmac("sha256", `AWS4${secret}`).update(date).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(regionValue).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
  return crypto.createHmac("sha256", kService).update("aws4_request").digest();
}

function createPresignedUrl(method: "GET" | "PUT", key: string, expiresInSeconds: number, contentType?: string) {
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing S3 credentials or bucket");
  }

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const host = new URL(getBaseUrl()).host;
  const signedHeaders = contentType ? "content-type;host" : "host";
  const canonicalHeaders = contentType
    ? `content-type:${contentType}\nhost:${host}\n`
    : `host:${host}\n`;
  const queryEntries: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expiresInSeconds)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ];

  if (sessionToken) {
    queryEntries.push(["X-Amz-Security-Token", sessionToken]);
  }

  const canonicalQuery = queryEntries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  const canonicalPath = `/${encodePath(bucket)}/${encodePath(key)}`;
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    method,
    canonicalPath,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const signingKey = createSignatureKey(dateStamp, region, "s3", secretAccessKey);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const signedQuery = `${canonicalQuery}&X-Amz-Signature=${signature}`;

  const url = new URL(getBaseUrl());
  url.pathname = canonicalPath;
  url.search = signedQuery;
  return url.toString();
}

export function createUploadTarget(contentType: string): PresignedUpload {
  const now = new Date();
  const storageKey = `uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${randomUUID()}`;

  if (storageMode === "s3") {
    const uploadUrl = createPresignedUrl("PUT", storageKey, 900, contentType || "application/octet-stream");
    return { uploadUrl, storageKey, mode: storageMode, expiresIn: 900 };
  }

  const uploadUrl = `/api/uploads/dev/${encodePath(storageKey)}`;
  return { uploadUrl, storageKey, mode: storageMode, expiresIn: 900 };
}

export async function storeDevelopmentUpload(key: string, buffer: Buffer, contentType: string) {
  inMemoryStorage.set(key, { buffer, contentType });
}

export async function retrieveAudio(key: string): Promise<RetrievedAudio> {
  if (!key) {
    throw new Error("Storage key is required to download audio");
  }

  if (storageMode === "s3") {
    const downloadUrl = createPresignedUrl("GET", key, 300);
    const response = await axios.get<ArrayBuffer>(downloadUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    const contentType = (response.headers["content-type"] as string) || "application/octet-stream";
    return { buffer, contentType, location: downloadUrl.split("?")[0] ?? downloadUrl, mode: storageMode };
  }

  const stored = inMemoryStorage.get(key);
  if (!stored) {
    throw new Error("Audio not found in development storage");
  }
  return { buffer: stored.buffer, contentType: stored.contentType, location: `memory://${key}`, mode: storageMode };
}

export function getStorageMode(): StorageMode {
  return storageMode;
}
