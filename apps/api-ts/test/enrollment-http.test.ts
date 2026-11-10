import { test } from "node:test";
import assert from "node:assert/strict";
import { HttpException, type ArgumentsHost } from "@nestjs/common";
import { Errors } from "../src/http";

function filtered(status: number, body: object) {
  let result: unknown;

  let responseStatus: number | undefined;

  const response = {
    headersSent: false,
    status(value: number) {
      responseStatus = value;

      return response;
    },
    json(value: unknown) {
      result = value;

      return response;
    },
  };

  new Errors().catch(new HttpException(body, status), {
    switchToHttp() {
      return {
        getResponse() {
          return response;
        },
      };
    },
  } as ArgumentsHost);

  return { status: responseStatus, body: result };
}

test("stale enrollment form exposes its actionable code without arbitrary exception data", () => {
  assert.deepEqual(
    filtered(409, {
      message: "Review the updated form",
      code: "FORM_VERSION_CHANGED",
      privateContact: "secret@example.test",
    }),
    {
      status: 409,
      body: {
        message: "Review the updated form",
        code: "FORM_VERSION_CHANGED",
      },
    },
  );
});

test("enrollment answer failures expose bounded question errors only", () => {
  const issues = [
    {
      questionId: "05cc5b76-2eaf-457b-90b8-1fbfc6fc5f84",
      message: "Answer this required question.",
    },
  ];

  assert.deepEqual(
    filtered(400, {
      message: "Review your answers",
      code: "ENROLLMENT_ANSWERS_INVALID",
      issues,
      privateAnswer: "private",
    }),
    {
      status: 400,
      body: {
        message: "Review your answers",
        code: "ENROLLMENT_ANSWERS_INVALID",
        issues,
      },
    },
  );
});

test("wrong status, unknown codes and malformed payloads retain existing safe errors", () => {
  for (const [status, body] of [
    [
      403,
      { message: "No access", code: "FORM_VERSION_CHANGED", secret: "private" },
    ],
    [409, { message: "Conflict", code: "UNKNOWN_CODE", secret: "private" }],
    [
      400,
      {
        message: "Invalid",
        code: "ENROLLMENT_ANSWERS_INVALID",
        issues: [{ questionId: "invalid", message: "private" }],
      },
    ],
  ] as const) {
    assert.deepEqual(filtered(status, body), {
      status,
      body: { message: body.message },
    });
  }
});
