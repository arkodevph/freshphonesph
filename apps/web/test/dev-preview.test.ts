import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

for (const previewScript of ["dev-web-safe.sh", "preview-local-safe.sh"]) {
  test(`${previewScript} refuses to start when its resource manager is unavailable`, () => {
    const directory = mkdtempSync(path.join(tmpdir(), "fresh-preview-guard-"));

    try {
      writeFileSync(path.join(directory, "systemctl"), "#!/bin/sh\nexit 1\n", {
        mode: 0o755,
      });

      writeFileSync(
        path.join(directory, "systemd-run"),
        "#!/bin/sh\nexit 99\n",
        {
          mode: 0o755,
        },
      );

      const script = fileURLToPath(
        new URL(`../../../scripts/${previewScript}`, import.meta.url),
      );

      const result = spawnSync("bash", [script], {
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
        encoding: "utf8",
        timeout: 5000,
      });

      assert.equal(result.status, 1);

      assert.match(result.stderr, /requires a running systemd user manager/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
