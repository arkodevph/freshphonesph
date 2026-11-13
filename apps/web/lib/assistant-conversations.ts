import type {
  AssistantConversation,
  AssistantConversationState,
  AssistantConversationSummary,
} from "@freshphones/contracts";
import { assistantConversationStateSchema } from "@freshphones/contracts";
import { tsRequest } from "./ts-api";

export const listAssistantConversations = () => {
  return tsRequest<AssistantConversationSummary[]>("/assistant/conversations");
};

export async function getAssistantConversation(id: string) {
  const conversation = await tsRequest<AssistantConversation>(
    `/assistant/conversations/${id}`,
  );

  return {
    ...conversation,
    state: assistantConversationStateSchema.parse(conversation.state),
  };
}

export function saveAssistantConversation(
  accountId: string,
  id: string,
  revision: number,
  state: AssistantConversationState,
) {
  const body = JSON.stringify({ accountId, revision, state });

  return tsRequest<AssistantConversationSummary>(
    `/assistant/conversations/${id}`,
    {
      method: "PUT",
      body,
      keepalive: new TextEncoder().encode(body).length < 60000,
    },
  );
}

export const listAssistantProjects = () => {
  return tsRequest<import("@freshphones/contracts").AssistantProject[]>(
    "/assistant/projects",
  );
};

export function editAssistantConversation(
  accountId: string,
  id: string,
  revision: number,
  changes: { title?: string; projectId?: string | null },
) {
  return tsRequest<AssistantConversationSummary>(
    `/assistant/conversations/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ accountId, revision, ...changes }),
    },
  );
}

export const deleteAssistantConversation = (id: string) => {
  return tsRequest(`/assistant/conversations/${id}`, { method: "DELETE" });
};

export const createAssistantProject = (accountId: string, name: string) => {
  return tsRequest<import("@freshphones/contracts").AssistantProject>(
    "/assistant/projects",
    { method: "POST", body: JSON.stringify({ accountId, name }) },
  );
};

export const renameAssistantProject = (
  accountId: string,
  id: string,
  revision: number,
  name: string,
) => {
  return tsRequest<import("@freshphones/contracts").AssistantProject>(
    `/assistant/projects/${id}`,
    { method: "PATCH", body: JSON.stringify({ accountId, revision, name }) },
  );
};

export const deleteAssistantProject = (id: string) => {
  return tsRequest(`/assistant/projects/${id}`, { method: "DELETE" });
};
