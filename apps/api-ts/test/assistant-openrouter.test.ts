import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ServiceUnavailableException } from "@nestjs/common";
import { answerWithOpenRouter } from "../src/assistant/openrouter";

test("OpenRouter receives bounded approved knowledge; model cannot supply tools or links", async () => {
  const reply = await answerWithOpenRouter(
    { question: "Explain verified payments", period: "November" },
    {
      apiKey: "test-key",
      fetcher: async (url, options) => {
        assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");

        const body = JSON.parse(String(options?.body));

        assert.equal(body.model, "google/gemini-2.5-flash-lite");

        assert.equal(body.max_tokens, 700);

        assert.equal(body.response_format.type, "json_schema");

        assert.equal(body.response_format.json_schema.strict, true);

        assert.equal(body.tools, undefined);

        assert.equal(body.messages.length, 3);

        assert.match(body.messages[0].content, /connected API tools/);

        assert.match(body.messages[1].content, /Finance-verified/);

        assert.doesNotMatch(JSON.stringify(body), /test-key/);

        assert.ok(options?.signal);

        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  paragraphs: [
                    "Only Finance-verified payments affect balances.",
                  ],
                }),
              },
            },
          ],
        });
      },
    },
  );

  assert.equal(reply.policy.providerConnected, true);

  assert.equal(reply.policy.canExecuteChanges, false);

  assert.deepEqual(reply.links, []);
});

test("missing key never spends tokens", async () => {
  const fetcher: typeof fetch = async () => {
    throw new Error("Must not call provider");
  };

  assert.equal(
    (
      await answerWithOpenRouter(
        { question: "Payments" },
        { apiKey: "", fetcher },
      )
    ).policy.providerConnected,
    false,
  );

  assert.equal(
    (
      await answerWithOpenRouter(
        { question: "Delete payments" },
        { apiKey: "", fetcher },
      )
    ).kind,
    "change-request",
  );
});

test("provider failures, truncation and invalid output return sanitized errors", async () => {
  for (const fetcher of [
    async () => {
      return new Response("private-provider-error", { status: 429 });
    },
    async () => {
      throw new Error("private-provider-error");
    },
    async () => {
      return Response.json({
        choices: [{ finish_reason: "length", message: { content: "{}" } }],
      });
    },
    async () => {
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: '{"paragraphs":[],"tools":["delete"]}' },
          },
        ],
      });
    },
    async () => {
      return Response.json({
        choices: [
          { finish_reason: "stop", message: { content: "invalid-json" } },
        ],
      });
    },
  ]) {
    await assert.rejects(
      answerWithOpenRouter(
        { question: "Payments" },
        { apiKey: "test-key", fetcher },
      ),
      (error: unknown) => {
        assert.ok(error instanceof ServiceUnavailableException);

        assert.doesNotMatch(error.message, /private-provider-error|test-key/);

        return true;
      },
    );
  }
});

test("connected batch requests receive a conversational model answer without action tools", async () => {
  let calls = 0;

  const reply = await answerWithOpenRouter(
    { question: "can u add a batch?" },
    {
      apiKey: "test-key",
      fetcher: async (_url, options) => {
        calls++;

        const body = JSON.parse(String(options?.body));

        assert.equal(body.tools, undefined);

        assert.match(body.messages[0].content, /greetings/i);

        assert.doesNotMatch(body.messages[1].content, /provider is pending/i);

        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  paragraphs: [
                    "I can help you plan a batch, but I can't create it from chat. What kind of batch are you setting up?",
                  ],
                }),
              },
            },
          ],
        });
      },
    },
  );

  assert.equal(calls, 1);

  assert.equal(reply.kind, "change-request");

  assert.equal(reply.policy.providerConnected, true);

  assert.equal(reply.policy.canExecuteChanges, false);

  assert.match(reply.paragraphs.join(" "), /can't create it from chat/);
});
