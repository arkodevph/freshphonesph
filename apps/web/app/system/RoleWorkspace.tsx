"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { roleLabels, type Role } from "@freshphones/contracts";
import Link from "next/link";
import { tsRequest } from "@/lib/ts-api";
import { can, useMe } from "@/lib/useMe";
import { useLiveRecords } from "@/lib/useLiveRecords";

type Staff = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  supervisor?: { name: string } | null;
};

type Enrollment = {
  id: string;
  name: string;
  batchCode: string;
  status: string;
  reason: string;
  version: number;
  submittedBy: string;
  reviewedBy: string | null;
};

type BatchChoice = { id: string; code: string; model: string };

type MemberChoice = {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  batch: { code: string };
};

type EnrollmentPage = {
  items: Enrollment[];
  total: number;
  page: number;
  pageSize: number;
};

type Network = {
  agents: {
    id: string;
    name: string;
    supervisor: { name: string } | null;
    agentProfile: { code: string } | null;
  }[];
  batches: {
    id: string;
    code: string;
    model: string;
    status: string;
    _count: { clients: number };
  }[];
  enrollmentCounts: { status: string; count: number }[];
};

const message = (error: unknown) => {
  return error instanceof Error
    ? error.message
    : "Could not load this workspace.";
};

export default function RoleWorkspace({
  section,
  requestId,
}: {
  section: "personnel" | "network" | "enrollments";
  requestId?: string;
}) {
  const me = useMe();

  const permitted = can(
    me,
    ...(section === "personnel"
      ? ["STAFF_READ"]
      : section === "network"
        ? ["AGENT_NETWORK_READ"]
        : ["ENROLLMENT_SUBMIT", "ENROLLMENT_REVIEW", "AGENT_NETWORK_READ"]),
  );

  const [staff, setStaff] = useState<Staff[]>([]);

  const [network, setNetwork] = useState<Network | null>(null);

  const [requests, setRequests] = useState<EnrollmentPage | null>(null);

  const [batches, setBatches] = useState<BatchChoice[]>([]);

  const [page, setPage] = useState(1);

  const [status, setStatus] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [notice, setNotice] = useState("");

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [reasons, setReasons] = useState<Record<string, string>>({});

  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    batchId: "",
  });

  const [existingMember, setExistingMember] = useState<MemberChoice | null>(
    null,
  );

  const [memberQuery, setMemberQuery] = useState("");

  const [memberChoices, setMemberChoices] = useState<MemberChoice[]>([]);

  const [searchingMembers, setSearchingMembers] = useState(false);

  const memberSearch = useRef(0);

  async function searchMembers() {
    const sequence = ++memberSearch.current;

    setSearchingMembers(true);

    setError(null);

    try {
      const found = await tsRequest<MemberChoice[]>(
        `/enrollment/members?q=${encodeURIComponent(memberQuery.trim())}`,
      );

      if (sequence === memberSearch.current) {
        setMemberChoices(found);

        if (!found.length) {
          setNotice("No matching members in your assigned batches.");
        }
      }
    } catch (caught) {
      if (sequence === memberSearch.current) {
        setError(message(caught));
      }
    } finally {
      if (sequence === memberSearch.current) {
        setSearchingMembers(false);
      }
    }
  }

  const submission = useRef<string | null>(null);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    if (!permitted) {
      return;
    }

    const current = ++sequence.current;

    setLoading(true);

    setError(null);

    try {
      if (section === "personnel") {
        const data = await tsRequest<Staff[]>("/staff/directory");

        if (current === sequence.current) {
          setStaff(data);
        }
      } else if (section === "network") {
        const data = await tsRequest<Network>("/agent-network");

        if (current === sequence.current) {
          setNetwork(data);
        }
      } else {
        const query = new URLSearchParams({
          page: String(page),
          ...(status ? { status } : {}),
          ...(requestId ? { requestId } : {}),
        });

        const [data, choices] = await Promise.all([
          tsRequest<EnrollmentPage>(`/enrollment/requests?${query}`),
          can(me, "ENROLLMENT_SUBMIT")
            ? tsRequest<BatchChoice[]>("/enrollment/batches")
            : Promise.resolve([]),
        ]);

        if (current === sequence.current) {
          setRequests(data);

          setBatches(choices);
        }
      }
    } catch (caught) {
      if (current === sequence.current) {
        setError(message(caught));
      }
    } finally {
      if (current === sequence.current) {
        setLoading(false);
      }
    }
  }, [
    permitted,
    section,
    page,
    status,
    requestId,
    me?.id,
    me?.permissions.join(","),
  ]);

  useLiveRecords(load, permitted && section === "enrollments");

  useEffect(() => {
    void load();

    window.addEventListener("focus", load);

    return () => {
      sequence.current++;

      window.removeEventListener("focus", load);
    };
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);

    setError(null);

    setNotice("");

    submission.current ??= crypto.randomUUID();

    try {
      await tsRequest("/enrollment/requests", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          ...(existingMember ? { memberId: existingMember.memberId } : {}),
          submissionId: submission.current,
        }),
      });

      submission.current = null;

      setDraft({ name: "", email: "", phone: "", batchId: "" });

      setExistingMember(null);

      setMemberChoices([]);

      setNotice(
        "Request submitted. The member will be enrolled after approval.",
      );

      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function review(item: Enrollment, decision: "APPROVED" | "REJECTED") {
    if (busy) {
      return;
    }

    setBusy(true);

    setError(null);

    setNotice("");

    try {
      await tsRequest(`/enrollment/requests/${item.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          version: item.version,
          decision,
          reason: (reasons[item.id] ?? "").trim(),
        }),
      });

      setNotice(
        decision === "APPROVED"
          ? "Enrollment approved and member record created."
          : "Enrollment request rejected.",
      );

      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!me) {
    return <p role="status">Loading workspace…</p>;
  }

  if (!permitted) {
    return <h1>No access</h1>;
  }

  const title =
    section === "personnel"
      ? "Personnel"
      : section === "network"
        ? "Agent network"
        : "Member enrollments";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm">
            {section === "personnel"
              ? "Staff information available for your responsibilities."
              : section === "network"
                ? "Your assigned Agent network and recruitment progress."
                : "Agent requests require Batch Manager approval, with COO oversight."}
          </p>
        </div>
        <button
          className="rounded-xl border px-4 py-2"
          type="button"
          disabled={busy || loading}
          onClick={() => {
            return void load();
          }}
        >
          Refresh
        </button>
      </header>
      {error && (
        <p role="alert" className="system-alert is-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="system-alert">
          {notice}
        </p>
      )}
      {section === "personnel" && (
        <section className="system-panel overflow-x-auto p-5">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Authorized personnel directory
            </caption>
            <thead>
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Supervisor</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((person) => {
                return (
                  <tr key={person.id}>
                    <td className="p-3">{person.name}</td>
                    <td className="p-3">{roleLabels[person.role]}</td>
                    <td className="p-3">
                      {person.supervisor?.name ?? "Not assigned"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && !staff.length && (
            <p>No personnel assigned to your scope.</p>
          )}
        </section>
      )}
      {section === "network" && network && (
        <>
          <section className="system-panel p-5">
            <h2 className="mb-3 text-lg font-bold">Enrollment progress</h2>
            <div className="flex flex-wrap gap-6">
              {["PENDING", "APPROVED", "REJECTED"].map((state) => {
                return (
                  <p key={state}>
                    {state.toLowerCase()}:{" "}
                    <strong>
                      {network.enrollmentCounts.find((row) => {
                        return row.status === state;
                      })?.count ?? 0}
                    </strong>
                  </p>
                );
              })}
            </div>
          </section>
          <section className="system-panel p-5">
            <h2 className="mb-3 text-lg font-bold">Agents</h2>
            <ul className="space-y-3">
              {network.agents.map((agent) => {
                return (
                  <li key={agent.id}>
                    <strong>{agent.name}</strong> ·{" "}
                    {agent.agentProfile?.code ?? "Agent profile not assigned"}
                    <p className="text-sm">
                      Pioneer: {agent.supervisor?.name ?? "Not assigned"}
                    </p>
                  </li>
                );
              })}
            </ul>
            {!network.agents.length && <p>No Agents assigned to your team.</p>}
          </section>
          <section className="system-panel p-5">
            <h2 className="mb-3 text-lg font-bold">Assigned batches</h2>
            <ul>
              {network.batches.map((batch) => {
                return (
                  <li className="py-2" key={batch.id}>
                    {batch.code} · {batch.model} · {batch._count.clients}{" "}
                    members
                  </li>
                );
              })}
            </ul>
            {!network.batches.length && <p>No batches assigned yet.</p>}
          </section>
        </>
      )}
      {section === "enrollments" && (
        <>
          {requestId && (
            <p role="status" className="system-panel p-4 text-sm">
              Showing the request opened from your notification.{" "}
              <Link className="underline" href="/system/enrollments">
                View all requests
              </Link>
            </p>
          )}
          {can(me, "ENROLLMENT_SUBMIT") && (
            <form onSubmit={submit} className="system-panel p-5">
              <h2 className="mb-3 text-lg font-bold">
                Submit a member for approval
              </h2>
              <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm">
                    For someone already enrolled, find their existing profile to
                    keep one identity across batches. Each batch keeps its own
                    schedule and payments.
                  </p>
                  <label htmlFor="existing-member-search">
                    Find an existing member
                  </label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <input
                      id="existing-member-search"
                      className="min-w-0 flex-1 rounded-lg border p-2"
                      value={memberQuery}
                      maxLength={100}
                      onChange={(event) => {
                        return setMemberQuery(event.target.value);
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-lg border px-4 py-2"
                      disabled={
                        searchingMembers || memberQuery.trim().length < 2
                      }
                      onClick={() => {
                        return void searchMembers();
                      }}
                    >
                      {searchingMembers ? "Searching…" : "Find member"}
                    </button>
                  </div>
                  {memberChoices.length > 0 && (
                    <ul
                      className="mt-2 space-y-2"
                      aria-label="Matching members"
                    >
                      {memberChoices.map((member) => {
                        return (
                          <li key={member.memberId}>
                            <button
                              type="button"
                              className="w-full rounded-lg border p-3 text-left"
                              onClick={() => {
                                setExistingMember(member);

                                setDraft({
                                  ...draft,
                                  name: member.name,
                                  email: member.email,
                                  phone: member.phone,
                                });

                                setMemberChoices([]);

                                submission.current = null;
                              }}
                            >
                              {member.name} · {member.phone} ·{" "}
                              {member.batch.code}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {existingMember && (
                    <p className="mt-2" role="status">
                      Using existing member:{" "}
                      <strong>{existingMember.name}</strong>.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          setExistingMember(null);

                          setDraft({
                            ...draft,
                            name: "",
                            email: "",
                            phone: "",
                          });

                          submission.current = null;
                        }}
                      >
                        Use a new member instead
                      </button>
                    </p>
                  )}
                </div>
                <label>
                  Member name
                  <input
                    className="mt-1 w-full rounded-lg border p-2"
                    required
                    readOnly={Boolean(existingMember)}
                    minLength={2}
                    maxLength={100}
                    value={draft.name}
                    onChange={(e) => {
                      return setDraft({ ...draft, name: e.target.value });
                    }}
                  />
                </label>
                <label>
                  Phone
                  <input
                    className="mt-1 w-full rounded-lg border p-2"
                    required={!existingMember}
                    type="tel"
                    readOnly={Boolean(existingMember)}
                    value={draft.phone}
                    onChange={(e) => {
                      return setDraft({ ...draft, phone: e.target.value });
                    }}
                  />
                </label>
                <label>
                  Email (optional)
                  <input
                    className="mt-1 w-full rounded-lg border p-2"
                    type="email"
                    readOnly={Boolean(existingMember)}
                    value={draft.email}
                    onChange={(e) => {
                      return setDraft({ ...draft, email: e.target.value });
                    }}
                  />
                </label>
                <label>
                  Batch
                  <select
                    className="mt-1 w-full rounded-lg border p-2"
                    required
                    value={draft.batchId}
                    onChange={(e) => {
                      return setDraft({ ...draft, batchId: e.target.value });
                    }}
                  >
                    <option value="">Choose an assigned batch</option>
                    {batches.map((batch) => {
                      return (
                        <option key={batch.id} value={batch.id}>
                          {batch.code} — {batch.model}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <button
                  className="rounded-xl border px-4 py-2 sm:col-span-2"
                  disabled={!batches.length}
                  type="submit"
                >
                  {busy ? "Submitting…" : "Submit for approval"}
                </button>
              </fieldset>
              {!loading && !batches.length && (
                <p className="mt-3 text-sm">
                  Ask the COO to link your Agent profile and assign a batch
                  before submitting a member.
                </p>
              )}
            </form>
          )}
          <section className="system-panel p-5">
            <label className="mb-4 block">
              Request status
              <select
                className="ml-3 rounded-lg border p-2"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);

                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <div className="space-y-4">
              {requests?.items.map((item) => {
                return (
                  <article className="rounded-xl border p-4" key={item.id}>
                    <h2 className="font-bold">
                      {item.name} · {item.batchCode}
                    </h2>
                    <p className="text-sm">
                      {item.status.toLowerCase()} · Submitted by{" "}
                      {item.submittedBy}
                    </p>
                    {item.reason && (
                      <p className="mt-2 text-sm">Review: {item.reason}</p>
                    )}
                    {item.status === "PENDING" &&
                      can(me, "ENROLLMENT_REVIEW") && (
                        <div className="mt-3 space-y-2">
                          <label className="block">
                            Review reason
                            <textarea
                              className="mt-1 w-full rounded-lg border p-2"
                              minLength={3}
                              maxLength={1000}
                              value={reasons[item.id] ?? ""}
                              onChange={(e) => {
                                return setReasons({
                                  ...reasons,
                                  [item.id]: e.target.value,
                                });
                              }}
                            />
                          </label>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              className="rounded-lg border px-3 py-2"
                              disabled={
                                busy ||
                                (reasons[item.id] ?? "").trim().length < 3
                              }
                              onClick={() => {
                                return void review(item, "APPROVED");
                              }}
                            >
                              Approve enrollment
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border px-3 py-2"
                              disabled={
                                busy ||
                                (reasons[item.id] ?? "").trim().length < 3
                              }
                              onClick={() => {
                                return void review(item, "REJECTED");
                              }}
                            >
                              Reject request
                            </button>
                          </div>
                        </div>
                      )}
                  </article>
                );
              })}
            </div>
            {!loading && !requests?.items.length && (
              <p>No enrollment requests in this view.</p>
            )}
            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                disabled={loading || page === 1}
                onClick={() => {
                  return setPage(page - 1);
                }}
              >
                Previous
              </button>
              <span>
                Page {page} · {requests?.total ?? 0} requests
              </span>
              <button
                type="button"
                disabled={loading || page * 20 >= (requests?.total ?? 0)}
                onClick={() => {
                  return setPage(page + 1);
                }}
              >
                Next
              </button>
            </div>
          </section>
        </>
      )}
      {loading && <p role="status">Loading…</p>}
    </div>
  );
}
