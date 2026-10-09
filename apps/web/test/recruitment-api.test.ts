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

test("job and applicant collections retain pagination, search and private review details", async () => {
  const requests: URL[] = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    requests.push(url);
    assert.equal(options?.credentials, "include");
    assert.equal(options?.cache, "no-store");
    const item = url.pathname.endsWith("/jobs") ? {
      id: "job-id", title: "Support Specialist", description: "Help customers", location: "Capas",
      employmentType: "Full-time", isOpen: true, version: 4, _count: { applicants: 25 },
    } : {
      id: "applicant-id", jobId: "job-id", job: { id: "job-id", title: "Support Specialist" },
      fullName: "Sample Applicant", email: "applicant@example.test", phone: "", message: "Hello",
      status: "REVIEWING", reviewerNotes: "Arrange an interview", version: 2,
      createdAt: "2026-10-06T00:00:00Z",
      attachments: [{ id: "attachment-id", storedFile: { originalName: "CV.pdf", mimeType: "application/pdf", size: 1024 } }],
    };
    return Response.json({ items: [item], total: 41, page: 2, pageSize: 20 });
  };
  const { listJobs, listApplicants } = await import("../lib/api");
  const jobs = await listJobs(2);
  const applicants = await listApplicants({ page: "2", q: "Sample Applicant", status: "reviewing" });
  assert.equal(requests[0].searchParams.get("page"), "2");
  assert.equal(requests[1].searchParams.get("q"), "Sample Applicant");
  assert.equal(requests[1].searchParams.get("status"), "REVIEWING");
  assert.equal(jobs.next, "3");
  assert.equal(jobs.results[0].applicant_count, 25);
  assert.equal(jobs.results[0].version, 4);
  assert.equal(applicants.count, 41);
  assert.equal(applicants.results[0].job_title, "Support Specialist");
  assert.equal(applicants.results[0].reviewer_notes, "Arrange an interview");
  assert.equal(applicants.results[0].attachments?.[0].storedFile.originalName, "CV.pdf");
});

test("job edits without a current version cannot overwrite a listing", async () => {
  globalThis.fetch = async () => { throw new Error("A stale edit must not reach the API."); };
  const { updateJob } = await import("../lib/api");
  await assert.rejects(updateJob("job-id", { title: "Stale edit" }), /Refresh this job opening/);
});
