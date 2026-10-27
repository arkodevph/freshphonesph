import assert from "node:assert/strict";
import { test } from "node:test";
import { roles, rolePermissions } from "@freshphones/contracts";
import { presentationResponse } from "../lib/presentation-api";
import { demoClients, demoPayments } from "../lib/presentation-data";

function request(path: string, method = "GET", role = "OWNER", body?: unknown) {
  return new Request(`https://demo.example.com/api/${path}`, {
    method,
    headers: { cookie: `freshphones-presentation-role=${role}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

test("presentation is isolated, role-aware, read only, and balances use verified payments", async () => {
  const previous = process.env.NEXT_PUBLIC_PRESENTATION_MODE;

  try {
    delete process.env.NEXT_PUBLIC_PRESENTATION_MODE;

    assert.equal(
      (
        await presentationResponse(
          request("presentation-login", "POST", "OWNER", { role: "OWNER" }),
        )
      ).status,
      404,
    );

    assert.equal((await presentationResponse(request("clients"))).status, 404);

    process.env.NEXT_PUBLIC_PRESENTATION_MODE = "true";

    for (const role of roles) {
      const login = await presentationResponse(
        request("presentation-login", "POST", role, { role }),
      );

      assert.equal(login.status, 200);

      assert.match(
        login.headers.get("set-cookie")!,
        /HttpOnly; SameSite=Lax.*Secure/,
      );

      const identity = await (
        await presentationResponse(request("auth/me", "GET", role))
      ).json();

      assert.equal(identity.role, role);

      assert.deepEqual(identity.permissions, rolePermissions[role]);
    }

    assert.equal(
      (
        await presentationResponse(
          request("presentation-login", "POST", "OWNER", { role: "ADMIN" }),
        )
      ).status,
      400,
    );

    assert.equal(
      (
        await presentationResponse(
          new Request("https://demo.example.com/api/auth/me"),
        )
      ).status,
      401,
    );

    assert.equal(
      (
        await presentationResponse(
          new Request("https://demo.example.com/api/auth/refresh", {
            method: "POST",
          }),
        )
      ).status,
      401,
    );

    const crossOrigin = new Request(
      "https://demo.example.com/api/presentation-login",
      {
        method: "POST",
        headers: { origin: "https://unrelated.example.com" },
        body: JSON.stringify({ role: "OWNER" }),
      },
    );

    assert.equal((await presentationResponse(crossOrigin)).status, 403);

    const proxied = new Request(
      "https://localhost:3000/api/presentation-login",
      {
        method: "POST",
        headers: {
          host: "demo.example.com",
          origin: "https://demo.example.com",
        },
        body: JSON.stringify({ role: "OWNER" }),
      },
    );

    assert.equal((await presentationResponse(proxied)).status, 200);

    const customer = await (
      await presentationResponse(request("clients", "GET", "CUSTOMER"))
    ).json();

    assert.equal(customer.total, 1);

    assert.equal(customer.items[0].id, demoClients[0].id);

    assert.equal(
      (
        await presentationResponse(
          request(`clients/${demoClients[1].id}`, "GET", "CUSTOMER"),
        )
      ).status,
      404,
    );

    const balanceResponse = await presentationResponse(
      request(`clients/${demoClients[0].id}/balance`),
    );

    assert.equal(balanceResponse.headers.get("cache-control"), "no-store");

    const balance = await balanceResponse.json();

    assert.equal(balance.verifiedPaid, "4000.00");

    assert.equal(balance.pendingAmount, "2000.00");

    assert.equal(balance.remainingBalance, "28000.00");

    for (const [path, method] of [
      ["payments", "POST"],
      [`payments/${demoPayments[0].id}/verify`, "POST"],
      ["accounts", "PATCH"],
      ["documents/upload", "POST"],
      ["auth/forgot-password", "POST"],
      ["retention/requests/execute", "DELETE"],
    ]) {
      const response = await presentationResponse(request(path, method));

      assert.equal(response.status, 409);

      assert.match((await response.json()).message, /Presentation only/);
    }

    assert.equal(demoPayments[0].status, "VERIFIED");

    const filtered = await (
      await presentationResponse(request("payments?status=PENDING"))
    ).json();

    assert.equal(filtered.total, 3);

    const secondPage = await (
      await presentationResponse(request("clients?page=2"))
    ).json();

    assert.equal(secondPage.items.length, 0);

    assert.equal(secondPage.next, null);

    for (const role of ["OWNER", "CS_TEAM"]) {
      const inbox = await presentationResponse(
        request("inquiries?page=1&q=iPhone&status=NEW", "GET", role),
      );

      assert.equal(inbox.status, 200);

      const data = await inbox.json();

      assert.deepEqual(data.items, []);

      assert.equal(data.total, 0);

      assert.equal(data.page, 1);

      assert.equal(data.pageSize, 20);

      const update = await presentationResponse(
        request("inquiries/sample-inquiry", "PATCH", role, {
          status: "CLOSED",
          version: 1,
        }),
      );

      assert.equal(update.status, 409);

      assert.match((await update.json()).message, /Presentation only/);
    }

    const logout = await presentationResponse(request("auth/logout", "POST"));

    assert.match(logout.headers.get("set-cookie")!, /Max-Age=0/);
  } finally {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_PRESENTATION_MODE;
    } else {
      process.env.NEXT_PUBLIC_PRESENTATION_MODE = previous;
    }
  }
});
