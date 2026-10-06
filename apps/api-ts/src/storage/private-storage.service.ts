import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CONFIG, type Config } from '../config';

export type UploadPolicy = { allowedMimeTypes: string[]; maxBytes: number; label: string };
export type PrivateUpload = { buffer: Buffer; mimetype: string; size: number; originalname: string };

const signatures: Record<string, (data: Buffer) => boolean> = {
  'image/png': (data) => data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/jpeg': (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
  'image/webp': (data) => data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP',
};
const documentSignatures: Record<string, (data: Buffer) => boolean> = {
  ...signatures,
  'application/pdf': (data) => data.subarray(0, 5).toString() === '%PDF-',
};

@Injectable()
export class PrivateStorageService {
  private readonly directory: string;
  private readonly s3: S3Client | null;

  constructor(@Inject(CONFIG) private readonly config: Config) {
    this.directory = resolve(config.PRIVATE_STORAGE_DIR ?? resolve(__dirname, '../../.local/private'));
    this.s3 = config.PRIVATE_STORAGE_PROVIDER === 's3' ? new S3Client({
      region: config.PRIVATE_STORAGE_S3_REGION,
      endpoint: config.PRIVATE_STORAGE_S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.PRIVATE_STORAGE_S3_ACCESS_KEY!,
        secretAccessKey: config.PRIVATE_STORAGE_S3_SECRET_KEY!,
      },
    }) : null;
  }

  validate(file?: PrivateUpload) {
    if (!file) throw new BadRequestException('Choose a receipt proof image.');
    if (file.size < 1 || file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Receipt proof must be 5 MB or smaller.');
    const signature = signatures[file.mimetype];
    if (!signature || !signature(file.buffer))
      throw new BadRequestException('Use a valid JPG, PNG or WebP receipt image.');
    return file;
  }

  validateDocument(file?: PrivateUpload, policy?: UploadPolicy) {
    if (policy) {
      if (!file) throw new BadRequestException(`Choose a ${policy.label} file.`);
      const maxBytes = Math.min(policy.maxBytes, 10 * 1024 * 1024);
      if (file.size < 1 || file.size > maxBytes) throw new BadRequestException(`${policy.label} must be ${Math.floor(maxBytes / 1024 / 1024)} MB or smaller.`);
      if (!policy.allowedMimeTypes.includes(file.mimetype) || !documentSignatures[file.mimetype]?.(file.buffer))
        throw new BadRequestException(`The selected ${policy.label} file type is not allowed.`);
      return file;
    }
    if (!file) throw new BadRequestException('Choose a document to upload.');
    if (file.size < 1 || file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Document must be 5 MB or smaller.');
    const signature = documentSignatures[file.mimetype];
    if (!signature || !signature(file.buffer))
      throw new BadRequestException('Use a valid PDF, JPG, PNG or WebP document.');
    return file;
  }

  async save(file: PrivateUpload) {
    this.validate(file);
    return this.write(file);
  }

  async saveDocument(file: PrivateUpload, policy?: UploadPolicy) {
    this.validateDocument(file, policy);
    return this.write(file);
  }

  private async write(file: PrivateUpload) {
    const storageKey = randomUUID();
    if (this.s3) {
      await this.s3.send(new PutObjectCommand({ Bucket: this.config.PRIVATE_STORAGE_S3_BUCKET!, Key: storageKey,
        Body: file.buffer, ContentType: file.mimetype, ContentLength: file.size }));
    } else {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      await writeFile(resolve(this.directory, storageKey), file.buffer, { mode: 0o600, flag: 'wx' });
    }
    return storageKey;
  }

  async read(storageKey: string) {
    if (!/^[0-9a-f-]{36}$/i.test(storageKey)) throw new NotFoundException('Private file is unavailable.');
    try {
      if (this.s3) {
        const result = await this.s3.send(new GetObjectCommand({ Bucket: this.config.PRIVATE_STORAGE_S3_BUCKET!, Key: storageKey }));
        if (!result.Body) throw new Error('Missing object body');
        return Buffer.from(await result.Body.transformToByteArray());
      }
      return await readFile(resolve(this.directory, storageKey));
    } catch {
      throw new NotFoundException('Private file is unavailable.');
    }
  }

  async remove(storageKey: string) {
    if (!/^[0-9a-f-]{36}$/i.test(storageKey)) return;
    if (this.s3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.config.PRIVATE_STORAGE_S3_BUCKET!, Key: storageKey }));
      return;
    }
    await unlink(resolve(this.directory, storageKey)).catch(() => undefined);
  }
}
