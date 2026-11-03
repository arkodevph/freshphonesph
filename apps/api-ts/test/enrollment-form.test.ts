import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  defaultEnrollmentFormDefinition,
  enrollmentApplicationForwardSchema,
  enrollmentFormDefinitionSchema,
  enrollmentFormQuestionSchema,
  enrollmentPublicSubmissionSchema,
  validateEnrollmentAnswers,
  type EnrollmentFormDefinition,
  type EnrollmentFormQuestion,
} from "@freshphones/contracts";

const textId = "e6a84702-4a25-4009-adab-095e4ef6aa00";

const notesId = "f9f09b2d-cfa0-4366-9753-cf7a0dd460e8";

const choiceId = "381df07f-51be-4df5-8d0c-314a37907a7c";

const multipleId = "c4beee94-63a1-4b1b-b92e-794482a7ab8d";

const firstOption = "b639acb8-6740-4d74-b16e-0de355cde884";

const secondOption = "ea6f4b7e-2eba-4cce-a8bc-82c9124d2a96";

function definition(
  questions: EnrollmentFormQuestion[] = [],
): EnrollmentFormDefinition {
  return { ...structuredClone(defaultEnrollmentFormDefinition), questions };
}

function question(
  type: EnrollmentFormQuestion["type"],
  id = textId,
  required = false,
): EnrollmentFormQuestion {
  const fields = { id, type, label: "A question", help: "", required };

  return enrollmentFormQuestionSchema.parse(
    type === "single_choice" || type === "multiple_choice"
      ? {
          ...fields,
          options: [
            { id: firstOption, label: "First option" },
            { id: secondOption, label: "Second option" },
          ],
        }
      : fields,
  );
}

function submission(overrides: Record<string, unknown> = {}) {
  return {
    submissionId: randomUUID(),
    revisionId: randomUUID(),
    name: "  José Santos  ",
    phone: "+63 917 123 4567",
    email: "  Applicant@Example.test ",
    contactAcknowledged: true,
    answers: {},
    ...overrides,
  };
}

function invalidAnswer(
  form: EnrollmentFormDefinition,
  answers: unknown,
  id: string | null,
) {
  const result = validateEnrollmentAnswers(form, answers);

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(
      result.issues.some((issue) => {
        return issue.questionId === id && Boolean(issue.message);
      }),
    );
  }
}

test("the starter definition is valid and can be copied without mutating its stable question IDs", () => {
  const original = structuredClone(defaultEnrollmentFormDefinition);

  assert.deepEqual(enrollmentFormDefinitionSchema.parse(original), original);

  const edited = structuredClone(original);

  edited.questions.reverse();

  assert.equal(edited.questions[1].id, original.questions[0].id);

  assert.equal(
    defaultEnrollmentFormDefinition.questions[0].id,
    original.questions[0].id,
  );

  assert.deepEqual(validateEnrollmentAnswers(original, {}), {
    success: true,
    data: {},
  });
});

test("public contact fields normalize Unicode names and optional email without allowing extra fields", () => {
  const result = enrollmentPublicSubmissionSchema.parse(submission());

  assert.equal(result.name, "José Santos");

  assert.equal(result.email, "applicant@example.test");

  assert.equal(
    enrollmentPublicSubmissionSchema.parse(submission({ email: "   " })).email,
    "",
  );

  const missingEmail: Record<string, unknown> = submission();

  delete missingEmail.email;

  assert.equal(enrollmentPublicSubmissionSchema.parse(missingEmail).email, "");

  assert.equal(
    enrollmentPublicSubmissionSchema.safeParse(
      submission({ status: "APPROVED" }),
    ).success,
    false,
  );
});

test("public submissions require real contact shape, IDs and the explicit contact acknowledgment", () => {
  for (const overrides of [
    { name: " " },
    { name: "x" },
    { name: "a".repeat(101) },
    { name: "Name\u0000Text" },
    { phone: "" },
    { phone: "123456" },
    { phone: "1".repeat(26) },
    { phone: "not a number" },
    { phone: "-------" },
    { email: "invalid" },
    { contactAcknowledged: false },
    { contactAcknowledged: undefined },
    { revisionId: "invalid" },
    { submissionId: "invalid" },
    { answers: [] },
  ]) {
    assert.equal(
      enrollmentPublicSubmissionSchema.safeParse(submission(overrides)).success,
      false,
      JSON.stringify(overrides),
    );
  }
});

test("definition contact fields cannot remove required core fields or add configurable policy", () => {
  const form = definition();

  assert.equal(
    enrollmentFormDefinitionSchema.safeParse({
      ...form,
      contact: { name: form.contact.name },
    }).success,
    false,
  );

  assert.equal(
    enrollmentFormDefinitionSchema.safeParse({
      ...form,
      contact: {
        ...form.contact,
        name: { ...form.contact.name, required: false },
      },
    }).success,
    false,
  );

  assert.equal(
    enrollmentFormDefinitionSchema.safeParse({ ...form, reviewerRole: "CEO" })
      .success,
    false,
  );
});

test("definition fields enforce bounds and distinct question IDs while preserving array order", () => {
  const first = question("short_text");

  const second = question("long_text", notesId);

  assert.deepEqual(
    enrollmentFormDefinitionSchema
      .parse(definition([second, first]))
      .questions.map((item) => {
        return item.id;
      }),
    [notesId, textId],
  );

  for (const form of [
    { ...definition(), title: " " },
    { ...definition(), title: "x".repeat(121) },
    { ...definition(), description: "x".repeat(1001) },
    definition([first, { ...second, id: textId }]),
    definition([first, { ...second, id: textId.toUpperCase() }]),
    definition(
      Array.from({ length: 31 }, () => {
        return question("short_text", randomUUID());
      }),
    ),
  ]) {
    assert.equal(enrollmentFormDefinitionSchema.safeParse(form).success, false);
  }
});

test("only the closed question kinds are accepted and text questions cannot retain choice options", () => {
  const text = question("short_text");

  for (const invalid of [
    { ...text, type: "file" },
    { ...text, options: [] },
    { ...text, label: " " },
    { ...text, label: "x".repeat(161) },
    { ...text, help: "x".repeat(501) },
    { ...text, label: "Bad\nlabel" },
    { ...text, required: "true" },
  ]) {
    assert.equal(
      enrollmentFormQuestionSchema.safeParse(invalid).success,
      false,
    );
  }
});

test("choice definitions require two to twenty distinct stable IDs and distinct visible labels", () => {
  const choice = question("single_choice", choiceId);

  assert.ok("options" in choice);

  if (!("options" in choice)) {
    return;
  }

  for (const options of [
    [],
    choice.options.slice(0, 1),
    [
      { id: firstOption, label: "One" },
      { id: firstOption, label: "Two" },
    ],
    [
      { id: firstOption, label: "One" },
      { id: firstOption.toUpperCase(), label: "Two" },
    ],
    [
      { id: firstOption, label: "One" },
      { id: secondOption, label: " one " },
    ],
    [
      { id: firstOption, label: "Ｏｎｅ" },
      { id: secondOption, label: "One" },
    ],
    [
      { id: firstOption, label: "One" },
      { id: secondOption, label: " " },
    ],
    Array.from({ length: 21 }, (_, index) => {
      return { id: randomUUID(), label: `Option ${index}` };
    }),
  ]) {
    assert.equal(
      enrollmentFormQuestionSchema.safeParse({ ...choice, options }).success,
      false,
    );
  }
});

test("required questions reject missing and blank answers with their stable question IDs", () => {
  for (const [type, empty] of [
    ["short_text", " \t "],
    ["long_text", "\n "],
    ["single_choice", ""],
    ["multiple_choice", []],
  ] as const) {
    const form = definition([question(type, textId, true)]);

    invalidAnswer(form, {}, textId);

    invalidAnswer(form, { [textId]: empty }, textId);
  }
});

test("empty optional answers normalize to an empty map and valid Unicode multiline answers survive", () => {
  const form = definition([
    question("short_text", textId),
    question("long_text", notesId),
    question("single_choice", choiceId),
    question("multiple_choice", multipleId),
  ]);

  assert.deepEqual(
    validateEnrollmentAnswers(form, {
      [textId]: " ",
      [notesId]: "\n",
      [choiceId]: "",
      [multipleId]: [],
    }),
    { success: true, data: {} },
  );

  assert.deepEqual(
    validateEnrollmentAnswers(form, {
      [textId]: "  iPhone 色  ",
      [notesId]: "  Salamat po!\n希望する色: 紫\t✓  ",
    }),
    {
      success: true,
      data: {
        [textId]: "iPhone 色",
        [notesId]: "Salamat po!\n希望する色: 紫\t✓",
      },
    },
  );
});

test("text limits and unsafe controls are rejected at the appropriate question", () => {
  const form = definition([
    question("short_text", textId),
    question("long_text", notesId),
  ]);

  invalidAnswer(form, { [textId]: "x".repeat(201) }, textId);

  invalidAnswer(form, { [notesId]: "x".repeat(2001) }, notesId);

  invalidAnswer(form, { [textId]: "First\nSecond" }, textId);

  invalidAnswer(form, { [notesId]: "Text\u0000text" }, notesId);

  assert.equal(
    validateEnrollmentAnswers(form, {
      [textId]: "x".repeat(200),
      [notesId]: "x".repeat(2000),
    }).success,
    true,
  );
});

test("unknown answer IDs and wrong answer kinds are rejected even when optional", () => {
  const form = definition([
    question("short_text", textId),
    question("single_choice", choiceId),
    question("multiple_choice", multipleId),
  ]);

  invalidAnswer(form, { [notesId]: "Unexpected" }, notesId);

  invalidAnswer(form, { [textId]: [] }, textId);

  invalidAnswer(form, { [choiceId]: [] }, choiceId);

  invalidAnswer(form, { [multipleId]: firstOption }, multipleId);

  invalidAnswer(form, { [textId]: 123 }, textId);

  invalidAnswer(form, { [textId]: null }, textId);

  invalidAnswer(form, [], null);
});

test("choices must use original option IDs and never accept duplicates or new labels as answers", () => {
  const form = definition([
    question("single_choice", choiceId, true),
    question("multiple_choice", multipleId, true),
  ]);

  assert.deepEqual(
    validateEnrollmentAnswers(form, {
      [choiceId]: firstOption,
      [multipleId]: [firstOption, secondOption],
    }),
    {
      success: true,
      data: {
        [choiceId]: firstOption,
        [multipleId]: [firstOption, secondOption],
      },
    },
  );

  invalidAnswer(
    form,
    { [choiceId]: "First option", [multipleId]: [firstOption] },
    choiceId,
  );

  invalidAnswer(
    form,
    { [choiceId]: randomUUID(), [multipleId]: [firstOption] },
    choiceId,
  );

  invalidAnswer(
    form,
    { [choiceId]: firstOption, [multipleId]: [firstOption, firstOption] },
    multipleId,
  );

  invalidAnswer(
    form,
    { [choiceId]: firstOption, [multipleId]: [randomUUID()] },
    multipleId,
  );
});

test("answers remain valid when questions are reordered or relabeled in an independently copied definition", () => {
  const original = definition([
    question("short_text", textId, true),
    question("single_choice", choiceId, true),
  ]);

  const revised = structuredClone(original);

  revised.questions.reverse();

  revised.questions[0].label = "Renamed question";

  const answers = { [textId]: "Device preference", [choiceId]: secondOption };

  assert.deepEqual(
    validateEnrollmentAnswers(revised, answers),
    validateEnrollmentAnswers(original, answers),
  );

  assert.equal(original.questions[1].label, "A question");
});

test("bounded individual fields still respect the 64 KiB UTF-8 transport budget", () => {
  const questions = Array.from({ length: 30 }, () => {
    return question("long_text", randomUUID());
  });

  const answers = Object.fromEntries(
    questions.map((item) => {
      return [item.id, "界".repeat(1000)];
    }),
  );

  invalidAnswer(definition(questions), answers, null);

  const largeDefinition = definition(
    Array.from({ length: 30 }, () => {
      return {
        ...question("single_choice", randomUUID()),
        type: "single_choice" as const,
        options: Array.from({ length: 20 }, (_, index) => {
          return { id: randomUUID(), label: `${index}-${"界".repeat(140)}` };
        }),
      };
    }),
  );

  const parsed = enrollmentFormDefinitionSchema.safeParse(largeDefinition);

  assert.equal(parsed.success, false);

  if (!parsed.success) {
    assert.equal(parsed.error.issues.length, 1);

    assert.match(parsed.error.issues[0].message, /64 KiB/);
  }
});

test("forwarding preserves legacy linked members with blank phones while new applicants require a phone", () => {
  const contact = {
    version: 1,
    batchId: randomUUID(),
    name: "Existing member",
    email: "",
    phone: "",
  };

  assert.equal(
    enrollmentApplicationForwardSchema.safeParse({
      ...contact,
      memberId: randomUUID(),
    }).success,
    true,
  );

  assert.equal(
    enrollmentApplicationForwardSchema.safeParse(contact).success,
    false,
  );

  assert.equal(
    enrollmentApplicationForwardSchema.safeParse({
      ...contact,
      phone: "+639171234567",
    }).success,
    true,
  );

  assert.equal(
    enrollmentPublicSubmissionSchema.safeParse(submission({ phone: "" }))
      .success,
    false,
  );
});
