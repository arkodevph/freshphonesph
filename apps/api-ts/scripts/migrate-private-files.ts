import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readConfig } from '../src/config';
import { Database } from '../src/database';

async function main() {
  const config = readConfig();
  if (config.PRIVATE_STORAGE_PROVIDER !== 's3') throw new Error('Set PRIVATE_STORAGE_PROVIDER=s3 and the private bucket configuration.');
  const directory = resolve(config.PRIVATE_STORAGE_DIR ?? resolve(__dirname, '../.local/private'));
  const keys = (await readdir(directory)).filter((name) => /^[0-9a-f-]{36}$/i.test(name));
  const apply = process.argv.includes('--apply');
  const s3 = new S3Client({ region: config.PRIVATE_STORAGE_S3_REGION, endpoint: config.PRIVATE_STORAGE_S3_ENDPOINT,
    forcePathStyle: true, credentials: { accessKeyId: config.PRIVATE_STORAGE_S3_ACCESS_KEY!, secretAccessKey: config.PRIVATE_STORAGE_S3_SECRET_KEY! } });
  let uploaded = 0;
  let eligible = 0;
  const db = new Database(config);
  try {
    for (const key of keys) {
      // Do not resurrect erased files or copy orphan blobs from an old restore.
      const file = await db.storedFile.findUnique({ where: { storageKey: key }, select: { purgePending: true } });
      if (!file || file.purgePending) continue;
      eligible++;
      const local = await readFile(resolve(directory, key));
      if (apply) {
        await s3.send(new PutObjectCommand({ Bucket: config.PRIVATE_STORAGE_S3_BUCKET!, Key: key, Body: local, ContentLength: local.length }));
        const remote = await s3.send(new GetObjectCommand({ Bucket: config.PRIVATE_STORAGE_S3_BUCKET!, Key: key }));
        if (!remote.Body || createHash('sha256').update(local).digest('hex') !== createHash('sha256').update(await remote.Body.transformToByteArray()).digest('hex'))
          throw new Error(`Verification failed for ${key}.`);
        uploaded++;
      }
    }
  } finally { s3.destroy(); await db.$disconnect(); }
  console.log(apply ? `Verified ${uploaded}/${eligible} eligible private files in the bucket. Local originals retained until approved erasure.` : `Dry run: ${eligible} eligible private files would be copied and verified. Pass --apply to copy.`);
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Migration failed.'); process.exitCode = 1; });
