import assert from "node:assert/strict";
import { test } from "node:test";
import { subscribeLiveRecords } from "../lib/live-records";

test("dashboard subscribers share one live connection and release it after the last unmount", () => {
  class FakeSource extends EventTarget {
    static instances: FakeSource[] = [];
    closed = false;
    onerror: (() => void) | null = null;

    constructor() {
      super();

      FakeSource.instances.push(this);
    }
    close() {
      this.closed = true;
    }
  }

  const originalWindow = globalThis.window;

  const originalSource = globalThis.EventSource;

  Object.assign(globalThis, {
    window: new EventTarget(),
    EventSource: FakeSource,
  });

  const counts = [0, 0, 0, 0, 0];

  const cleanup = counts.map((_, index) => {
    return subscribeLiveRecords(() => {
      counts[index]++;
    });
  });

  try {
    assert.equal(FakeSource.instances.length, 1);

    const source = FakeSource.instances[0];

    source.dispatchEvent(new Event("ready"));

    source.dispatchEvent(new Event("change"));

    window.dispatchEvent(new Event("focus"));

    assert.deepEqual(counts, [3, 3, 3, 3, 3]);

    cleanup[0]();

    assert.equal(source.closed, false);

    source.dispatchEvent(new Event("change"));

    assert.deepEqual(counts, [3, 4, 4, 4, 4]);

    cleanup.slice(1).forEach((stop) => {
      return stop();
    });

    assert.equal(source.closed, true);

    window.dispatchEvent(new Event("focus"));

    assert.deepEqual(counts, [3, 4, 4, 4, 4]);

    const stop = subscribeLiveRecords(() => {
      return counts[0]++;
    });

    assert.equal(FakeSource.instances.length, 2);

    source.dispatchEvent(new Event("ready"));

    assert.equal(counts[0], 3);

    FakeSource.instances[1].dispatchEvent(new Event("ready"));

    assert.equal(counts[0], 4);

    stop();
  } finally {
    cleanup.forEach((stop) => {
      return stop();
    });

    Object.assign(globalThis, {
      window: originalWindow,
      EventSource: originalSource,
    });
  }
});
