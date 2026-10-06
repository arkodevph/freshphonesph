import { after, before, test } from "node:test";
import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;

before(() => {
  process.env.NEXT_PUBLIC_API_BACKEND = "typescript";
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:4100";
});

after(() => {
  globalThis.fetch = originalFetch;
});

test("public applications preserve UUID job identifiers", async () => {
  const jobId = "fd9c9a83-c948-4c80-80d7-03f73a9e3ba9";
  globalThis.fetch = async (input, options) => {
    assert.equal(new URL(String(input)).pathname, "/api/careers/apply");
    const body = options?.body as FormData;
    assert.equal(body.get("jobId"), jobId);
    assert.equal(body.get("fullName"), "Sample Applicant");
    return Response.json({ detail: "Application received." });
  };

  const { applyToJob } = await import("../lib/api");
  await applyToJob({
    job: jobId,
    full_name: "Sample Applicant",
    email: "applicant@example.test",
  });
});

test("admin job and applicant updates send current optimistic versions", async () => {
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = async (input, options) => {
    const path = new URL(String(input)).pathname;
    const body = JSON.parse(String(options?.body)) as Record<string, unknown>;
    requests.push({ path, body });
    if (path.includes("/recruitment/jobs/")) {
      return Response.json({
        id: path.split("/").at(-1), title: "Support Specialist", description: "Help customers",
        location: "Capas, Tarlac", employmentType: "Full-time", isOpen: false, version: 5,
        _count: { applicants: 2 },
      });
    }
    return Response.json({
      id: path.split("/").at(-1), jobId: "fd9c9a83-c948-4c80-80d7-03f73a9e3ba9",
      fullName: "Sample Applicant", email: "applicant@example.test", phone: "", message: "",
      status: "REVIEWING", reviewerNotes: "Phone screen next", createdAt: "2026-10-06T00:00:00Z", version: 3,
    });
  };

  const { updateApplicant, updateJob } = await import("../lib/api");
  await updateJob("2d239ed3-64c7-45a2-aa9a-b860793c98c8", {
    title: "Support Specialist",
    description: "Help customers",
    location: "Capas, Tarlac",
    employment_type: "Full-time",
    is_open: false,
    version: 4,
  });
  await updateApplicant("e46efac3-a47a-41d7-a0db-62b226e32111", {
    status: "reviewing",
    reviewer_notes: "Phone screen next",
    version: 2,
  });

  assert.deepEqual(requests, [
    {
      path: "/api/recruitment/jobs/2d239ed3-64c7-45a2-aa9a-b860793c98c8",
      body: {
        version: 4,
        record: {
          title: "Support Specialist",
          description: "Help customers",
          location: "Capas, Tarlac",
          employmentType: "Full-time",
          isOpen: false,
        },
      },
    },
    {
      path: "/api/recruitment/applicants/e46efac3-a47a-41d7-a0db-62b226e32111",
      body: { status: "REVIEWING", reviewerNotes: "Phone screen next", version: 2 },
    },
  ]);
});
