import { readSseData, type AssistantStreamEvent } from "@freshphones/contracts";

export async function consumeAssistantStream(
  response: Response,
  onEvent: (event: AssistantStreamEvent) => void,
) {
  if (
    !response.body ||
    !response.headers.get("content-type")?.includes("text/event-stream")
  ) {
    throw new Error("Fresh AI could not start its response. Please try again.");
  }

  let complete = false;

  for await (const frame of readSseData(response.body)) {
    const event = JSON.parse(frame) as AssistantStreamEvent;

    if (event.type === "error") {
      throw new Error(event.message);
    }

    if (event.type === "complete") {
      if (
        !Array.isArray(event.reply?.paragraphs) ||
        !event.reply.paragraphs.every((p) => {
          return typeof p === "string";
        })
      ) {
        throw new Error("Fresh AI returned an invalid answer.");
      }

      complete = true;
    } else if (event.type !== "delta" && event.type !== "status") {
      throw new Error("Fresh AI returned an invalid response event.");
    }

    if (
      (event.type === "delta" && typeof event.text !== "string") ||
      (event.type === "status" && typeof event.label !== "string")
    ) {
      throw new Error("Fresh AI returned an invalid response event.");
    }

    onEvent(event);
  }

  if (!complete) {
    throw new Error(
      "The connection ended before the answer was complete. You can try again.",
    );
  }
}
