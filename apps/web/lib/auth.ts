import { tsRequest } from "./ts-api";

export async function logoutSession() {
  await tsRequest("/auth/logout", { method: "POST" });
}
