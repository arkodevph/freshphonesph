// Client-side token storage for the foundation slice.
// NOTE: localStorage is fine for this early phase; M2 (auth) will move to
// httpOnly cookies + refresh handling per docs/13-auth-roles-schema-design.md.
import type { Tokens, Me } from "./api";

const KEY = "fp_tokens";
const ME_KEY = "fp_me";

export function saveTokens(t: Tokens): void {
  localStorage.setItem(KEY, JSON.stringify(t));
}

export function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Tokens) : null;
}

export function clearTokens(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(ME_KEY);
}

export function isAuthed(): boolean {
  return !!getTokens()?.access;
}

export function saveMe(me: Me): void {
  localStorage.setItem(ME_KEY, JSON.stringify(me));
}

export function getStoredMe(): Me | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ME_KEY);
  return raw ? (JSON.parse(raw) as Me) : null;
}
