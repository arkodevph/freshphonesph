// The TypeScript API uses Better Auth HTTP-only cookies. The Django parity backend retains its legacy token adapter.
import type { Tokens, Me } from "./api";
import { TYPESCRIPT_API } from "./backend";
import { tsRequest } from "./ts-api";

const KEY = "fp_tokens";
const ME_KEY = TYPESCRIPT_API ? "fp_ts_me" : "fp_me";

export function saveTokens(t: Tokens | null): void {
  if (!TYPESCRIPT_API && t) localStorage.setItem(KEY, JSON.stringify(t));
}

export function getTokens(): Tokens | null {
  if (TYPESCRIPT_API) return null;
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Tokens) : null;
}

export function clearTokens(): void {
  if (!TYPESCRIPT_API) localStorage.removeItem(KEY);
  localStorage.removeItem(ME_KEY);
}

export function isAuthed(): boolean {
  return TYPESCRIPT_API || !!getTokens()?.access;
}

export async function logoutSession() {
  if (TYPESCRIPT_API) await tsRequest("/auth/logout", { method: "POST" });
  clearTokens();
}

export function saveMe(me: Me): void {
  localStorage.setItem(ME_KEY, JSON.stringify(me));
}

export function getStoredMe(): Me | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ME_KEY);
  return raw ? (JSON.parse(raw) as Me) : null;
}
