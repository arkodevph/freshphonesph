import { createWorkerApp } from './worker-app';

void createWorkerApp().then(() => { console.log('Redis background workers started.'); }).catch(() => {
  console.error('Worker startup failed. Check database, Redis and environment configuration.');
  process.exitCode = 1;
});
