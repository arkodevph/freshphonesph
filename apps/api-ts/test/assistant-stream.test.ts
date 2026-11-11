import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assistantQuestionSchema,
  isAssistantReportRequest,
  readSseData,
} from "@freshphones/contracts";
import { streamFreshphones } from "../src/assistant/stream";

const body = (text: string, size = 1) => {
  const bytes = new TextEncoder().encode(text);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += size) {
        controller.enqueue(bytes.slice(i, i + size));
      }

      controller.close();
    },
  });
};

const collect = async <T>(events: AsyncIterable<T>) => {
  const values: T[] = [];

  for await (const event of events) {
    values.push(event);
  }

  return values;
};

test("SSE parser preserves UTF-8 and CRLF across arbitrary network chunks", async () => {
  assert.deepEqual(
    await collect(
      readSseData(
        body(
          ': heartbeat\r\n\r\ndata: {"text":"Kumusta 🌱"}\r\n\r\ndata: [DONE]\r\n\r\n',
        ),
      ),
    ),
    ['{"text":"Kumusta 🌱"}', "[DONE]"],
  );

  await assert.rejects(
    collect(readSseData(body("data: incomplete"))),
    /incomplete frame/,
  );
});

test("provider text streams immediately and only a completed response produces final metadata", async () => {
  const events = await collect(
    streamFreshphones(
      { question: "hey" },
      {
        signal: new AbortController().signal,
        apiKey: "test-key",
        fetcher: async (_url, options) => {
          const input = JSON.parse(String(options?.body));

          assert.equal(input.stream, true);

          assert.equal(input.response_format, undefined);

          assert.equal(input.tools, undefined);

          assert.doesNotMatch(input.messages[0].content, /Return only a JSON/);

          const data =
            [
              {
                choices: [
                  {
                    delta: {
                      reasoning: "private reasoning",
                      content: "Hello ",
                    },
                  },
                ],
              },
              {
                choices: [{ delta: { content: "🌱" }, finish_reason: "stop" }],
              },
            ]
              .map((x) => {
                return `data: ${JSON.stringify(x)}\n\n`;
              })
              .join("") + "data: [DONE]\n\n";

          return new Response(body(data), {
            headers: { "Content-Type": "text/event-stream" },
          });
        },
      },
    ),
  );

  assert.equal(events[0].type, "delta");

  assert.doesNotMatch(JSON.stringify(events), /private reasoning|test-key/);

  const complete = events.at(-1);

  assert.equal(complete?.type, "complete");

  if (complete?.type === "complete") {
    assert.deepEqual(complete.reply.paragraphs, ["Hello 🌱"]);

    assert.equal(complete.reply.policy.canExecuteChanges, false);
  }
});

test("truncation and provider errors cannot appear as completed answers", async () => {
  for (const data of [
    'data: {"choices":[{"delta":{"content":"Partial"},"finish_reason":"length"}]}\n\n',
    'data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n',
    'data: {"error":{"message":"private detail"}}\n\n',
  ]) {
    await assert.rejects(
      collect(
        streamFreshphones(
          { question: "Payments" },
          {
            signal: new AbortController().signal,
            apiKey: "test-key",
            fetcher: async () => {
              return new Response(body(data));
            },
          },
        ),
      ),
    );
  }
});

test("summary intent and report periods are explicit, bounded and cannot carry private records", () => {
  for (const question of [
    "Can you summarize all reports to m",
    "Give a business overview",
    "Summarize payment performance",
  ]) {
    assert.equal(isAssistantReportRequest(question), true);
  }

  for (const question of [
    "What is a report?",
    "How do payments work?",
    "hey",
  ]) {
    assert.equal(isAssistantReportRequest(question), false);
  }

  for (const reportRange of [
    { dateFrom: "2026-11-06", dateTo: "2026-01-01" },
    { dateFrom: "2020-01-01", dateTo: "2026-01-01" },
    { dateFrom: "2026-02-30", dateTo: "2026-03-01" },
    { dateFrom: "2026-01-01", dateTo: "2026-02-01", records: [] },
  ]) {
    assert.equal(
      assistantQuestionSchema.safeParse({ question: "Summary", reportRange })
        .success,
      false,
    );
  }
});
