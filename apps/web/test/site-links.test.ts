import { test } from "node:test";
import assert from "node:assert/strict";
import { landingHref, systemHref } from "../lib/site-links";

test("the integrated login returns to the homepage on the same site", () => {
  assert.equal(landingHref, "/");
});

test("landing links only reach a configured external system", () => {
  const previousTarget = process.env.NEXT_PUBLIC_SITE_TARGET;

  const previousSystem = process.env.NEXT_PUBLIC_SYSTEM_URL;

  try {
    process.env.NEXT_PUBLIC_SITE_TARGET = "landing";

    delete process.env.NEXT_PUBLIC_SYSTEM_URL;

    assert.equal(systemHref("/login"), null);

    assert.equal(systemHref("/portal/support#new-request"), null);

    process.env.NEXT_PUBLIC_SYSTEM_URL = "https://system.example.com/";

    assert.equal(systemHref("/login"), "https://system.example.com/login");

    assert.equal(
      systemHref("/portal/support#new-request"),
      "https://system.example.com/portal/support#new-request",
    );

    delete process.env.NEXT_PUBLIC_SYSTEM_URL;

    delete process.env.NEXT_PUBLIC_SITE_TARGET;

    assert.equal(systemHref("/login"), "/login");

    process.env.NEXT_PUBLIC_SYSTEM_URL = "https://old-system.example.com";

    assert.equal(systemHref("/login"), "/login");

    assert.equal(
      systemHref("/portal/support#new-request"),
      "/portal/support#new-request",
    );
  } finally {
    if (previousTarget === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_TARGET;
    } else {
      process.env.NEXT_PUBLIC_SITE_TARGET = previousTarget;
    }

    if (previousSystem === undefined) {
      delete process.env.NEXT_PUBLIC_SYSTEM_URL;
    } else {
      process.env.NEXT_PUBLIC_SYSTEM_URL = previousSystem;
    }
  }
});
