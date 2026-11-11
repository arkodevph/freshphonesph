import { BadRequestException } from "@nestjs/common";

const credentialFields = new Set([
  "password",
  "passwordhash",
  "secret",
  "clientsecret",
  "apikey",
  "privatekey",
  "accesstoken",
  "refreshtoken",
  "sessiontoken",
  "token",
  "authorization",
  "cookie",
  "cookies",
  "headers",
  "totpsecret",
  "backupcodes",
]);

/** Best-effort credential minimization, not a classifier for every possible secret. */
export function redactModelText(text: string) {
  let result = text;

  for (const [name, value] of Object.entries(process.env)) {
    if (
      /KEY|SECRET|PASSWORD|TOKEN|DATABASE_URL|REDIS_URL/.test(name) &&
      value &&
      value.length >= 8
    ) {
      result = result.split(value).join("[REDACTED]");
    }
  }

  return result
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{12,}|ba_[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{20,})\b/g,
      "[REDACTED]",
    )
    .replace(
      /\b(password|client[_-]?secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*(?:"[^"\n]+"|'[^'\n]+'|[^\s,;]+)/gi,
      "$1=[REDACTED]",
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{12,}={0,2}/gi, "Bearer [REDACTED]")
    .replace(
      /\b(?:postgres(?:ql)?|mysql|redis|mongodb):\/\/[^\s/]+:[^@\s]+@[^\s"']+/gi,
      "[REDACTED]",
    );
}

export function assertSafeQuestion(question: string) {
  if (redactModelText(question) !== question) {
    throw new BadRequestException(
      "Remove passwords, API keys and access tokens from your question before sending it to Fresh AI.",
    );
  }
}

export function serializeModelData(value: unknown) {
  return redactModelText(
    JSON.stringify(value, (key, item) => {
      return credentialFields.has(key.replace(/[_-]/g, "").toLowerCase())
        ? "[REDACTED]"
        : typeof item === "string"
          ? redactModelText(item)
          : item;
    }) ?? "null",
  );
}

export class AssistantRunBudget {
  readonly signal: AbortSignal;
  private calls = 0;
  private bytes = 0;

  constructor(signal: AbortSignal) {
    this.signal = AbortSignal.any([signal, AbortSignal.timeout(90_000)]);
  }

  toolCall() {
    this.signal.throwIfAborted();

    if (++this.calls > 24) {
      throw new BadRequestException(
        "This request reached its tool limit. Narrow the search or ask for one change at a time.",
      );
    }
  }

  result(value: unknown) {
    this.signal.throwIfAborted();

    const serialized = serializeModelData(value);

    const text =
      Buffer.byteLength(serialized, "utf8") <= 30_000
        ? serialized
        : JSON.stringify({
            truncated: true,
            note: "Partial result only. Narrow the filters; do not compute complete totals from this excerpt.",
            excerpt: Buffer.from(serialized)
              .subarray(0, 12_000)
              .toString("utf8"),
          });

    this.bytes += Buffer.byteLength(text, "utf8");

    if (this.bytes > 120_000) {
      throw new BadRequestException(
        "This request reached its data limit. Narrow the date range or search filters.",
      );
    }

    return text;
  }
}

/** Bound loopback response consumption before parsing or sending data to a model. */
export async function readToolResponse(response: Response) {
  if (!response.body) {
    throw new BadRequestException("This operation returned no data.");
  }

  const reader = response.body.getReader();

  const chunks: Uint8Array[] = [];

  let bytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      bytes += value.byteLength;

      if (bytes > 1_000_000) {
        throw new BadRequestException(
          "This operation returned too much data. Narrow the search filters.",
        );
      }

      chunks.push(value);
    }

    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await reader.cancel();

    reader.releaseLock();
  }
}
