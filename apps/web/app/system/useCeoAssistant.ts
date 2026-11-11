"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AssistantAction, AssistantReply } from "@freshphones/contracts";
import { tsResponse } from "@/lib/ts-api";
import { useAssistantHistory } from "./useAssistantHistory";
import { consumeAssistantStream } from "@/lib/assistant-stream";

export function useCeoAssistant(
  period: string,
  dataAvailable: boolean,
  reportRange?: { dateFrom: string; dateTo: string },
) {
  const history = useAssistantHistory();

  const {
    draft,
    setDraft,
    questions,
    setQuestions,
    includeContext,
    setIncludeContext,
  } = history;

  const [answerPending, setAnswerPending] = useState(false);

  const request = useRef<AbortController | null>(null);

  const input = useRef<HTMLTextAreaElement>(null);

  const transcript = useRef<HTMLDivElement>(null);

  const nextId = useRef(0);

  const followOutput = useRef(true);

  useEffect(() => {
    return () => {
      request.current?.abort();
    };
  }, []);

  function scrollToQuestion(position: "first" | "latest") {
    const viewport = transcript.current;

    const exchange =
      position === "first"
        ? (viewport?.querySelector("[data-exchange]") as HTMLElement | null)
        : (viewport?.lastElementChild as HTMLElement | null);

    if (!viewport || !exchange) {
      return;
    }

    followOutput.current = position === "latest";

    viewport.scrollTo({
      top:
        position === "latest"
          ? viewport.scrollHeight
          : Math.max(0, exchange.offsetTop - 24),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  useEffect(() => {
    const field = input.current;

    if (field) {
      field.style.height = "auto";

      field.style.height = `${Math.min(field.scrollHeight, 144)}px`;
    }
  }, [draft]);

  useEffect(() => {
    const viewport = transcript.current;

    const latest = viewport?.lastElementChild as HTMLElement | null;

    if (!viewport || !latest || !followOutput.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      viewport.scrollTo({
        top: questions.at(-1)?.response?.brief
          ? Math.max(0, latest.offsetTop - 24)
          : viewport.scrollHeight,
        behavior: "auto",
      });
    });

    return () => {
      return cancelAnimationFrame(frame);
    };
  }, [questions]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    const text = draft.trim();

    if (!text || request.current || !history.historyReady) {
      return;
    }

    const controller = new AbortController();

    request.current = controller;

    setAnswerPending(true);

    followOutput.current = true;

    const id =
      Math.max(
        nextId.current,
        ...questions.map((question) => {
          return question.id;
        }),
        0,
      ) + 1;

    nextId.current = id;

    const context = includeContext && dataAvailable ? period : null;

    setQuestions((current) => {
      return [
        ...current,
        {
          id,
          text,
          context,
          response: null,
          error: null,
          partial: "",
          status: "Preparing your answer",
        },
      ];
    });

    setDraft("");

    input.current?.focus({ preventScroll: true });

    try {
      await history.flush();

      const response = await tsResponse("/assistant/questions/stream", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          question: text,
          history: questions
            .flatMap((question) => {
              return [
                { role: "user" as const, content: question.text },
                ...(question.response
                  ? [
                      {
                        role: "assistant" as const,
                        content: question.response.paragraphs
                          .join("\n\n")
                          .slice(0, 6000),
                      },
                    ]
                  : []),
              ];
            })
            .slice(-12),
          ...(context
            ? { period: context, ...(reportRange ? { reportRange } : {}) }
            : {}),
        }),
      });

      await consumeAssistantStream(response, (event) => {
        if (controller.signal.aborted) {
          return;
        }

        setQuestions((current) => {
          return current.map((question) => {
            if (question.id !== id) {
              return question;
            }

            if (event.type === "delta") {
              return {
                ...question,
                partial: question.partial + event.text,
                status: "Writing your answer",
              };
            }

            if (event.type === "complete") {
              return {
                ...question,
                response: event.reply,
                status: "Answer ready",
              };
            }

            return event.type === "status"
              ? { ...question, status: event.label }
              : question;
          });
        });
      });

      await history.flush();
    } catch (error) {
      if (!controller.signal.aborted) {
        setQuestions((current) => {
          return current.map((question) => {
            return question.id === id
              ? {
                  ...question,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Could not load the Freshphones guide. Try again.",
                }
              : question;
          });
        });
      }
    } finally {
      if (request.current === controller) {
        request.current = null;

        setAnswerPending(false);
      }
    }
  }

  async function decideAction(
    questionId: number,
    actionId: string,
    decision: "confirm" | "cancel",
  ) {
    const update = (status: AssistantAction["status"], message?: string) => {
      setQuestions((current) => {
        return current.map((question) => {
          return question.id === questionId && question.response
            ? {
                ...question,
                response: {
                  ...question.response,
                  actions: question.response.actions?.map((action) => {
                    return action.id === actionId
                      ? { ...action, status, message }
                      : action;
                  }),
                },
              }
            : question;
        });
      });
    };

    update("executing");

    try {
      const response = await tsResponse(
        `/assistant/actions/${actionId}/decision`,
        {
          method: "POST",
          body: JSON.stringify({ decision }),
        },
      );

      const result = await response.json();

      update(result.status, result.message);
    } catch (error) {
      update(
        "failed",
        error instanceof Error
          ? error.message
          : "Could not confirm this action. Check the record before trying again.",
      );
    }
  }

  function selectPrompt(prompt: string) {
    setDraft(prompt);

    input.current?.focus({ preventScroll: true });

    input.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  function stopAnswer() {
    request.current?.abort();

    request.current = null;

    setAnswerPending(false);

    setQuestions((current) => {
      return current.map((question) => {
        return !question.response && !question.error
          ? { ...question, error: "Response stopped." }
          : question;
      });
    });
  }

  function newChat() {
    request.current?.abort();

    request.current = null;

    setAnswerPending(false);

    void history.selectConversation(null);

    input.current?.focus({ preventScroll: true });
  }

  return {
    ...history,
    openConversation: (id: string) => {
      stopAnswer();

      void history.selectConversation(id);
    },
    draft,
    answerPending,
    setDraft,
    questions,
    includeContext,
    setIncludeContext,
    input,
    transcript,
    onTranscriptScroll: () => {
      const viewport = transcript.current;

      if (viewport) {
        followOutput.current =
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
          80;
      }
    },
    submit,
    selectPrompt,
    newChat,
    stopAnswer,
    scrollToQuestion,
    decideAction,
  };
}
