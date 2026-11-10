import type {
  EnrollmentAnswers,
  EnrollmentFormConfig,
  EnrollmentFormDefinition,
  EnrollmentFormQuestion,
  EnrollmentPublicSubmission,
  Page,
  PublishedEnrollmentForm,
  PublicEnrollmentApplication,
} from "@freshphones/contracts";
import { API_URL } from "./backend";
import { tsRequest } from "./ts-api";

export class EnrollmentPublicError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly issues: { questionId: string | null; message: string }[] = [],
  ) {
    super(message);
  }
}

async function publicRequest<T>(
  path: string,
  input?: EnrollmentPublicSubmission,
): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    method: input ? "POST" : "GET",
    credentials: "omit",
    cache: "no-store",
    ...(input
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      : {}),
  });

  const data = await response.json().catch(() => {
    return {};
  });

  if (!response.ok) {
    const code =
      typeof data.code === "string"
        ? data.code
        : typeof data.message === "string"
          ? data.message
          : undefined;

    throw new EnrollmentPublicError(
      response.status === 409 && code?.includes("FORM_VERSION_CHANGED")
        ? "The application form has been updated. Review the new questions before submitting."
        : response.status === 404
          ? "Applications are not available right now. Please check back or contact the team."
          : response.status === 413
            ? "Your answers are too long in total. Shorten them and try again. Your current answers are still here."
            : response.status === 429
              ? "Too many attempts. Please wait before trying again. Your answers are still here."
              : response.status === 400
                ? "Please check your details and answers, then try again."
                : "We couldn’t complete this request. Your answers are still here. Please try again.",
      response.status,
      code,
      Array.isArray(data.issues)
        ? data.issues.filter(
            (
              issue: unknown,
            ): issue is { questionId: string | null; message: string } => {
              return Boolean(
                issue &&
                typeof issue === "object" &&
                "message" in issue &&
                typeof issue.message === "string" &&
                "questionId" in issue &&
                (issue.questionId === null ||
                  typeof issue.questionId === "string"),
              );
            },
          )
        : [],
    );
  }

  return data as T;
}

export function getPublishedEnrollmentForm() {
  return publicRequest<PublishedEnrollmentForm>("/public/enrollment-form");
}

export function submitPublicEnrollment(input: EnrollmentPublicSubmission) {
  return publicRequest<{ reference: string }>(
    "/public/enrollment-applications",
    input,
  );
}

export function getEnrollmentFormConfig() {
  return tsRequest<EnrollmentFormConfig>("/enrollment/form");
}

export function saveEnrollmentForm(input: {
  version: number;
  definition: EnrollmentFormDefinition;
  receivingAgentId: string | null;
}) {
  return tsRequest<EnrollmentFormConfig>("/enrollment/form", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function publishEnrollmentForm(version: number) {
  return tsRequest<EnrollmentFormConfig>("/enrollment/form/publish", {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}

export function listEnrollmentApplications(query: {
  page: number;
  q?: string;
  status?: string;
  applicationId?: string;
}) {
  const params = new URLSearchParams({
    page: String(query.page),
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.applicationId ? { applicationId: query.applicationId } : {}),
  });

  return tsRequest<Page<PublicEnrollmentApplication>>(
    `/enrollment/applications?${params}`,
  );
}

export function getEnrollmentApplication(id: string) {
  return tsRequest<PublicEnrollmentApplication>(
    `/enrollment/applications/${encodeURIComponent(id)}`,
  );
}

export function forwardEnrollmentApplication(
  id: string,
  input: {
    version: number;
    batchId: string;
    memberId?: string;
    name: string;
    email: string;
    phone: string;
  },
) {
  return tsRequest<{ id: string; status: string; version: number }>(
    `/enrollment/applications/${encodeURIComponent(id)}/forward`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function closeEnrollmentApplication(
  id: string,
  version: number,
  reason: string,
) {
  return tsRequest<PublicEnrollmentApplication>(
    `/enrollment/applications/${encodeURIComponent(id)}/close`,
    { method: "POST", body: JSON.stringify({ version, reason }) },
  );
}

export function assignEnrollmentApplication(
  id: string,
  version: number,
  agentId: string,
) {
  return tsRequest<PublicEnrollmentApplication>(
    `/enrollment/applications/${encodeURIComponent(id)}/assign`,
    { method: "POST", body: JSON.stringify({ version, agentId }) },
  );
}

export type EnrollmentBatchChoice = { id: string; code: string; model: string };

export type EnrollmentMemberChoice = {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  batch: { code: string };
};

export function getEnrollmentBatchChoices() {
  return tsRequest<EnrollmentBatchChoice[]>("/enrollment/batches");
}

export function findEnrollmentMembers(query: string) {
  return tsRequest<EnrollmentMemberChoice[]>(
    `/enrollment/members?q=${encodeURIComponent(query.trim())}`,
  );
}

export function enrollmentAnswerText(
  question: EnrollmentFormQuestion,
  answer: string | string[] | undefined,
) {
  if (
    answer === undefined ||
    answer === "" ||
    (Array.isArray(answer) && !answer.length)
  ) {
    return "Not answered";
  }

  if (question.type === "short_text" || question.type === "long_text") {
    return typeof answer === "string" ? answer : "Not answered";
  }

  const values = Array.isArray(answer) ? answer : [answer];

  return values
    .map((id) => {
      return (
        question.options.find((option) => {
          return option.id === id;
        })?.label ?? "Option not available"
      );
    })
    .join(", ");
}

function questionFingerprint(question: EnrollmentFormQuestion) {
  return JSON.stringify({
    id: question.id,
    type: question.type,
    label: question.label,
    help: question.help,
    required: question.required,
    ...("options" in question
      ? {
          options: question.options.map((option) => {
            return { id: option.id, label: option.label };
          }),
        }
      : {}),
  });
}

/** Carry an answer only when its question and all choice definitions are unchanged. */
export function migrateEnrollmentAnswers(
  previous: EnrollmentFormDefinition,
  next: EnrollmentFormDefinition,
  answers: EnrollmentAnswers,
) {
  const carried: EnrollmentAnswers = {};

  const previousAnswers: { id: string; label: string; value: string }[] = [];

  for (const question of previous.questions) {
    const answer = answers[question.id];

    if (
      answer === undefined ||
      answer === "" ||
      (Array.isArray(answer) && !answer.length)
    ) {
      continue;
    }

    const current = next.questions.find((item) => {
      return item.id === question.id;
    });

    if (
      current &&
      questionFingerprint(current) === questionFingerprint(question)
    ) {
      carried[question.id] = Array.isArray(answer) ? [...answer] : answer;
    } else {
      previousAnswers.push({
        id: question.id,
        label: question.label,
        value: enrollmentAnswerText(question, answer),
      });
    }
  }

  return { answers: carried, previousAnswers };
}

export type EnrollmentSubmissionAttempt = { fingerprint: string; id: string };

/** Network retries reuse an ID; editing the submitted payload starts another attempt. */
export function enrollmentSubmissionAttempt(
  previous: EnrollmentSubmissionAttempt | null,
  payload: Omit<EnrollmentPublicSubmission, "submissionId">,
): EnrollmentSubmissionAttempt {
  const fingerprint = JSON.stringify(payload);

  return previous?.fingerprint === fingerprint
    ? previous
    : { fingerprint, id: crypto.randomUUID() };
}
