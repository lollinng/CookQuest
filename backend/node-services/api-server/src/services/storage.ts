import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs/promises';
import { mkdirSync, createReadStream } from 'fs';
import { Readable } from 'stream';
import { logger } from './logger';

export interface StorageService {
  upload(buffer: Buffer, filename: string, contentType: string): Promise<string>;
  delete(storageKey: string): Promise<void>;
  stream(storageKey: string): Promise<Readable>;
}

// --- Google Cloud Storage implementation ---

class GcsStorageService implements StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor(bucketName: string, projectId?: string) {
    this.storage = new Storage({ projectId: projectId || undefined });
    this.bucketName = bucketName;
    logger.info({ bucket: bucketName }, 'Using Google Cloud Storage for uploads');
  }

  async upload(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filename);

    await file.save(buffer, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    return `https://storage.googleapis.com/${this.bucketName}/${filename}`;
  }

  async stream(storageKey: string): Promise<Readable> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(storageKey);
    const [exists] = await file.exists();
    if (!exists) {
      const err: any = new Error('File not found');
      err.code = 404;
      throw err;
    }
    return file.createReadStream();
  }

  async delete(storageKey: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      await bucket.file(storageKey).delete();
    } catch (err: any) {
      if (err.code === 404) return;
      logger.error({ err, storageKey }, 'GCS delete failed');
      throw err;
    }
  }
}

// --- Local disk implementation (for development) ---

class LocalStorageService implements StorageService {
  private uploadsDir: string;
  private baseUrl: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    try { mkdirSync(this.uploadsDir, { recursive: true }); } catch (_) {}
    this.baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3003}`;
    logger.info({ dir: this.uploadsDir }, 'Using local disk storage for uploads');
  }

  async upload(buffer: Buffer, filename: string, _contentType: string): Promise<string> {
    const filePath = path.join(this.uploadsDir, filename);
    await fs.writeFile(filePath, buffer);
    return `${this.baseUrl}/uploads/${filename}`;
  }

  async stream(storageKey: string): Promise<Readable> {
    const filePath = path.join(this.uploadsDir, storageKey);
    await fs.access(filePath); // throws ENOENT if missing
    return createReadStream(filePath);
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = path.join(this.uploadsDir, storageKey);
    await fs.unlink(filePath).catch(() => {});
  }
}

// --- Factory ---

let _instance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (_instance) return _instance;

  const gcsBucket = process.env.GCS_BUCKET;
  if (gcsBucket) {
    _instance = new GcsStorageService(gcsBucket, process.env.GCS_PROJECT_ID);
  } else {
    _instance = new LocalStorageService();
  }

  return _instance;
}
