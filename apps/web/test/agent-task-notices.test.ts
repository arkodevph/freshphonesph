import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentTaskHref,
  agentTaskLocation,
  taskEvidenceError,
  taskSubmissionCommand,
} from "../app/system/_role-designs/agent/app/system/tasks/agent-task";
import {
  agentNoticeTarget,
  agentNotificationHref,
  agentNotificationLocation,
} from "../app/system/_role-designs/agent/app/system/notifications/agent-notifications";
import type { Task } from "../app/system/_role-designs/agent/app/system/tasks/task-view";

const id = "a6000000-0000-4000-8000-000000000004";

test("own-task navigation keeps recognized status/page while dropping scope overrides", () => {
  const location = agentTaskLocation(
    new URLSearchParams(
      `page=3&status=TODO&task=${id}&view=team&assignee=foreign`,
    ),
  );

  assert(location);

  const href = agentTaskHref(location, { task: undefined });

  assert.equal(href, "/system/tasks?page=3&status=TODO");

  for (const input of [
    "page=0",
    "page=10001",
    "status=APPROVED",
    "task=foreign",
  ]) {
    assert.equal(agentTaskLocation(new URLSearchParams(input)), null);
  }
});

test("task evidence validation preserves permitted types and the actual 5 MB boundary", () => {
  assert.equal(
    taskEvidenceError({ type: "application/pdf", size: 5 * 1024 * 1024 }),
    "",
  );

  assert.match(
    taskEvidenceError({ type: "image/png", size: 5 * 1024 * 1024 + 1 }),
    /5 MB/,
  );

  assert.match(taskEvidenceError({ type: "text/html", size: 20 }), /PDF/);
});

test("unknown task submission retains exact report/file/version for explicit retry", async () => {
  const previous = globalThis.fetch;

  const payloads: {
    version: string;
    report: string;
    name: string;
    bytes: string;
  }[] = [];

  globalThis.fetch = async (_url, options) => {
    const data = options!.body as FormData,
      file = data.get("attachment") as File;

    payloads.push({
      version: String(data.get("version")),
      report: String(data.get("report")),
      name: file.name,
      bytes: await file.text(),
    });

    if (payloads.length === 1) {
      throw new TypeError("Synthetic response lost");
    }

    return Response.json({ id, status: "SUBMITTED" });
  };

  try {
    const row = { id, version: 3 } as Task;

    const command = taskSubmissionCommand(
      row,
      "  original report  ",
      new File(["synthetic evidence"], "full-evidence-name.pdf", {
        type: "application/pdf",
      }),
    );

    await assert.rejects(command(), /response lost/);

    row.version = 99;

    await command();

    assert.deepEqual(payloads[0], payloads[1]);

    assert.equal(payloads[1].version, "3");

    assert.equal(payloads[1].report, "original report");

    assert.equal(payloads[1].name, "full-evidence-name.pdf");
  } finally {
    globalThis.fetch = previous;
  }
});

test("Agent notices resolve only exact task/intake/enrollment/withdrawal destinations", () => {
  assert.equal(
    agentNoticeTarget(`/system/tasks?task=${id}&view=team`),
    `/system/tasks?task=${id}`,
  );

  assert.equal(
    agentNoticeTarget(`/system/enrollments?application=${id}`),
    `/system/enrollments?view=applications&application=${id}`,
  );

  assert.equal(
    agentNoticeTarget(`/system/enrollments?request=${id}`),
    `/system/enrollments?request=${id}`,
  );

  assert.equal(
    agentNoticeTarget(`/system/withdrawals?request=${id}`),
    `/system/withdrawals?request=${id}`,
  );

  for (const target of [
    "https://foreign.test/system/tasks?task=" + id,
    "/system/team",
    "/system/tasks?task=bad",
    "//foreign.test/system/tasks",
  ]) {
    assert.equal(agentNoticeTarget(target), null);
  }

  assert.equal(agentNoticeTarget(`/system/tasks?task=${id}`, true), null);
});

test("notification feed/page/unread context survives recognized URL navigation", () => {
  const location = agentNotificationLocation(
    new URLSearchParams(
      "view=updates&page=2&unreadOnly=true&scope=all&recipientId=foreign",
    ),
  );

  assert(location);

  assert.equal(
    agentNotificationHref(location, { page: 3 }),
    "/system/notifications?view=updates&page=3&unreadOnly=true&scope=all",
  );

  assert.equal(
    agentNotificationLocation(new URLSearchParams("scope=finance")),
    null,
  );

  assert.equal(agentNotificationLocation(new URLSearchParams("page=-1")), null);
});
