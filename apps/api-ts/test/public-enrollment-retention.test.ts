import { test } from "node:test";
import assert from "node:assert/strict";
import { redactSnapshot } from "../src/retention/manifest";

test("public application audit erasure removes whole answer trees while retaining operational references", () => {
  const snapshot = {
    id: "application-reference",
    revisionId: "immutable-revision-reference",
    assignedAgentId: "assigned-agent-reference",
    status: "CLOSED",
    name: "Private applicant",
    answers: {
      status: "Private answer under an otherwise retained key",
      amount: 123456789,
      arbitraryId: "Private answer under an ID-like key",
      choices: ["Private choice"],
      agreement: true,
    },
    nested: {
      reviewedContact: {
        name: "Private reviewed name",
        phone: "09123456789",
        email: "private@example.test",
      },
    },
    closeReason: "Private reason",
  };

  assert.deepEqual(redactSnapshot(snapshot, ["answers", "reviewedContact"]), {
    id: snapshot.id,
    revisionId: snapshot.revisionId,
    assignedAgentId: snapshot.assignedAgentId,
    status: "CLOSED",
    name: "[erased]",
    answers: "[erased]",
    nested: { reviewedContact: "[erased]" },
    closeReason: "[erased]",
  });

  assert.equal(
    snapshot.answers.arbitraryId,
    "Private answer under an ID-like key",
  );
});
