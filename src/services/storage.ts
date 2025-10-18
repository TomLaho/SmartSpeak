import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export interface StoredFile {
  path: string;
  url: string;
}

export interface StorageService {
  save(file: Buffer, filename: string): Promise<StoredFile>;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export class LocalStorageService implements StorageService {
  constructor(private readonly baseDir = UPLOAD_DIR) {}

  async ensureDir() {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async save(file: Buffer, filename: string): Promise<StoredFile> {
    await this.ensureDir();
    const ext = path.extname(filename);
    const safeName = crypto.randomBytes(10).toString('hex') + ext;
    const filePath = path.join(this.baseDir, safeName);
    await fs.writeFile(filePath, file);
    return { path: filePath, url: `/uploads/${safeName}` };
  }
}

export const storage = new LocalStorageService();
