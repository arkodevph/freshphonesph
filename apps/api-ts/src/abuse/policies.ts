import { SetMetadata } from '@nestjs/common';
import ipaddr from 'ipaddr.js';

export const abusePolicies = {
  ingress: [[1200, 60]],
  health: [[120, 60]],
  publicRead: [[240, 60]],
  auth: [[60, 60]],
  application: [[5, 3600], [20, 86400]],
  agentLookup: [[30, 60], [300, 3600]],
  upload: [[20, 60], [120, 3600]],
  download: [[120, 60]],
  expensive: [[60, 60]],
  email: [[10, 3600]],
  stream: [[400, 60]],
  streamAccount: [[40, 60]],
  accountRead: [[600, 60]],
  accountWrite: [[120, 60]],
} as const;
export type AbusePolicyName = keyof typeof abusePolicies;
export type AbuseLimits = readonly (readonly [maximum: number, seconds: number])[];
export type AbuseOverrides = Partial<Record<AbusePolicyName, [number, number][]>>;
export const AbusePolicy = (name: AbusePolicyName) => SetMetadata('abusePolicy', name);

/** IPv4-mapped addresses share their IPv4 bucket; IPv6 privacy addresses share /64. */
export function addressGroup(address: string | undefined) {
  if (!address || !ipaddr.isValid(address)) return 'unknown';
  const parsed = ipaddr.process(address);
  if (parsed.kind() === 'ipv4') return parsed.toString();
  return `${parsed.toByteArray().slice(0, 8).map(byte => byte.toString(16).padStart(2, '0')).join('')}/64`;
}
