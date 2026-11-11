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
