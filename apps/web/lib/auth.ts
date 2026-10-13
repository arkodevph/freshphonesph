// Better Auth sessions are stored in HTTP-only cookies; only display data is cached here.
import type { Me } from "./api";
import { tsRequest } from "./ts-api";

const ME_KEY = "fp_ts_me";

export function clearSessionCache(): void {
  localStorage.removeItem(ME_KEY);
}

export async function logoutSession() {
  await tsRequest("/auth/logout", { method: "POST" });
  clearSessionCache();
}

export function saveMe(me: Me): void {
  localStorage.setItem(ME_KEY, JSON.stringify(me));
}
