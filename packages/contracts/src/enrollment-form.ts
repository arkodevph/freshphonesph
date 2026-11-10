import { z } from "zod";

const singleLineControls = /[\u0000-\u001f\u007f]/;

const multilineControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const label = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine((value) => {
    return !singleLineControls.test(value);
  }, "Use a single line of text without control characters.");

const help = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    return !multilineControls.test(value);
  }, "Use text without control characters.");

const contactFieldSchema = z.object({ label, help }).strict();

const optionSchema = z.object({ id: z.string().uuid(), label }).strict();

const optionsSchema = z
  .array(optionSchema)
  .min(2)
  .max(20)
  .superRefine((options, context) => {
    const ids = new Set<string>();

    const labels = new Set<string>();

    for (const [index, option] of options.entries()) {
      const id = option.id.toLowerCase();

      const key = option.label.normalize("NFKC").toLocaleLowerCase("en");

      if (ids.has(id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "Each option needs a distinct ID.",
        });
      }

      if (labels.has(key)) {
        context.addIssue({
          code: "custom",
          path: [index, "label"],
          message: "Each option needs a distinct label.",
        });
      }

      ids.add(id);

      labels.add(key);
    }
  });

const questionFields = {
  id: z.string().uuid(),
  label,
  help,
  required: z.boolean(),
};

export const enrollmentFormQuestionSchema = z.discriminatedUnion("type", [
  z.object({ ...questionFields, type: z.literal("short_text") }).strict(),
  z.object({ ...questionFields, type: z.literal("long_text") }).strict(),
  z
    .object({
      ...questionFields,
      type: z.literal("single_choice"),
      options: optionsSchema,
    })
    .strict(),
  z
    .object({
      ...questionFields,
      type: z.literal("multiple_choice"),
      options: optionsSchema,
    })
    .strict(),
]);

export const enrollmentFormDefinitionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine((value) => {
        return !singleLineControls.test(value);
      }, "Use a single line of text without control characters."),
    description: z
      .string()
      .trim()
      .max(1000)
      .refine((value) => {
        return !multilineControls.test(value);
      }, "Use text without control characters."),
    contact: z
      .object({
        name: contactFieldSchema,
        phone: contactFieldSchema,
        email: contactFieldSchema,
      })
      .strict(),
    questions: z
      .array(enrollmentFormQuestionSchema)
      .max(30)
      .superRefine((questions, context) => {
        const ids = new Set<string>();

        for (const [index, question] of questions.entries()) {
          const id = question.id.toLowerCase();

          if (ids.has(id)) {
            context.addIssue({
              code: "custom",
              path: [index, "id"],
              message: "Each question needs a distinct ID.",
            });
          }

          ids.add(id);
        }
      }),
  })
  .strict()
  .superRefine((definition, context) => {
    if (
      new TextEncoder().encode(JSON.stringify(definition)).byteLength > 65536
    ) {
      context.addIssue({
        code: "custom",
        message: "Keep the form definition within 64 KiB.",
      });
    }
  });

/** Broad transport shape; validate against the submitted immutable revision too. */
export const enrollmentAnswersSchema = z
  .record(
    z.string().uuid(),
    z.union([z.string().max(2000), z.array(z.string().uuid()).max(20)]),
  )
  .superRefine((answers, context) => {
    if (new TextEncoder().encode(JSON.stringify(answers)).byteLength > 65536) {
      context.addIssue({
        code: "custom",
        message: "Keep all answers within 64 KiB.",
      });
    }

    if (Object.keys(answers).length > 30) {
      context.addIssue({
        code: "custom",
        message: "Submit answers for at most 30 questions.",
      });
    }
  });

export const enrollmentPublicSubmissionSchema = z
  .object({
    submissionId: z.string().uuid(),
    revisionId: z.string().uuid(),
    name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .refine((value) => {
        return !singleLineControls.test(value);
      }, "Use a single line of text without control characters."),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9 ()-]{7,25}$/, "Enter a valid contact number.")
      .refine((value) => {
        return /[0-9]/.test(value);
      }, "Enter a valid contact number."),
    email: z
      .string()
      .trim()
      .max(254)
      .pipe(z.union([z.string().email(), z.literal("")]))
      .transform((value) => {
        return value.toLowerCase();
      })
      .default(""),
    contactAcknowledged: z.literal(true),
    answers: enrollmentAnswersSchema,
  })
  .strict();

export type EnrollmentFormDefinition = z.infer<
  typeof enrollmentFormDefinitionSchema
>;

export type EnrollmentFormQuestion = z.infer<
  typeof enrollmentFormQuestionSchema
>;

export type EnrollmentAnswers = z.infer<typeof enrollmentAnswersSchema>;

export type EnrollmentPublicSubmission = z.infer<
  typeof enrollmentPublicSubmissionSchema
>;

export type EnrollmentAnswerIssue = {
  questionId: string | null;
  message: string;
};

export type EnrollmentAnswerValidation =
  | { success: true; data: EnrollmentAnswers }
  | { success: false; issues: EnrollmentAnswerIssue[] };

/** Validate answer IDs and kinds using the definition of the submitted revision. */
export function validateEnrollmentAnswers(
  definition: EnrollmentFormDefinition,
  answers: unknown,
): EnrollmentAnswerValidation {
  const parsed = enrollmentAnswersSchema.safeParse(answers);

  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => {
        return {
          questionId: typeof issue.path[0] === "string" ? issue.path[0] : null,
          message: issue.message,
        };
      }),
    };
  }

  const issues: EnrollmentAnswerIssue[] = [];

  const data: EnrollmentAnswers = {};

  const questions = new Map(
    definition.questions.map((question) => {
      return [question.id, question];
    }),
  );

  for (const id of Object.keys(parsed.data)) {
    if (!questions.has(id)) {
      issues.push({
        questionId: id,
        message: "This question is not in the form.",
      });
    }
  }

  for (const question of definition.questions) {
    const value = parsed.data[question.id];

    const issue = (message: string) => {
      issues.push({ questionId: question.id, message });
    };

    if (value === undefined) {
      if (question.required) {
        issue("Answer this required question.");
      }

      continue;
    }

    if (question.type === "short_text" || question.type === "long_text") {
      if (typeof value !== "string") {
        issue("Enter a text answer.");

        continue;
      }

      const text = value.trim();

      const controls =
        question.type === "short_text" ? singleLineControls : multilineControls;

      const limit = question.type === "short_text" ? 200 : 2000;

      if (text.length > limit) {
        issue(`Use at most ${limit} characters.`);
      } else if (controls.test(text)) {
        issue("Use text without control characters.");
      } else if (!text && question.required) {
        issue("Answer this required question.");
      } else if (text) {
        data[question.id] = text;
      }

      continue;
    }

    const options = new Set(
      question.options.map((option) => {
        return option.id;
      }),
    );

    if (question.type === "single_choice") {
      if (typeof value !== "string") {
        issue("Choose one option.");
      } else if (!value) {
        if (question.required) {
          issue("Choose one option.");
        }
      } else if (!options.has(value)) {
        issue("Choose an option from this form.");
      } else {
        data[question.id] = value;
      }

      continue;
    }

    if (!Array.isArray(value)) {
      issue("Choose options using a list.");
    } else if (value.length !== new Set(value).size) {
      issue("Choose each option only once.");
    } else if (
      value.some((option) => {
        return !options.has(option);
      })
    ) {
      issue("Choose options from this form.");
    } else if (!value.length && question.required) {
      issue("Choose at least one option.");
    } else if (value.length) {
      data[question.id] = value;
    }
  }

  return issues.length ? { success: false, issues } : { success: true, data };
}

export const defaultEnrollmentFormDefinition: EnrollmentFormDefinition = {
  title: "Membership application",
  description:
    "Tell us how to contact you and which device you are interested in. Fresh Phones PH will review your application and discuss available batches with you.",
  contact: {
    name: {
      label: "Full name",
      help: "Enter the name you use for your application.",
    },
    phone: { label: "Contact number", help: "Where can our team contact you?" },
    email: {
      label: "Email address",
      help: "Optional. You may leave this blank.",
    },
  },
  questions: [
    {
      id: "b74c55b1-2efa-4a14-9a16-4244c7655ec0",
      type: "short_text",
      label: "Preferred device",
      help: "Optional. Tell us the model you are interested in.",
      required: false,
    },
    {
      id: "a1cbe286-b092-4434-a3c6-2d4598db701a",
      type: "long_text",
      label: "Additional notes",
      help: "Optional. Add anything you want the team to know about your application.",
      required: false,
    },
  ],
};

export const enrollmentApplicationStatuses = [
  "RECEIVED",
  "FORWARDED",
  "CLOSED",
] as const;

export type EnrollmentApplicationStatus =
  (typeof enrollmentApplicationStatuses)[number];

export const enrollmentFormUpdateSchema = z
  .object({
    version: z.number().int().min(0),
    definition: enrollmentFormDefinitionSchema,
    receivingAgentId: z.string().uuid().nullable(),
  })
  .strict();

export const enrollmentFormPublishSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export const enrollmentApplicationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    status: z.enum(enrollmentApplicationStatuses).optional(),
    q: z.string().trim().max(100).default(""),
    applicationId: z.string().uuid().optional(),
  })
  .strict();

export const enrollmentApplicationForwardSchema = z
  .object({
    version: z.number().int().positive(),
    batchId: z.string().uuid(),
    memberId: z.string().uuid().optional(),
    name: enrollmentPublicSubmissionSchema.shape.name,
    email: enrollmentPublicSubmissionSchema.shape.email,
    phone: z
      .string()
      .trim()
      .regex(/^$|^[+0-9 ()-]{7,25}$/, "Enter a valid contact number."),
  })
  .strict()
  .refine(
    (input) => {
      return Boolean(input.memberId) || input.phone.length > 0;
    },
    { message: "Enter a contact number for a new member.", path: ["phone"] },
  );

export const enrollmentApplicationCloseSchema = z
  .object({
    version: z.number().int().positive(),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();

export const enrollmentApplicationAssignSchema = z
  .object({
    version: z.number().int().positive(),
    agentId: z.string().uuid(),
  })
  .strict();

export type EnrollmentFormUpdate = z.infer<typeof enrollmentFormUpdateSchema>;

export type EnrollmentApplicationQuery = z.infer<
  typeof enrollmentApplicationQuerySchema
>;

export type EnrollmentApplicationForward = z.infer<
  typeof enrollmentApplicationForwardSchema
>;

export type PublishedEnrollmentForm = {
  revisionId: string;
  revisionNumber: number;
  definition: EnrollmentFormDefinition;
};

export type EnrollmentFormConfig = {
  version: number;
  definition: EnrollmentFormDefinition;
  receivingAgentId: string | null;
  published: { revisionId: string; revisionNumber: number } | null;
  agents: { id: string; name: string; agentCode: string }[];
  updatedAt: string | null;
};

export type PublicEnrollmentApplication = {
  id: string;
  createdAt: string;
  status: EnrollmentApplicationStatus;
  version: number;
  assignedAgent: { id: string; name: string };
  contact: { name: string; email: string; phone: string };
  revision: {
    id: string;
    number: number;
    definition: EnrollmentFormDefinition;
  };
  answers: EnrollmentAnswers;
  enrollmentRequest: {
    id: string;
    status: string;
    clientId: string | null;
  } | null;
  closeReason: string;
};
