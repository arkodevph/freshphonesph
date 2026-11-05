import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultEnrollmentFormDefinition,
  type EnrollmentFormDefinition,
} from "@freshphones/contracts";
import {
  enrollmentErrorStep,
  enrollmentStepErrors,
  publicEnrollmentSteps,
} from "../lib/public-enrollment-steps";

const contact = {
  name: "Synthetic applicant",
  phone: "09170000000",
  email: "",
};

function form(): EnrollmentFormDefinition {
  return structuredClone(defaultEnrollmentFormDefinition);
}

test("contact details advance independently of unanswered application questions", () => {
  const definition = form();

  definition.questions[0]!.required = true;

  assert.deepEqual(
    enrollmentStepErrors("contact", definition, contact, {}),
    {},
  );

  const errors = enrollmentStepErrors(
    "contact",
    definition,
    { name: " ", phone: "invalid", email: "wrong" },
    {},
  );

  assert.deepEqual(Object.keys(errors).sort(), ["email", "name", "phone"]);

  assert.equal(errors[definition.questions[0]!.id], undefined);
});

test("contact validation shares the submission limits and accepts an optional empty email", () => {
  assert.deepEqual(enrollmentStepErrors("contact", form(), contact, {}), {});

  for (const phone of ["-------", "0917abc0000", "1".repeat(26)]) {
    assert.ok(
      enrollmentStepErrors("contact", form(), { ...contact, phone }, {}).phone,
    );
  }

  assert.ok(
    enrollmentStepErrors(
      "contact",
      form(),
      { ...contact, name: "a".repeat(101) },
      {},
    ).name,
  );
});

test("application step permits optional answers but enforces published required questions", () => {
  const definition = form();

  assert.deepEqual(
    enrollmentStepErrors("questions", definition, contact, {}),
    {},
  );

  definition.questions[0]!.required = true;

  const id = definition.questions[0]!.id;

  assert.ok(enrollmentStepErrors("questions", definition, contact, {})[id]);

  assert.deepEqual(
    enrollmentStepErrors("questions", definition, contact, { [id]: "iPhone" }),
    {},
  );
});

test("choice validation rejects missing or stale options before review", () => {
  const definition = form();

  const id = "f6df35b0-dc9b-41f3-8d63-7f6e990ea5a9";

  const selected = "c1d46101-825d-44de-ad15-e4ef3b8b0cbf";

  definition.questions = [
    {
      id,
      label: "Preferred contact",
      help: "",
      required: true,
      type: "multiple_choice",
      options: [
        { id: selected, label: "Phone" },
        { id: "a629a418-7bda-4e02-8519-2844819156c9", label: "Email" },
      ],
    },
  ];

  assert.ok(enrollmentStepErrors("questions", definition, contact, {})[id]);

  assert.ok(
    enrollmentStepErrors("questions", definition, contact, {
      [id]: ["00000000-0000-4000-8000-000000000000"],
    })[id],
  );

  assert.deepEqual(
    enrollmentStepErrors("questions", definition, contact, {
      [id]: [selected],
    }),
    {},
  );
});

test("forms without custom questions go straight to review", () => {
  const definition = form();

  assert.deepEqual(publicEnrollmentSteps(definition), [
    "contact",
    "questions",
    "review",
  ]);

  definition.questions = [];

  assert.deepEqual(publicEnrollmentSteps(definition), ["contact", "review"]);
});

test("review error links return to the correct contact, custom-answer or consent stage", () => {
  const definition = form();

  for (const key of ["name", "phone", "email"]) {
    assert.equal(enrollmentErrorStep(key, definition), "contact");
  }

  assert.equal(
    enrollmentErrorStep(definition.questions[0]!.id, definition),
    "questions",
  );

  assert.equal(
    enrollmentErrorStep("contactAcknowledged", definition),
    "review",
  );

  assert.equal(enrollmentErrorStep("_form", definition), "review");
});
