"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  AssistantConversationState,
  AssistantConversationSummary,
} from "@freshphones/contracts";
import {
  getAssistantConversation,
  listAssistantConversations,
  saveAssistantConversation,
} from "@/lib/assistant-conversations";
import {
  selectedAssistantConversation,
  rememberAssistantConversation,
} from "@/lib/assistant-conversation-selection";
import { useMe } from "@/lib/useMe";

const emptyState = (): AssistantConversationState => {
  return {
    draft: "",
    includeContext: true,
    questions: [],
  };
};

type Session = {
  accountId: string;
  id: string;
  revision: number;
  saved: string;
  state: AssistantConversationState;
};

// Let a remount await writes already started by the previous view.
const writes = new Map<string, Promise<void>>();

function restoredState(
  state: AssistantConversationState,
): AssistantConversationState {
  return {
    ...state,
    questions: state.questions.map((question) => {
      return {
        ...question,
        error:
          !question.response && !question.error
            ? "The response was interrupted. Try this question again."
            : question.error,
        response: question.response
          ? {
              ...question.response,
              actions: question.response.actions?.map((action) => {
                return action.status === "executing"
                  ? {
                      ...action,
                      status: "failed",
                      message:
                        "Reopen the record to check whether this change completed.",
                    }
                  : action;
              }),
            }
          : null,
      };
    }),
  };
}

export function useAssistantHistory() {
  const me = useMe();

  const accountId = me ? String(me.id) : undefined;

  const [state, setState] = useState<AssistantConversationState>(emptyState);

  const [conversations, setConversations] = useState<
    AssistantConversationSummary[]
  >([]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const [ready, setReady] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const session = useRef<Session | null>(null);

  const generation = useRef(0);

  const mounted = useRef(true);

  if (session.current && ready) {
    session.current.state = state;
  }

  const flush = useCallback(async () => {
    const target = session.current;

    if (
      !target ||
      (target.revision === 0 &&
        !writes.has(target.accountId) &&
        !target.state.questions.length &&
        !target.state.draft.trim())
    ) {
      return;
    }

    const snapshot = structuredClone(target.state);

    const serialized = JSON.stringify(snapshot);

    const write = async () => {
      if (target.saved === serialized) {
        return;
      }

      if (mounted.current) {
        setSaving(true);
      }

      const summary = await saveAssistantConversation(
        target.accountId,
        target.id,
        target.revision,
        snapshot,
      );

      target.revision = summary.revision;

      target.saved = serialized;

      if (session.current === target) {
        rememberAssistantConversation(target.accountId, target.id);
      }

      if (mounted.current && session.current?.accountId === target.accountId) {
        setConversations((current) => {
          return [
            summary,
            ...current.filter((item) => {
              return item.id !== summary.id;
            }),
          ].sort((left, right) => {
            return right.updatedAt.localeCompare(left.updatedAt);
          });
        });

        setSaveError(null);
      }
    };

    const previous = writes.get(target.accountId) ?? Promise.resolve();

    const request = previous.catch(() => {}).then(write);

    writes.set(target.accountId, request);

    try {
      await request;
    } catch (error) {
      if (mounted.current && session.current === target) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Could not save this conversation. Retry saving before leaving.",
        );
      }

      throw error;
    } finally {
      if (writes.get(target.accountId) === request) {
        writes.delete(target.accountId);
      }

      if (mounted.current) {
        setSaving(false);
      }
    }
  }, []);

  const open = useCallback(
    async (id: string | null, identity: string, token: number) => {
      const conversation = id ? await getAssistantConversation(id) : null;

      if (!mounted.current || token !== generation.current) {
        return;
      }

      const next = conversation
        ? restoredState(conversation.state)
        : emptyState();

      const nextId = conversation?.id ?? crypto.randomUUID();

      session.current = {
        accountId: identity,
        id: nextId,
        revision: conversation?.revision ?? 0,
        saved: JSON.stringify(next),
        state: next,
      };

      setState(next);

      setActiveId(nextId);

      rememberAssistantConversation(identity, conversation?.id ?? null);

      setSaveError(null);

      setReady(true);
    },
    [],
  );

  const load = useCallback(async () => {
    if (!accountId) {
      return;
    }

    const token = ++generation.current;

    setReady(false);

    try {
      await writes.get(accountId)?.catch(() => {});

      const items = await listAssistantConversations();

      if (!mounted.current || token !== generation.current) {
        return;
      }

      setConversations(items);

      const selected = selectedAssistantConversation(accountId);

      const id =
        selected === null
          ? null
          : (items.find((item) => {
              return item.id === selected;
            })?.id ??
            items[0]?.id ??
            null);

      await open(id, accountId, token);
    } catch (error) {
      if (mounted.current && token === generation.current) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Could not load saved conversations.",
        );
      }
    }
  }, [accountId, open]);

  useEffect(() => {
    mounted.current = true;

    session.current = null;

    setState(emptyState());

    setConversations([]);

    setActiveId(null);

    void load();

    return () => {
      void flush().catch(() => {});

      mounted.current = false;

      generation.current++;
    };
  }, [load, flush]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const timer = window.setTimeout(() => {
      void flush().catch(() => {});
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state, ready, flush]);

  useEffect(() => {
    const refresh = () => {
      void flush()
        .then(async () => {
          const token = generation.current;

          const items = await listAssistantConversations();

          if (mounted.current && token === generation.current) {
            setConversations(items);
          }
        })
        .catch(() => {});
    };

    const leaving = () => {
      void flush().catch(() => {});
    };

    window.addEventListener("pagehide", leaving);

    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("focus", refresh);

      window.removeEventListener("pagehide", leaving);
    };
  }, [flush]);

  async function selectConversation(id: string | null) {
    if (!accountId) {
      return;
    }

    try {
      await flush();

      const token = ++generation.current;

      setReady(false);

      await open(id, accountId, token);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not open this conversation.",
      );
    }
  }

  function field<K extends keyof AssistantConversationState>(
    key: K,
  ): Dispatch<SetStateAction<AssistantConversationState[K]>> {
    return (value) => {
      const current = session.current?.state ?? state;

      const next = {
        ...current,
        [key]:
          typeof value === "function"
            ? (
                value as (
                  previous: AssistantConversationState[K],
                ) => AssistantConversationState[K]
              )(current[key])
            : value,
      };

      if (session.current) {
        session.current.state = next;
      }

      setState(next);
    };
  }

  return {
    ...state,
    setDraft: field("draft"),
    setQuestions: field("questions"),
    setIncludeContext: field("includeContext"),
    conversations,
    activeId,
    historyReady: ready && session.current?.accountId === accountId,
    saveError,
    saving,
    flush,
    reloadSavedConversation: () => {
      if (accountId) {
        void open(
          activeId && session.current?.revision ? activeId : null,
          accountId,
          ++generation.current,
        ).catch((error) => {
          return setSaveError(
            error instanceof Error
              ? error.message
              : "Could not reopen the saved conversation.",
          );
        });
      }
    },
    retryHistory: () => {
      return ready ? void flush().catch(() => {}) : void load();
    },
    selectConversation,
  };
}
