/** Read SSE data frames without assuming network chunks align with lines or UTF-8 characters. */
export async function* readSseData(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();

  const decoder = new TextDecoder();

  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });

      if (buffer.length > 131_072) {
        throw new Error("Event frame exceeds the allowed size.");
      }

      let boundary: RegExpExecArray | null;

      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);

        buffer = buffer.slice(boundary.index + boundary[0].length);

        const data = frame
          .split(/\r?\n/)
          .filter((line) => {
            return line.startsWith("data:");
          })
          .map((line) => {
            return line.slice(5).replace(/^ /, "");
          })
          .join("\n");

        if (data) {
          yield data;
        }
      }

      if (done) {
        if (buffer.trim() && !buffer.trim().startsWith(":")) {
          throw new Error("The event stream ended with an incomplete frame.");
        }

        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});

    reader.releaseLock();
  }
}
