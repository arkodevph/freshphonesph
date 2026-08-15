// Client-side token storage for the foundation slice.
// NOTE: localStorage is fine for this early phase; M2 (auth) will move to
// httpOnly cookies + refresh handling per docs/13-auth-roles-schema-design.md.
import type { Tokens } from "./api";

const KEY = "fp_tokens";

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
}

export function isAuthed(): boolean {
  return !!getTokens()?.access;
}
