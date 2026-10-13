import 'dotenv/config';
import { join } from 'node:path';
import { staffEmailKinds } from '@freshphones/contracts';
import { EmailLaunchError, inspectStaffEmailLaunch, parseEmailLaunchOptions, sendStaffEmailSmoke } from '../src/staff/email-launch';

async function main() {
  const options = parseEmailLaunchOptions(process.argv.slice(2));
  if (options.mode === 'help') {
    console.log('pnpm --filter @fresh/api-ts staff-email:check');
    console.log('pnpm --filter @fresh/api-ts staff-email:check --send --to=APPROVED_TEST_INBOX --run-id=UUID');
    console.log('Default: configuration inspection only. Sending: one synthetic email with private local evidence.');
    return;
  }
  const readiness = inspectStaffEmailLaunch(process.env);
  for (const [label, passed] of [
    ['Resend API key configured', readiness.apiKeyConfigured],
    ['Explicit production sender format', readiness.productionSenderFormat],
    ['Public HTTPS web origin', readiness.publicHttpsOrigin],
  ] as const) console.log(`[${passed ? 'PASS' : 'ACTION'}] ${label}`);
  console.log(`[PASS] ${staffEmailKinds.length} staff email types available.`);
  console.log(`[ACTION] ${readiness.domainVerification}`);
  if (options.mode === 'send') {
    const result = await sendStaffEmailSmoke(process.env, options, { directory: join(process.cwd(), '.local/staff-email-smoke') });
    console.log(`[PASS] Provider accepted the smoke run${result.reused ? ' previously; no additional provider call' : ''}.`);
    console.log(`Provider ID: ${result.providerId}`);
    console.log(`Private evidence: ${result.path}`);
  } else {
    console.log('Configuration inspection complete. No provider request or application write was made.');
    if (!readiness.readyForSmoke) process.exitCode = 1;
  }
  console.log(`[ACTION] ${readiness.inboxDelivery}`);
  console.log('[ACTION] Complete the named Owner walkthrough and record sign-off separately.');
}

void main().catch((error) => {
  console.error(error instanceof EmailLaunchError ? error.message : 'Staff email check failed; verify configuration and private evidence permissions.');
  process.exitCode = 1;
});
