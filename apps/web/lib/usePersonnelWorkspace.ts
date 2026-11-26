"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonnelHistoryEntry, PersonnelOnboarding, PersonnelOptions, PersonnelPage, PersonnelStatus, PersonnelSubmission, Role } from "@freshphones/contracts";
import { enrollPersonnel, getPersonnelOnboarding, getPersonnelOnboardingHistory, getPersonnelOnboardingOptions, rejectPersonnelOnboarding, submitPersonnelOnboarding } from "./personnel-api";
import { ApiError, tsRequest } from "./ts-api";

export type PersonnelStaff = { id: string; name: string; role: Role; active: boolean; supervisor?: { name: string } | null };

export function personnelError(error: unknown) {
  return error instanceof Error ? error.message : "Could not load personnel. Try again.";
}

export function usePersonnelWorkspace(confidential: boolean) {
  const [staff, setStaff] = useState<PersonnelStaff[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState("");
  const [data, setData] = useState<PersonnelPage | null>(null);
  const [options, setOptions] = useState<PersonnelOptions | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PersonnelStatus | "">("PENDING");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<PersonnelOnboarding | null>(null);
  const [history, setHistory] = useState<PersonnelHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [conflict, setConflict] = useState(false);
  const alive = useRef(true);
  const reads = useRef(0);
  const detailReads = useRef(0);
  const acting = useRef(false);
  const retry = useRef<{ intent: string; key: string } | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      reads.current++;
      detailReads.current++;
      retry.current = null;
    };
  }, []);

  const loadDirectory = useCallback(async () => {
    setDirectoryLoading(true);
    setDirectoryError("");
    try {
      const people = await tsRequest<PersonnelStaff[]>("/staff/directory");
      if (alive.current) setStaff(people);
    } catch (caught) {
      if (alive.current) setDirectoryError(personnelError(caught));
    } finally {
      if (alive.current) setDirectoryLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!confidential) return;
    const read = ++reads.current;
    setLoading(true);
    setError("");
    try {
      const [records, choices] = await Promise.all([
        getPersonnelOnboarding({ page, q: query.trim(), ...(status ? { status } : {}) }),
        getPersonnelOnboardingOptions(),
      ]);
      if (alive.current && read === reads.current) {
        setData(records);
        setOptions(choices);
      }
    } catch (caught) {
      if (alive.current && read === reads.current) setError(personnelError(caught));
    } finally {
      if (alive.current && read === reads.current) setLoading(false);
    }
  }, [confidential, page, query, status]);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 200);
    return () => { clearTimeout(timer); reads.current++; };
  }, [load]);

  const readHistory = useCallback(async (record: PersonnelOnboarding, refresh = false) => {
    const read = ++detailReads.current;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const entries = await getPersonnelOnboardingHistory(record.id);
      if (alive.current && read === detailReads.current) {
        setHistory(entries);
        if (refresh) {
          const latest = entries.at(-1)?.after;
          if (latest) setSelected(latest);
          setConflict(false);
          setActionError("");
          retry.current = null;
        }
      }
    } catch (caught) {
      if (alive.current && read === detailReads.current) setHistoryError(personnelError(caught));
    } finally {
      if (alive.current && read === detailReads.current) setHistoryLoading(false);
    }
  }, []);

  function open(record: PersonnelOnboarding) {
    setSelected(record);
    setHistory([]);
    setActionError("");
    setConflict(false);
    retry.current = null;
    void readHistory(record);
  }

  function close() {
    if (acting.current) return;
    detailReads.current++;
    setSelected(null);
    setHistory([]);
    setActionError("");
    retry.current = null;
  }

  async function submit(input: PersonnelSubmission) {
    if (acting.current) return false;
    acting.current = true;
    setBusy(true);
    setActionError("");
    try {
      await submitPersonnelOnboarding(input);
      if (!alive.current) return false;
      setNotice("Training submitted for COO review.");
      await load();
      return true;
    } catch (caught) {
      if (alive.current) setActionError(personnelError(caught));
      return false;
    } finally {
      acting.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function decide(action: "enroll" | "reject", input: { password: string; reason: string; agentProfileId: string }) {
    if (!selected || acting.current || conflict) return false;
    const record = selected;
    const body = action === "enroll"
      ? { version: record.version, password: input.password, ...(input.agentProfileId ? { agentProfileId: input.agentProfileId } : {}) }
      : { version: record.version, reason: input.reason.trim() };
    const intent = JSON.stringify({ id: record.id, action, body });
    if (retry.current?.intent !== intent) retry.current = { intent, key: crypto.randomUUID() };
    acting.current = true;
    setBusy(true);
    setActionError("");
    try {
      const result = action === "enroll"
        ? await enrollPersonnel(record.id, body as { version: number; password: string; agentProfileId?: string }, retry.current.key)
        : await rejectPersonnelOnboarding(record.id, body as { version: number; reason: string }, retry.current.key);
      if (!alive.current) return false;
      retry.current = null;
      setSelected(result);
      setNotice(action === "enroll" ? "Account created. Personnel enrollment is complete." : "Enrollment rejected. The training record is retained.");
      await Promise.all([readHistory(result), load(), loadDirectory()]);
      return true;
    } catch (caught) {
      if (alive.current) {
        setActionError(personnelError(caught));
        if (caught instanceof ApiError && caught.status === 409) setConflict(true);
      }
      return false;
    } finally {
      acting.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return { staff, directoryLoading, directoryError, loadDirectory, data, options, query, status, page, loading, error, notice, selected, history, historyLoading, historyError, busy, actionError, conflict, load, setQuery, setStatus, setPage, setActionError, open, close, readHistory, submit, decide };
}

export type PersonnelWorkspaceState = ReturnType<typeof usePersonnelWorkspace>;
