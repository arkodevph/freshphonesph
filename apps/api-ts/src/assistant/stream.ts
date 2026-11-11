import { assertSafeQuestion, serializeModelData } from "./guardrails";
import {
  readSseData,
  type AssistantQuestion,
  type AssistantReply,
  type AssistantStreamEvent,
} from "@freshphones/contracts";
import { answerFreshphones, freshphonesKnowledge } from "./knowledge";
import { freshphonesInstructions } from "./policy";

export async function* streamFreshphones(
  input: AssistantQuestion,
  options: { signal: AbortSignal; apiKey?: string; fetcher?: typeof fetch },
): AsyncGenerator<AssistantStreamEvent> {
  assertSafeQuestion(input.question);

  const guide = answerFreshphones(input);

  const key = options.apiKey ?? process.env.OPENROUTER_API_KEY;

  if (!key?.trim()) {
    yield { type: "complete", reply: guide };

    return;
  }

  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(20_000)]);

  const response = await (options.fetcher ?? fetch)(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-OpenRouter-Title": "Freshphones Fresh AI",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash-lite",
        max_tokens: 700,
        temperature: 0.2,
        stream: true,
        messages: [
          {
            role: "system",
            content: freshphonesInstructions.replace(
              /Return only a JSON object[^`]*$/,
              "Return 1 to 5 concise plain-text paragraphs. Do not return JSON or Markdown formatting.",
            ),
          },
          {
            role: "system",
            content: `Approved product knowledge: ${serializeModelData(freshphonesKnowledge)}`,
          },
          { role: "user", content: serializeModelData(input) },
        ],
      }),
    },
  );

  if (!response.ok || !response.body) {
    throw new Error("Provider unavailable");
  }

  let text = "";

  let finished = false;

  for await (const frame of readSseData(response.body)) {
    if (signal.aborted) {
      throw new Error("Stream aborted");
    }

    if (frame === "[DONE]") {
      break;
    }

    const data = JSON.parse(frame);

    if (data.error) {
      throw new Error("Provider unavailable");
    }

    const choice = data.choices?.[0];

    const content = choice?.delta?.content;

    if (typeof content === "string" && content) {
      text += content;

      if (text.length > 20_000) {
        throw new Error("Response exceeds the allowed size");
      }

      yield { type: "delta", text: content };
    }

    if (choice?.finish_reason) {
      if (choice.finish_reason !== "stop") {
        throw new Error("Incomplete response");
      }

      finished = true;
    }
  }

  if (!finished || !text.trim()) {
    throw new Error("Incomplete response");
  }

  const reply: AssistantReply = {
    ...guide,
    title: "Fresh AI",
    kind: guide.kind === "change-request" ? "change-request" : "knowledge",
    paragraphs: text.trim().split(/\n\s*\n/),
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

  yield { type: "complete", reply };
}
