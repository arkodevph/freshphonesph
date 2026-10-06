import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

export type PrivateUpload = { buffer: Buffer; mimetype: string; size: number; originalname: string };
export type UploadPolicy = { allowedMimeTypes: string[]; maxBytes: number; label: string };

const signatures: Record<string, (data: Buffer) => boolean> = {
  'image/png': (data) => data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/jpeg': (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
  'image/webp': (data) => data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP',
  'application/pdf': (data) => data.subarray(0, 5).toString() === '%PDF-',
};

@Injectable()
export class PrivateStorageService {
  private readonly directory = resolve(
    process.env.PRIVATE_STORAGE_DIR ?? resolve(__dirname, '../../.local/private'),
  );

  validate(file?: PrivateUpload) {
    if (!file) throw new BadRequestException('Choose a receipt proof image.');
    if (file.size < 1 || file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Receipt proof must be 5 MB or smaller.');
    const signature = signatures[file.mimetype];
    if (!signature || !signature(file.buffer))
      throw new BadRequestException('Use a valid JPG, PNG or WebP receipt image.');
    return file;
  }

  validateDocument(file: PrivateUpload | undefined, policy: UploadPolicy) {
    if (!file) throw new BadRequestException(`Choose a ${policy.label} file.`);
    const maxBytes = Math.min(policy.maxBytes, 10 * 1024 * 1024);
    if (file.size < 1 || file.size > maxBytes)
      throw new BadRequestException(`${policy.label} must be ${Math.floor(maxBytes / 1024 / 1024)} MB or smaller.`);
    const signature = signatures[file.mimetype];
    if (!policy.allowedMimeTypes.includes(file.mimetype) || !signature?.(file.buffer))
      throw new BadRequestException(`The selected ${policy.label} file type is not allowed.`);
    return file;
  }

  async save(file: PrivateUpload) {
    this.validate(file);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const storageKey = randomUUID();
    await writeFile(resolve(this.directory, storageKey), file.buffer, { mode: 0o600, flag: 'wx' });
    return storageKey;
  }

  async saveDocument(file: PrivateUpload, policy: UploadPolicy) {
    this.validateDocument(file, policy);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const storageKey = randomUUID();
    await writeFile(resolve(this.directory, storageKey), file.buffer, { mode: 0o600, flag: 'wx' });
    return storageKey;
  }

  async read(storageKey: string) {
    try {
      return await readFile(resolve(this.directory, storageKey));
    } catch {
      throw new NotFoundException('Receipt proof file is unavailable.');
    }
  }

  async remove(storageKey: string) {
    await unlink(resolve(this.directory, storageKey)).catch(() => undefined);
  }
}
