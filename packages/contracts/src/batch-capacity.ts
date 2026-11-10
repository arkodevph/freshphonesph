export const BATCH_REAL_MEMBER_CAPACITY = 8;

export const BATCH_INTERNAL_PLACEHOLDER_COUNT = 4;

/** Internal display positions never participate in enrollment or money totals. */
export function batchCapacity(realMembers: number) {
  if (!Number.isSafeInteger(realMembers) || realMembers < 0) {
    throw new RangeError(
      "Real membership count must be a non-negative integer.",
    );
  }

  return {
    realMembers,
    capacity: BATCH_REAL_MEMBER_CAPACITY,
    remaining: Math.max(0, BATCH_REAL_MEMBER_CAPACITY - realMembers),
    full: realMembers >= BATCH_REAL_MEMBER_CAPACITY,
    overCapacity: realMembers > BATCH_REAL_MEMBER_CAPACITY,
    internalPlaceholders: BATCH_INTERNAL_PLACEHOLDER_COUNT,
  };
}
