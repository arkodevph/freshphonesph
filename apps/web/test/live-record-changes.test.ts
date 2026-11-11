import assert from "node:assert/strict";
import test from "node:test";
import { subscribeLiveRecords } from "../lib/live-records";
import type { LiveRecordChange } from "../lib/navigation-updates";

test("one shared stream refreshes existing readers and supplies badge changes without flagging ready", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "EventSource");

  const sources: FakeSource[] = [];

  class FakeSource {
    callbacks = new Map<string, (event: { data: string }) => void>();
    closed = false;

    constructor() {
      sources.push(this);
    }

    addEventListener(
      type: string,
      callback: (event: { data: string }) => void,
    ) {
      this.callbacks.set(type, callback);
    }

    close() {
      this.closed = true;
    }

    send(type: string, data: string) {
      this.callbacks.get(type)?.({ data });
    }
  }

  Object.defineProperty(globalThis, "EventSource", {
    configurable: true,
    value: FakeSource,
  });

  let reads = 0;

  const changes: (LiveRecordChange | undefined)[] = [];

  const unsubscribeRead = subscribeLiveRecords(() => {
    reads++;
  });

  const unsubscribeBadge = subscribeLiveRecords((change) => {
    changes.push(change);
  });

  try {
    assert.equal(sources.length, 1);

    sources[0].send("ready", "{}");

    sources[0].send("change", '{"entity":"task","recordId":"task-1"}');

    sources[0].send("change", "malformed");

    assert.equal(reads, 3);

    assert.deepEqual(changes, [
      undefined,
      { entity: "task", recordId: "task-1" },
      undefined,
    ]);

    unsubscribeRead();

    assert.equal(sources[0].closed, false);

    unsubscribeBadge();

    assert.equal(sources[0].closed, true);
  } finally {
    unsubscribeRead();

    unsubscribeBadge();

    if (original) {
      Object.defineProperty(globalThis, "EventSource", original);
    } else {
      Reflect.deleteProperty(globalThis, "EventSource");
    }
  }
});
