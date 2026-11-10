import {
  enrollmentPublicSubmissionSchema,
  validateEnrollmentAnswers,
  type EnrollmentAnswers,
  type EnrollmentFormDefinition,
} from "@freshphones/contracts";

export type EnrollmentStep = "contact" | "questions" | "review";

export type EnrollmentStepContact = {
  name: string;
  phone: string;
  email: string;
};

const contactSchema = enrollmentPublicSubmissionSchema.pick({
  name: true,
  phone: true,
  email: true,
});

export function publicEnrollmentSteps(
  definition: EnrollmentFormDefinition,
): EnrollmentStep[] {
  return definition.questions.length
    ? ["contact", "questions", "review"]
    : ["contact", "review"];
}

export function enrollmentStepErrors(
  step: EnrollmentStep,
  definition: EnrollmentFormDefinition,
  contact: EnrollmentStepContact,
  answers: EnrollmentAnswers,
) {
  const errors: Record<string, string> = {};

  if (step === "contact") {
    const result = contactSchema.safeParse(contact);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors[String(issue.path[0] ?? "_form")] ??= issue.message;
      }
    }
  }

  if (step === "questions") {
    const result = validateEnrollmentAnswers(definition, answers);

    if (!result.success) {
      for (const issue of result.issues) {
        errors[issue.questionId ?? "_form"] ??= issue.message;
      }
    }
  }

  return errors;
}

export function enrollmentErrorStep(
  key: string,
  definition: EnrollmentFormDefinition,
): EnrollmentStep {
  if (["name", "phone", "email"].includes(key)) {
    return "contact";
  }

  return definition.questions.some((question) => {
    return question.id === key;
  })
    ? "questions"
    : "review";
}
