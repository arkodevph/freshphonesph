import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function composeConfig(overrides = {}) {
  const directory = mkdtempSync(
    path.join(tmpdir(), "fresh-production-config-"),
  );

  try {
    const envFile = path.join(directory, "fixture.env");

    writeFileSync(
      envFile,
      "DATABASE_URL=postgresql://synthetic:synthetic@db/synthetic\n",
    );

    const config = readFileSync(
      path.join(root, "docker-compose.production.yml"),
      "utf8",
    ).replaceAll("env_file: .env.production", `env_file: ${envFile}`);

    const configFile = path.join(directory, "compose.yml");

    writeFileSync(configFile, config);

    return spawnSync(
      "docker",
      [
        "compose",
        "--env-file",
        envFile,
        "-f",
        configFile,
        "--profile",
        "migrate",
        "config",
        "--format",
        "json",
      ],
      {
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          WEB_ORIGIN: "https://system.example.test",
          PUBLIC_SITE_ORIGIN: "https://www.example.test",
          ...overrides,
        },
      },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("production connects real services, isolates backend secrets and keeps migrations explicit", () => {
  const result = composeConfig();

  assert.equal(result.status, 0, result.stderr);

  const { services } = JSON.parse(result.stdout);

  assert.equal(services.web.build.args.API_PROXY_URL, "http://api:4100");
  assert.equal(
    services.web.build.args.NEXT_PUBLIC_API_URL,
    "https://system.example.test",
  );
  assert.equal(services.web.environment.NEXT_PUBLIC_PRESENTATION_MODE, "false");
  assert.equal(services.web.environment.DATABASE_URL, undefined);
  assert.equal(services.web.ports[0].host_ip, "127.0.0.1");

  for (const name of ["api", "worker"]) {
    assert.equal(services[name].environment.NODE_ENV, "production");
    assert.equal(services[name].environment.AUTH_REQUIRE_STAFF_MFA, "true");
    assert.equal(services[name].ports, undefined);
    assert.equal(services[name].restart, "unless-stopped");
  }

  assert.deepEqual(services.worker.command, ["node", "dist/worker.js"]);
  assert.equal(services.web.depends_on.api.condition, "service_healthy");
  assert.deepEqual(services.migrate.profiles, ["migrate"]);
  assert.equal(services.migrate.build.target, "migrations");
  assert.equal(services.api.depends_on, undefined);
});

test("production configuration fails without a public system origin", () => {
  const result = composeConfig({ WEB_ORIGIN: "" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /WEB_ORIGIN/);
});
