import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CreateBucketCommand, DeleteBucketCommand, ListObjectVersionsCommand, PutBucketVersioningCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Database } from '../src/database';
import { PrivateStorageService } from '../src/storage/private-storage.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('Use a dedicated TEST_DATABASE_URL ending in _test.');
const endpoint = process.env.RETENTION_TEST_S3_ENDPOINT;
if (!endpoint || !['localhost', '127.0.0.1'].includes(new URL(endpoint).hostname)) throw new Error('Use an explicit local RETENTION_TEST_S3_ENDPOINT for this destructive synthetic bucket check.');
test('strict S3 erasure removes all object versions and retained local migration copies', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fresh-s3-retention-'));
  const Bucket = `retention-test-${randomUUID()}`;
  const config = { NODE_ENV: 'test' as const, PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl!, WEB_ORIGIN: 'http://localhost:3100', JWT_SECRET: 'storage-test-only-secret-at-least-32-characters',
    EMAIL_FROM: 'synthetic@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 's3' as const,
    PRIVATE_STORAGE_DIR: directory, PRIVATE_STORAGE_S3_ENDPOINT: endpoint!, PRIVATE_STORAGE_S3_BUCKET: Bucket, PRIVATE_STORAGE_S3_REGION: 'us-east-1',
    PRIVATE_STORAGE_S3_ACCESS_KEY: process.env.RETENTION_TEST_S3_ACCESS_KEY!, PRIVATE_STORAGE_S3_SECRET_KEY: process.env.RETENTION_TEST_S3_SECRET_KEY! };
  const db = new Database(config), storage = new PrivateStorageService(config, db);
  const s3 = new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true,
    credentials: { accessKeyId: config.PRIVATE_STORAGE_S3_ACCESS_KEY, secretAccessKey: config.PRIVATE_STORAGE_S3_SECRET_KEY } });
  let created = false;
  try {
    await s3.send(new CreateBucketCommand({ Bucket })); created = true;
    // Unversioned storage and missing objects are also confirmed idempotently.
    const first = randomUUID(); await s3.send(new PutObjectCommand({ Bucket, Key: first, Body: 'Private unversioned bytes' })); await storage.erase(first); await storage.erase(first);
    await s3.send(new PutBucketVersioningCommand({ Bucket, VersioningConfiguration: { Status: 'Enabled' } }));
    const key = randomUUID();
    for (const content of ['Private historical version', 'Private current version']) await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: content }));
    await writeFile(join(directory, key), 'Private retained local migration copy');
    const before = await s3.send(new ListObjectVersionsCommand({ Bucket, Prefix: key })); assert.equal(before.Versions?.length, 2);
    await storage.erase(key);
    const after = await s3.send(new ListObjectVersionsCommand({ Bucket, Prefix: key })); assert.equal(after.Versions?.length ?? 0, 0); assert.equal(after.DeleteMarkers?.length ?? 0, 0);
    await assert.rejects(readFile(join(directory, key))); await storage.erase(key);
  } finally {
    if (created) await s3.send(new DeleteBucketCommand({ Bucket }));
    s3.destroy(); await db.$disconnect(); await rm(directory, { recursive: true, force: true });
  }
});
