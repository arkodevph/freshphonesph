import assert from "node:assert/strict";

const base = process.env.DASH_CHECK_URL ?? "http://localhost:4101";

for (const path of [
  "config",
  "list-users",
  "user-stats",
  "user-graph-data",
  "user-retention-data",
]) {
  const response = await fetch(`${base}/api/auth/dash/${path}`);

  assert.equal(response.status, 401, `${path} must reach Dash authentication`);

  assert.equal((await response.json()).message, "Invalid API key");
}

for (const path of ["delete-user", "set-user-role", "create-user"]) {
  const response = await fetch(`${base}/api/auth/dash/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  assert.equal(response.status, 404, `${path} must remain unavailable`);
}

console.log(
  "Dash read routes require signed authentication; writes remain unavailable.",
);
