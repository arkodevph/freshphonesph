const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AgentVerifyResult =
  | { found: false }
  | { found: true; full_name: string; agent_code: string; is_active: boolean };

export async function verifyAgent(query: string): Promise<AgentVerifyResult> {
  const response = await fetch(
    `${API_URL}/api/agents/verify/?q=${encodeURIComponent(query)}`,
  );

  if (!response.ok) throw new Error("Agent verification is unavailable.");
  return response.json() as Promise<AgentVerifyResult>;
}
