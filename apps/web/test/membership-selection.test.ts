import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currentMembership,
  clearMembershipSelection,
  membershipHeaders,
} from "../lib/membership-selection";

test("membership selection stays per tab and account, survives portal navigation and never selects staff/auth requests", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  const originalStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );

  const saved = new Map<string, string>();

  const location = { pathname: "/portal", search: "?membership=second-batch" };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location },
  });

  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => {
        return saved.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        return saved.set(key, value);
      },
    },
  });

  try {
    assert.equal(currentMembership("customer-a", "primary-a"), "second-batch");

    assert.deepEqual(membershipHeaders("/portal/documents"), {
      "X-Membership-Id": "second-batch",
    });

    const captured = membershipHeaders("/payments");

    location.search = "";

    location.pathname = "/portal/schedule";

    assert.equal(currentMembership("customer-a", "primary-a"), "second-batch");

    assert.equal(currentMembership("customer-b", "primary-b"), "primary-b");

    assert.deepEqual(captured, { "X-Membership-Id": "second-batch" });

    assert.deepEqual(membershipHeaders("/auth/me"), {});

    assert.deepEqual(membershipHeaders("/portal/memberships"), {});

    clearMembershipSelection();

    assert.deepEqual(membershipHeaders("/payments"), {});

    location.pathname = "/system/payments";

    assert.deepEqual(membershipHeaders("/payments"), {});
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }

    if (originalStorage) {
      Object.defineProperty(globalThis, "sessionStorage", originalStorage);
    } else {
      Reflect.deleteProperty(globalThis, "sessionStorage");
    }
  }
});
