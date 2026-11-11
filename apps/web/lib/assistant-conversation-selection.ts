const key = (accountId: string) => {
  return `freshphones:assistant:active:v1:${accountId}`;
};

/** This cache remembers only a selection. PostgreSQL still supplies the conversation. */
export function selectedAssistantConversation(
  accountId: string,
): string | null | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(key(accountId)) ?? "null");

    if (
      value &&
      typeof value.savedAt === "number" &&
      value.savedAt <= Date.now() &&
      Date.now() - value.savedAt < 86400000 &&
      (value.id === null || typeof value.id === "string")
    ) {
      return value.id;
    }
  } catch {
    /* Storage may be disabled; saved account history still works. */
  }

  return undefined;
}

export function rememberAssistantConversation(
  accountId: string,
  id: string | null,
) {
  try {
    sessionStorage.setItem(
      key(accountId),
      JSON.stringify({ id, savedAt: Date.now() }),
    );
  } catch {
    /* A selection cache failure must not prevent durable saving. */
  }
}
