// Minimal API client for the Django REST backend (docs/09-tech-stack.md).
// The backend base URL is injected at build/runtime via NEXT_PUBLIC_API_URL.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Tokens = { access: string; refresh: string };

/** Exchange credentials for JWT access/refresh tokens (SimpleJWT). */
export async function login(
  username: string,
  password: string,
): Promise<Tokens> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error(
      "Cannot reach the API. Is the backend running on " + API_URL + "?",
    );
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? "Invalid username or password.");
  }
  return res.json() as Promise<Tokens>;
}
