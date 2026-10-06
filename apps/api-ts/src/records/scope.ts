import type { User } from '@freshphones/contracts';
import type { Prisma } from '../generated/prisma/client';

/** Intersect filters with this scope; a requested handler ID never replaces it. */
export function batchScope(user: User): Prisma.BatchWhereInput {
  return user.role === 'CORE_HANDLER' ? { handlerId: user.id } : {};
}
export function clientScope(user: User): Prisma.ClientWhereInput {
  return user.role === 'CORE_HANDLER' ? { batch: batchScope(user) } : {};
}
