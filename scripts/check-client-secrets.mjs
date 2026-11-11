import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  process.argv[2] ?? fileURLToPath(new URL("../", import.meta.url)),
);

const excluded = new Set([
  "node_modules",
  "public",
  "test",
  "tests",
  "scripts",
  "dist",
]);

const findings = [];

let checked = 0;

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      entry.name.startsWith(".") ||
      excluded.has(entry.name) ||
      entry.isSymbolicLink()
    ) {
      continue;
    }

    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      // App Router handlers execute only on the server.
      if (
        path.relative(root, file).replaceAll(path.sep, "/").endsWith("/app/api")
      ) {
        continue;
      }

      await scan(file);

      continue;
    }

    if (
      !/\.[cm]?[jt]sx?$/.test(file) ||
      /(?:next|postcss)\.config\./.test(entry.name) ||
      entry.name.endsWith(".d.ts")
    ) {
      continue;
    }

    const source = await readFile(file, "utf8");

    // Explicitly server-only modules cannot be imported into a browser bundle.
    if (/^\s*import\s+["']server-only["']/m.test(source)) {
      continue;
    }

    checked++;

    const privateEnv =
      /\bprocess\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g;

    for (const match of source.matchAll(privateEnv)) {
      const name = match[1] ?? match[2];

      const publicName = name.startsWith("NEXT_PUBLIC_");

      const sensitivePublicName =
        publicName &&
        /(?:^|_)(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)(?:_|$)/.test(name);

      if ((!publicName && name !== "NODE_ENV") || sensitivePublicName) {
        report(
          file,
          source,
          match.index,
          sensitivePublicName
            ? "Sensitive public environment variable"
            : "Server environment variable in browser source",
        );
      }
    }

    // High-confidence provider credentials only; diagnostics never include values.
    for (const match of source.matchAll(
      /\b(?:sk-or-v1-[a-zA-Z0-9]{24,}|sk-proj-[a-zA-Z0-9_-]{24,}|AKIA[A-Z0-9]{16})\b/g,
    )) {
      report(file, source, match.index, "Possible embedded private credential");
    }
  }
}

function report(file, source, offset, reason) {
  const line = source.slice(0, offset).split("\n").length;

  findings.push(`${path.relative(root, file)}:${line}: ${reason}`);
}

for (const directory of [
  "apps/web/app",
  "apps/web/components",
  "apps/web/lib",
  "apps/landing/app",
]) {
  await scan(path.join(root, directory));
}

for (const finding of findings) {
  console.error(finding);
}

console.log(
  `Client credential check: ${checked} source files, ${findings.length} findings.`,
);

process.exitCode = findings.length ? 1 : 0;
