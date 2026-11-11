import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const checker = fileURLToPath(
  new URL("./check-client-secrets.mjs", import.meta.url),
);

test("browser credential guard rejects private env use without printing values", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "fresh-client-secrets-"));

  try {
    for (const directory of [
      "apps/web/app/api",
      "apps/web/components",
      "apps/web/lib",
      "apps/landing/app",
    ]) {
      await mkdir(path.join(root, directory), { recursive: true });
    }

    const component = path.join(root, "apps/web/components/Example.tsx");

    const run = () => {
      return spawnSync(process.execPath, [checker, root], { encoding: "utf8" });
    };

    await writeFile(
      component,
      "export const endpoint = process.env.NEXT_PUBLIC_API_URL;\n",
    );

    await writeFile(
      path.join(root, "apps/web/app/api/route.ts"),
      "export const server = process.env.PROVIDER_API_KEY;\n",
    );

    assert.equal(run().status, 0);

    await writeFile(
      component,
      "export const key = process.env.PROVIDER_API_KEY; // sensitive-value-marker\n",
    );

    const privateResult = run();

    assert.equal(privateResult.status, 1);

    assert.match(
      privateResult.stderr,
      /Server environment variable in browser source/,
    );

    assert.doesNotMatch(privateResult.stderr, /sensitive-value-marker/);

    await writeFile(
      component,
      "export const key = process.env.NEXT_PUBLIC_PROVIDER_API_KEY;\n",
    );

    assert.equal(run().status, 1);

    await writeFile(
      component,
      'import "server-only";\nexport const key = process.env.PROVIDER_API_KEY;\n',
    );

    assert.equal(run().status, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
