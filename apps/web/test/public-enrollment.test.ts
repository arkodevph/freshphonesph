import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultEnrollmentFormDefinition,
  effectivePermissions,
  type EnrollmentFormDefinition,
} from "@freshphones/contracts";
import { canOpenWorkspace } from "../lib/workspace-access";
import {
  enrollmentSubmissionAttempt,
  enrollmentAnswerText,
  getPublishedEnrollmentForm,
  migrateEnrollmentAnswers,
  submitPublicEnrollment,
} from "../lib/enrollment-forms";

const textId = defaultEnrollmentFormDefinition.questions[0]!.id;

const choiceId = "f6df35b0-dc9b-41f3-8d63-7f6e990ea5a9";

const optionId = "c1d46101-825d-44de-ad15-e4ef3b8b0cbf";

function form(): EnrollmentFormDefinition {
  const value = structuredClone(defaultEnrollmentFormDefinition);

  value.questions.push({
    id: choiceId,
    type: "multiple_choice",
    label: "Original choice question",
    help: "",
    required: false,
    options: [
      { id: optionId, label: "Original option" },
      { id: "a629a418-7bda-4e02-8519-2844819156c9", label: "Other option" },
    ],
  });

  return value;
}

test("changed or deleted questions retain old responses without silently populating different questions", () => {
  const previous = form(),
    next = structuredClone(previous);

  next.questions[0]!.label = "Different question";

  next.questions = next.questions.filter((question) => {
    return question.id !== choiceId;
  });

  const result = migrateEnrollmentAnswers(previous, next, {
    [textId]: "My earlier answer",
    [choiceId]: [optionId],
  });

  assert.deepEqual(result.answers, {});

  assert.deepEqual(result.previousAnswers, [
    { id: textId, label: "Preferred device", value: "My earlier answer" },
    {
      id: choiceId,
      label: "Original choice question",
      value: "Original option",
    },
  ]);
});

test("reordering unchanged questions carries answers and copies selected-option arrays", () => {
  const previous = form(),
    next = structuredClone(previous);

  next.questions.reverse();

  const choices = [optionId];

  const result = migrateEnrollmentAnswers(previous, next, {
    [textId]: "iPhone",
    [choiceId]: choices,
  });

  assert.equal(result.answers[textId], "iPhone");

  assert.deepEqual(result.answers[choiceId], [optionId]);

  assert.notEqual(result.answers[choiceId], choices);

  assert.deepEqual(result.previousAnswers, []);
});

test("changed choice labels are shown using original wording until explicitly reviewed", () => {
  const previous = form(),
    next = structuredClone(previous);

  const current = next.questions.find((question) => {
    return question.id === choiceId;
  })!;

  if (current.type !== "multiple_choice") {
    throw new Error("Expected choice fixture");
  }

  current.options[0]!.label = "New wording";

  const result = migrateEnrollmentAnswers(previous, next, {
    [choiceId]: [optionId],
  });

  assert.equal(result.answers[choiceId], undefined);

  assert.equal(result.previousAnswers[0]!.value, "Original option");

  assert.equal(
    enrollmentAnswerText(previous.questions[0]!, undefined),
    "Not answered",
  );
});

test("uncertain network retries keep their reference while edited content or revision starts another attempt", () => {
  const payload = {
    revisionId: "79d80222-d6fc-4014-9fba-4c87e4d13716",
    name: "Synthetic member",
    phone: "09170000000",
    email: "",
    contactAcknowledged: true as const,
    answers: { [textId]: "Phone" },
  };

  const first = enrollmentSubmissionAttempt(null, payload);

  assert.equal(
    enrollmentSubmissionAttempt(first, structuredClone(payload)),
    first,
  );

  assert.notEqual(
    enrollmentSubmissionAttempt(first, {
      ...payload,
      name: "Changed synthetic member",
    }).id,
    first.id,
  );

  assert.notEqual(
    enrollmentSubmissionAttempt(first, {
      ...payload,
      revisionId: "aa9ba977-1e6e-4816-8205-d43830ab0135",
    }).id,
    first.id,
  );
});

test("public form requests omit staff session credentials and preserve the exact submission payload", async () => {
  const original = globalThis.fetch;

  const requests: { url: string; init?: RequestInit }[] = [];

  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });

    return new Response(
      JSON.stringify(
        init?.method === "POST"
          ? { reference: "synthetic-reference" }
          : { revisionId: "synthetic", revisionNumber: 1, definition: form() },
      ),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await getPublishedEnrollmentForm();

    const payload = {
      submissionId: "b5700a5e-9365-48d1-a711-c5aaae842a99",
      revisionId: "79d80222-d6fc-4014-9fba-4c87e4d13716",
      name: "Synthetic member",
      phone: "09170000000",
      email: "",
      contactAcknowledged: true as const,
      answers: {},
    };

    await submitPublicEnrollment(payload);

    assert.ok(requests[0]!.url.endsWith("/api/public/enrollment-form"));

    assert.ok(requests[1]!.url.endsWith("/api/public/enrollment-applications"));

    for (const request of requests) {
      assert.equal(request.init?.credentials, "omit");

      assert.equal(request.init?.cache, "no-store");
    }

    assert.deepEqual(JSON.parse(String(requests[1]!.init?.body)), payload);
  } finally {
    globalThis.fetch = original;
  }
});

test("Records can reach the form editor while private applications and CEO mutation remain denied", () => {
  const records = effectivePermissions({ role: "RECORDS" });

  assert.equal(
    canOpenWorkspace("records", "/system/enrollments", records),
    true,
  );

  assert.ok(records.includes("ENROLLMENT_FORM_MANAGE"));

  assert.equal(records.includes("ENROLLMENT_APPLICATION_READ"), false);

  assert.equal(records.includes("ENROLLMENT_APPLICATION_MANAGE"), false);

  const ceo = effectivePermissions({ role: "CEO" });

  assert.equal(canOpenWorkspace("ceo", "/system/enrollments", ceo), false);

  const manager = effectivePermissions({ role: "BATCH_MANAGER" });

  assert.ok(manager.includes("ENROLLMENT_APPLICATION_READ"));

  assert.equal(manager.includes("ENROLLMENT_FORM_MANAGE"), false);
});
