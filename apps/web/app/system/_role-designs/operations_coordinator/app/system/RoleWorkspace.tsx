"use client";

import EnrollmentRequests from "@/app/system/_role-designs/operations_coordinator/app/system/enrollments/EnrollmentRequests";
import type {
  Enrollment,
  EnrollmentPage,
} from "@/app/system/_role-designs/operations_coordinator/app/system/enrollments/enrollment-types";
import enrollmentStyles from "@/app/system/_role-designs/operations_coordinator/app/system/enrollments/enrollment-requests.module.css";
import WorkspaceProgress from "@/app/system/_role-designs/operations_coordinator/components/WorkspaceProgress";
import PersonnelDirectory, {
  type Staff,
} from "@/app/system/_role-designs/operations_coordinator/app/system/people/PersonnelDirectory";
import AgentNetworkDirectory, {
  type Network,
} from "@/app/system/_role-designs/operations_coordinator/app/system/people/AgentNetworkDirectory";
import WorkspaceNativeSelect from "@/app/system/_role-designs/operations_coordinator/components/WorkspaceNativeSelect";
import { useToastNotice } from "@/lib/useToastNotice";
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

type BatchChoice = { id: string; code: string; model: string };

type MemberChoice = {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  batch: { code: string };
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

  const [notice, setNotice] = useToastNotice("");

  const [confirmReplacement, setConfirmReplacement] = useState<string | null>(
    null,
  );

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

  async function review(
    item: Enrollment,
    decision: "APPROVED" | "REJECTED",
    confirmed = false,
  ) {
    if (busy) {
      return;
    }

    if (decision === "APPROVED" && item.withdrawalId && !confirmed) {
      setConfirmReplacement(item.id);

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
          ? item.withdrawalId
            ? "Replacement admitted. The original member's unpaid obligation was released and the replacement's schedule was issued."
            : "Enrollment approved and member record created."
          : "Enrollment request rejected.",
      );

      setConfirmReplacement(null);

      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!me) {
    return <WorkspaceProgress label="Loading workspace…" />;
  }

  if (!permitted) {
    return <h1>No access</h1>;
  }

  const title =
    section === "personnel"
      ? "Personnel"
      : section === "network"
        ? "Agent network"
        : "Enrollment requests";

  return (
    <div
      className={
        section === "enrollments" ? enrollmentStyles.workspace : "space-y-5"
      }
    >
      <header
        className={
          section === "enrollments"
            ? enrollmentStyles.heading
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <button
          className={
            section === "enrollments"
              ? enrollmentStyles.refresh
              : "rounded-xl border px-4 py-2"
          }
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
        <PersonnelDirectory staff={staff} loading={loading} />
      )}
      {section === "network" && network && (
        <AgentNetworkDirectory network={network} />
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
                  <WorkspaceNativeSelect
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
                  </WorkspaceNativeSelect>
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
          <EnrollmentRequests
            items={requests?.items ?? []}
            total={requests?.total ?? null}
            page={page}
            pageSize={requests?.pageSize ?? 20}
            status={status}
            loading={loading}
            busy={busy}
            canReview={can(me, "ENROLLMENT_REVIEW")}
            focusedId={requestId}
            reasons={reasons}
            confirmReplacement={confirmReplacement}
            error={error}
            onStatus={(value) => {
              setStatus(value);

              setPage(1);
            }}
            onPage={setPage}
            onReason={(id, value) => {
              setReasons((current) => {
                return { ...current, [id]: value };
              });
            }}
            onConfirm={setConfirmReplacement}
            onRefresh={load}
            onReview={review}
          />
        </>
      )}
      {loading && section !== "personnel" && section !== "enrollments" && (
        <WorkspaceProgress label="Loading…" />
      )}
    </div>
  );
}
