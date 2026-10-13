import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, GetBucketVersioningCommand, ListObjectVersionsCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CONFIG, type Config } from '../config';
import { Database } from '../database';

export type UploadPolicy = { allowedMimeTypes: string[]; maxBytes: number; label: string };
export type PrivateUpload = { buffer: Buffer; mimetype: string; size: number; originalname: string };
export type LocalMailCopy = { id: string; hash: string; recipient: string };

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

  constructor(@Inject(CONFIG) private readonly config: Config, @Inject(Database) private readonly db: Database) {
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
    const file = await this.db.storedFile.findUnique({ where: { storageKey }, select: { purgePending: true } });
    if (!file || file.purgePending) throw new NotFoundException('Private file is unavailable.');
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

  private async eraseLocal(path: string) {
    await unlink(path).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
    try { await readFile(path); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    throw new Error('Storage removal was not confirmed.');
  }
  async eraseLocalMail(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid mail key.');
    await this.eraseLocal(resolve(process.cwd(), '.local/mail', `${id}.txt`));
  }
  async localMailIndex(): Promise<LocalMailCopy[]> {
    const directory = resolve(process.cwd(), '.local/mail');
    try {
      const files = (await readdir(directory).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error; })).filter(file => /^[0-9a-f-]{36}\.txt$/i.test(file));
      const copies: LocalMailCopy[] = [];
      for (let offset = 0; offset < files.length; offset += 32) {
        await Promise.all(files.slice(offset, offset + 32).map(async file => {
          const bytes = await readFile(resolve(directory, file)).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return null; throw error; });
          if (!bytes) return;
          const recipient = /^To:\s*([^\r\n]+)$/im.exec(bytes.toString())?.[1].trim().toLowerCase();
          if (recipient) copies.push({ id: file.slice(0, -4), hash: createHash('sha256').update(bytes).digest('hex'), recipient });
        }));
      }
      return copies;
    } catch { throw new ServiceUnavailableException('Local email copies could not be inspected. Check storage before erasure.'); }
  }
  async localMailCopies(recipients: string[], index?: LocalMailCopy[]) {
    const addresses = new Set(recipients.map(email => email.trim().toLowerCase()).filter(Boolean));
    if (!addresses.size) return [];
    return (index ?? await this.localMailIndex()).filter(copy => addresses.has(copy.recipient)).map(({ id, hash }) => ({ id, hash }));
  }
  async erase(storageKey: string) {
    if (!/^[0-9a-f-]{36}$/i.test(storageKey)) throw new Error('Invalid storage key.');
    if (!this.s3) return this.eraseLocal(resolve(this.directory, storageKey));
    const Bucket = this.config.PRIVATE_STORAGE_S3_BUCKET!;
    const versioning = await this.s3.send(new GetBucketVersioningCommand({ Bucket }));
    if (versioning.Status === 'Enabled' || versioning.Status === 'Suspended') {
      // Delete all historical versions and delete markers. A simple DeleteObject only hides a versioned object.
      let KeyMarker: string | undefined, VersionIdMarker: string | undefined;
      do {
        const page = await this.s3.send(new ListObjectVersionsCommand({ Bucket, Prefix: storageKey, KeyMarker, VersionIdMarker }));
        for (const version of [...page.Versions ?? [], ...page.DeleteMarkers ?? []]) {
          if (version.Key === storageKey && version.VersionId) await this.s3.send(new DeleteObjectCommand({ Bucket, Key: storageKey, VersionId: version.VersionId }));
        }
        KeyMarker = page.IsTruncated ? page.NextKeyMarker : undefined;
        VersionIdMarker = page.IsTruncated ? page.NextVersionIdMarker : undefined;
      } while (KeyMarker);
      const remaining = await this.s3.send(new ListObjectVersionsCommand({ Bucket, Prefix: storageKey }));
      if ([...remaining.Versions ?? [], ...remaining.DeleteMarkers ?? []].some(version => version.Key === storageKey)) throw new Error('Object versions remain.');
    } else await this.s3.send(new DeleteObjectCommand({ Bucket, Key: storageKey }));
    try { await this.s3.send(new HeadObjectCommand({ Bucket, Key: storageKey })); } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
        // storage:migrate intentionally retains local originals. Purge that copy as well.
        await this.eraseLocal(resolve(this.directory, storageKey));
        return;
      }
      throw error;
    }
    throw new Error('Object removal was not confirmed.');
  }
}
