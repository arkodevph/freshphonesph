import { createApp } from './app';
import { readConfig } from './config';
async function main() {
  const config = readConfig();
  const app = await createApp(config);
  await app.listen(config.PORT, config.HOST);
}
void main().catch(() => {
  console.error('API startup failed. Check environment configuration and database connectivity.');
  process.exitCode = 1;
});
