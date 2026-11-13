import { assertSafeQuestion, serializeModelData } from "./guardrails";
import { ServiceUnavailableException } from "@nestjs/common";
import type { AssistantQuestion, AssistantReply } from "@freshphones/contracts";
import { z } from "zod";
import { answerFreshphones, freshphonesKnowledge } from "./knowledge";
import { freshphonesInstructions } from "./policy";

const generatedAnswer = z
  .object({
    paragraphs: z.array(z.string().trim().min(1).max(4000)).min(1).max(5),
  })
  .strict();

export async function answerWithOpenRouter(
  input: AssistantQuestion,
  options: { apiKey?: string; model?: string; fetcher?: typeof fetch } = {},
): Promise<AssistantReply> {
  assertSafeQuestion(input.question);

  const guide = answerFreshphones(input);

  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;

  // The model can explain any request, but has no execution tools.
  if (!apiKey?.trim()) {
    return guide;
  }

  let stage = "request";

  let status: number | undefined;

  try {
    const response = await (options.fetcher ?? fetch)(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "Freshphones Cloud",
        },
        body: JSON.stringify({
          model:
            options.model ??
            process.env.OPENROUTER_MODEL ??
            "google/gemini-2.5-flash-lite",
          max_tokens: 700,
          temperature: 0.2,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "freshphones_answer",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  paragraphs: { type: "array", items: { type: "string" } },
                },
                required: ["paragraphs"],
                additionalProperties: false,
              },
            },
          },
          messages: [
            { role: "system", content: freshphonesInstructions },
            {
              role: "system",
              content: `Approved product knowledge: ${serializeModelData(freshphonesKnowledge)}`,
            },
            { role: "user", content: serializeModelData(input) },
          ],
        }),
      },
    );

    status = response.status;

    stage = "provider-status";

    if (!response.ok) {
      throw new Error("Provider unavailable");
    }

    stage = "response-validation";

    const envelope = z
      .object({
        choices: z
          .array(
            z.object({
              finish_reason: z.string(),
              message: z.object({ content: z.string() }),
            }),
          )
          .min(1),
      })
      .parse(await response.json());

    const choice = envelope.choices[0];

    if (choice.finish_reason !== "stop") {
      throw new Error("Incomplete provider response");
    }

    const answer = generatedAnswer.parse(JSON.parse(choice.message.content));

    return {
      ...guide,
      kind: guide.kind === "change-request" ? "change-request" : "knowledge",
      title: "Cloud guidance",
      paragraphs: answer.paragraphs,
      sources: guide.sources.length
        ? ["Curated Freshphones product guidance"]
        : [],
      links:
        /\b(reports?|collections|balances?|sales|earnings|reconciliation)\b/i.test(
          input.question,
        )
          ? guide.links
          : [],
      policy: { ...guide.policy, providerConnected: true },
    };
  } catch {
    console.warn("Cloud provider request failed", { stage, status });

    // Never return provider errors: they may contain credentials or request data.
    throw new ServiceUnavailableException(
      "Cloud could not reach its model or receive a complete answer. Please try again shortly.",
    );
  }
}
