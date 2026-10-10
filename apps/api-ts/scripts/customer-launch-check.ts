import 'dotenv/config';
import { hasProductionSender, readConfig } from '../src/config';
import { PrivateStorageService } from '../src/storage/private-storage.service';
import { Database } from '../src/database';

const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV4cAAAAASUVORK5CYII=', 'base64');
const staging = process.argv.includes('--staging');
const apiOriginOption = process.argv.find((value) => value.startsWith('--api-origin='))?.slice('--api-origin='.length);

function origin(value: string) {
  const parsed = new URL(value);
  if (parsed.origin !== value.replace(/\/$/, '')) throw new Error('API origin must not include a path.');
  return parsed.origin;
}

async function reachable(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

async function main() {
  const config = readConfig();
  if (staging && config.NODE_ENV !== 'production') throw new Error('--staging requires NODE_ENV=production.');
  if (config.NODE_ENV === 'production' && !staging) throw new Error('Use --staging for the synthetic bucket check in a production-configured environment.');
  if (config.PRIVATE_STORAGE_PROVIDER === 's3' && !staging) throw new Error('Use --staging to acknowledge the synthetic write to a configured S3 bucket.');
  const apiOrigin = origin(apiOriginOption ?? `http://127.0.0.1:${config.PORT}`);
  if (staging && (!apiOriginOption || !apiOrigin.startsWith('https://')))
    throw new Error('--staging requires --api-origin=https://your-staging-api-origin.');

  let failed = false;
  const check = async (label: string, run: () => Promise<void>) => {
    try { await run(); console.log(`[PASS] ${label}`); }
    catch (error) {
      failed = true;
      console.error(`[FAIL] ${label}: ${error instanceof Error ? error.message : 'check failed'}`);
    }
  };

  await check('Customer login page', async () => { await reachable(`${config.WEB_ORIGIN}/login`); });
  await check('API and database health', async () => {
    const response = await reachable(`${apiOrigin}/api/health`);
    const body = await response.json() as { status?: string; database?: string };
    if (body.status !== 'ok' || body.database !== 'connected') throw new Error('Unexpected health response.');
  });
  if (config.REDIS_URL) await check('Redis and background worker health', async () => {
    const response = await reachable(`${apiOrigin}/api/health/redis`);
    const body = await response.json() as { redis?: string; worker?: string };
    if (body.redis !== 'connected' || body.worker !== 'running') throw new Error('Redis or workers unavailable.');
  });
  await check('Private storage upload, read, and cleanup with a synthetic image', async () => {
    const db = new Database(config);
    const storage = new PrivateStorageService(config, db);
    let key: string | undefined;
    try {
      key = await storage.saveDocument({ buffer: samplePng, mimetype: 'image/png', size: samplePng.length, originalname: 'customer-launch-check.png' });
      await db.storedFile.create({ data: { storageKey: key, originalName: 'customer-launch-check.png', mimeType: 'image/png', size: samplePng.length } });
      const downloaded = await storage.read(key);
      if (!downloaded.equals(samplePng)) throw new Error('Downloaded bytes did not match the upload.');
      if (staging) {
        const endpoint = config.PRIVATE_STORAGE_S3_ENDPOINT!.replace(/\/$/, '');
        const publicUrl = `${endpoint}/${encodeURIComponent(config.PRIVATE_STORAGE_S3_BUCKET!)}/${encodeURIComponent(key)}`;
        const anonymous = await fetch(publicUrl, { signal: AbortSignal.timeout(8_000) });
        if (anonymous.ok) throw new Error('Synthetic private file is anonymously accessible.');
      }
    } finally {
      try { if (key) { await storage.remove(key); await db.storedFile.deleteMany({ where: { storageKey: key } }); } }
      finally { await db.$disconnect(); }
    }
  });

  if (!staging) {
    console.log(`[ACTION] Private production bucket: ${config.PRIVATE_STORAGE_PROVIDER === 's3' ? 'configured; verify in client staging' : 'client-owned bucket pending'}.`);
    console.log(`[ACTION] Verified email sender: ${config.RESEND_API_KEY?.trim() && hasProductionSender(process.env.EMAIL_FROM) ? 'configured; test delivery in client staging' : 'client-owned sender pending'}.`);
  } else {
    console.log('[ACTION] Send one approved test notification to a named test mailbox and confirm delivery and its record link. This checker does not send email.');
  }
  console.log('[ACTION] Approve reminder offsets, privacy/retention rules, and the named customer UAT checklist before launch.');
  console.log(failed ? 'Automated customer launch checks failed.' : 'Automated checks passed; client decisions and UAT sign-off remain separate launch gates.');
  if (failed) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Customer launch check failed.');
  process.exitCode = 1;
});
