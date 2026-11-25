import { createHash } from "node:crypto";
import { BadRequestException } from "@nestjs/common";

/** Assignment fields are immutable; the existing Task primary key is the durable receipt. */
export function assignmentId(actorId: string, key: string) {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
    throw new BadRequestException(
      "Idempotency-Key must contain 16–128 letters, digits, underscores or hyphens.",
    );
  }

  const digest = createHash("sha256")
    .update(`pioneer-task-assignment:v1:${actorId}:${key}`)
    .digest();

  digest[6] = (digest[6] & 15) | 128;

  digest[8] = (digest[8] & 63) | 128;

  const hex = digest.subarray(0, 16).toString("hex");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
