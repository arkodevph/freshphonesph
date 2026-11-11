"use client";

import WorkspaceNativeSelect from "@/components/WorkspaceNativeSelect";
import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  CalendarBlank,
  ChatCircleDots,
  Check,
  CheckCircle,
  Copy,
  FileText,
  Info,
  Plus,
  Sparkle,
  Square,
  Stack,
} from "@phosphor-icons/react";
import { AssistantReportBrief } from "./AssistantReportBrief";
import { AssistantProgress } from "./AssistantProgress";
import { useCeoAssistant } from "./useCeoAssistant";
import styles from "./ceo-assistant.module.css";

const prompts = [
  {
    icon: CheckCircle,
    title: "Understand payments",
    description: "Make sense of verified and pending payments.",
    text: "Explain the difference between verified and pending payments.",
  },
  {
    icon: Stack,
    title: "Plan a new batch",
    description: "Know what to prepare before getting started.",
    text: "What information should I prepare before creating a Freshphones batch?",
  },
  {
    icon: FileText,
    title: "Summarize my reports",
    description: "See the numbers across your business.",
    text: "Can you summarize all company reports?",
  },
];

function CopyAnswer({ paragraphs }: { paragraphs: string[] }) {
  const [status, setStatus] = useState("Copy answer");

  return (
    <button
      type="button"
      className={styles.copyAnswer}
      aria-label={status}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(paragraphs.join("\n\n"));

          setStatus("Copied");
        } catch {
          setStatus("Could not copy");
        }
      }}
    >
      {status === "Copied" ? (
        <Check aria-hidden="true" />
      ) : (
        <Copy aria-hidden="true" />
      )}
      <span aria-live="polite">
        {status === "Copy answer" ? "Copy" : status}
      </span>
    </button>
  );
}

export default function CeoAssistant({
  period,
  reportRange,
  dataAvailable,
  pending,
  error,
  retry,
}: {
  period: string;
  reportRange?: { dateFrom: string; dateTo: string };
  dataAvailable: boolean;
  pending: boolean;
  error: string | null;
  retry: () => void;
}) {
  const {
    draft,
    answerPending,
    setDraft,
    questions,
    includeContext,
    setIncludeContext,
    input,
    transcript,
    submit,
    selectPrompt,
    newChat,
    stopAnswer,
    onTranscriptScroll,
    scrollToQuestion,
    decideAction,
    conversations,
    activeId,
    historyReady,
    saveError,
    saving,
    retryHistory,
    openConversation,
    reloadSavedConversation,
  } = useCeoAssistant(period, dataAvailable, reportRange);

  const help = useId();

  const hasConversation = questions.length > 0;

  return (
    <section
      className={styles.workspace}
      aria-label="Fresh AI workspace"
      data-conversation={hasConversation}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {questions.at(-1)?.error ?? questions.at(-1)?.status ?? ""}
      </p>
      <aside className={styles.contextRail} aria-label="Conversation context">
        <div className={styles.railBrand}>
          <span className={styles.brandMark}>
            <Sparkle aria-hidden="true" weight="fill" />
          </span>
          <span>
            Fresh AI<small>Your operations companion</small>
          </span>
        </div>
        <button
          type="button"
          className={styles.newChat}
          onClick={newChat}
          disabled={!historyReady}
        >
          <Plus aria-hidden="true" /> New conversation
        </button>
        <div className={styles.railSection}>
          <p className={styles.label}>
            SAVED CONVERSATIONS <span>{conversations.length || ""}</span>
          </p>
          <nav aria-label="Saved conversations" className={styles.historyList}>
            {conversations.map((conversation) => {
              return (
                <button
                  type="button"
                  key={conversation.id}
                  className={styles.currentChat}
                  aria-current={
                    conversation.id === activeId ? "page" : undefined
                  }
                  disabled={!historyReady || answerPending}
                  title={conversation.title}
                  onClick={() => {
                    return openConversation(conversation.id);
                  }}
                >
                  <ChatCircleDots aria-hidden="true" />
                  <span>{conversation.title}</span>
                </button>
              );
            })}
          </nav>
          {!conversations.length && (
            <p className={styles.railHint}>
              {historyReady
                ? "Your conversations will be saved to your account."
                : "Loading saved conversations…"}
            </p>
          )}
          <p className={styles.railHint} role="status">
            {saving
              ? "Saving conversation…"
              : historyReady
                ? "Conversations saved to your account."
                : ""}
          </p>
        </div>
        <div className={styles.railBottom}>
          <div className={styles.periodCard}>
            <p className={styles.label}>REPORTING PERIOD</p>
            <div className={styles.period}>
              <CalendarBlank aria-hidden="true" />
              <span>
                {pending && !dataAvailable
                  ? "Loading period…"
                  : dataAvailable
                    ? period
                    : "Period unavailable"}
              </span>
            </div>
            <p className={styles.railHint}>
              Optional date context for your questions.
            </p>
            {error && (
              <div className={styles.reportError} role="status">
                <p>Could not load the report period.</p>
                <button type="button" onClick={retry} disabled={pending}>
                  Try again
                </button>
              </div>
            )}
          </div>
          <Link href="/system/reports">
            <FileText aria-hidden="true" /> Open company reports
          </Link>
          <p className={styles.workspaceLabel}>
            FRESH PHONES PH <span>Owner / CEO</span>
          </p>
        </div>
      </aside>
      <div
        className={`${styles.main} ${hasConversation ? styles.hasConversation : ""}`}
      >
        <header className={styles.workspaceHeader}>
          <span className={styles.conversationTitle}>
            <Sparkle aria-hidden="true" />
            <span>
              Fresh AI<small>Freshphones workspace</small>
            </span>
          </span>
          <WorkspaceNativeSelect
            className={styles.mobileHistory}
            aria-label="Open saved conversation"
            value={
              conversations.some((item) => {
                return item.id === activeId;
              })
                ? (activeId ?? "")
                : ""
            }
            disabled={!historyReady || answerPending}
            onChange={(event) => {
              return event.target.value
                ? openConversation(event.target.value)
                : newChat();
            }}
          >
            <option value="">New conversation</option>
            {conversations.map((item) => {
              return (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              );
            })}
          </WorkspaceNativeSelect>
          {hasConversation && (
            <button
              type="button"
              className={styles.latestQuestion}
              onClick={() => {
                return scrollToQuestion("latest");
              }}
            >
              <ChatCircleDots aria-hidden="true" />
              Latest reply
            </button>
          )}
          <span className={styles.status}>
            <Info aria-hidden="true" />
            Freshphones assistant
          </span>
          <button
            type="button"
            className={styles.mobileNew}
            aria-label="New conversation"
            disabled={!historyReady}
            onClick={newChat}
          >
            <Plus aria-hidden="true" />
          </button>
        </header>
        {saveError && (
          <div className={styles.historyError} role="alert">
            <span>{saveError}</span>
            <button type="button" onClick={retryHistory}>
              Retry saving or loading
            </button>
            <button type="button" onClick={reloadSavedConversation}>
              Use saved version instead
            </button>
          </div>
        )}
        <div className={styles.content}>
          {hasConversation ? (
            <div
              ref={transcript}
              className={styles.transcript}
              role="log"
              aria-label="Conversation"
              aria-live="off"
              onScroll={onTranscriptScroll}
              tabIndex={0}
            >
              <p className={styles.conversationStart}>A fresh conversation</p>
              {questions.map((question) => {
                return (
                  <div
                    className={styles.exchange}
                    key={question.id}
                    data-exchange
                  >
                    <div className={styles.question}>
                      <span className="sr-only">You</span>
                      <p>{question.text}</p>
                      {question.context && (
                        <small title={question.context}>
                          <CalendarBlank aria-hidden="true" />
                          Period included
                        </small>
                      )}
                    </div>
                    <div className={styles.reply} data-assistant-response>
                      <span className={styles.replyMark}>
                        <Sparkle weight="fill" aria-hidden="true" />
                      </span>
                      {question.response ? (
                        <div>
                          <strong className={styles.replyName}>Fresh AI</strong>
                          {question.response.brief && (
                            <AssistantReportBrief
                              brief={question.response.brief}
                            />
                          )}
                          <div className={styles.answerText}>
                            {!question.response.brief &&
                              question.response.paragraphs.map(
                                (paragraph, index) => {
                                  return <p key={index}>{paragraph}</p>;
                                },
                              )}
                          </div>
                          {question.response.actions?.map((action) => {
                            return (
                              <section
                                key={action.id}
                                className={styles.interruption}
                                aria-label="Proposed change"
                              >
                                <strong className={styles.replyName}>
                                  {action.operation}
                                </strong>
                                <p>{action.description}</p>
                                <pre
                                  style={{
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                    fontSize: 12,
                                    marginBlock: 12,
                                  }}
                                >
                                  {JSON.stringify(action.input, null, 2)}
                                </pre>
                                {action.status === "pending" ? (
                                  <>
                                    <p>
                                      Review these exact details. Expires{" "}
                                      {new Date(
                                        action.expiresAt,
                                      ).toLocaleTimeString()}
                                      .
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        return void decideAction(
                                          question.id,
                                          action.id,
                                          "confirm",
                                        );
                                      }}
                                    >
                                      Confirm change
                                    </button>{" "}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        return void decideAction(
                                          question.id,
                                          action.id,
                                          "cancel",
                                        );
                                      }}
                                    >
                                      Cancel change
                                    </button>
                                  </>
                                ) : (
                                  <p role="status">
                                    {action.message ??
                                      "Submitting your decision…"}
                                  </p>
                                )}
                              </section>
                            );
                          })}
                          {question.response.links.map((link) => {
                            return (
                              <Link
                                className={styles.reportLink}
                                key={link.href}
                                href={link.href}
                              >
                                <FileText aria-hidden="true" />
                                {link.label}
                              </Link>
                            );
                          })}
                          <div className={styles.replyActions}>
                            <CopyAnswer
                              paragraphs={question.response.paragraphs}
                            />
                            {question.response.sources.length > 0 && (
                              <details className={styles.sources}>
                                <summary>
                                  Sources{" "}
                                  <span>
                                    {question.response.sources.length}
                                  </span>
                                </summary>
                                <p>{question.response.sources.join(" · ")}</p>
                              </details>
                            )}
                          </div>
                        </div>
                      ) : question.error ? (
                        <div>
                          {question.partial && (
                            <div className={styles.streamingText}>
                              {question.partial}
                            </div>
                          )}
                          <div role="alert" className={styles.interruption}>
                            <strong className={styles.replyName}>
                              {question.error === "Response stopped."
                                ? "Response stopped"
                                : "Could not load an answer"}
                            </strong>
                            <p>
                              {question.error === "Response stopped."
                                ? "Your question is here whenever you want to try again."
                                : question.error}
                            </p>
                            <button
                              type="button"
                              className={styles.tryDemo}
                              onClick={() => {
                                return selectPrompt(question.text);
                              }}
                            >
                              Try this question again
                            </button>
                          </div>
                          {question.partial && (
                            <CopyAnswer paragraphs={[question.partial]} />
                          )}
                        </div>
                      ) : (
                        <div aria-busy="true">
                          <strong className={styles.replyName}>Fresh AI</strong>
                          {question.partial ? (
                            <div className={styles.streamingText}>
                              {question.partial}
                              <span
                                className={styles.streamCaret}
                                aria-hidden="true"
                              />
                            </div>
                          ) : (
                            <AssistantProgress label={question.status} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.welcome}>
              <span className={styles.assistantMark}>
                <Sparkle aria-hidden="true" weight="fill" />
              </span>
              <p className={styles.eyebrow}>A LITTLE CLARITY FOR YOUR DAY</p>
              <h1>What can we work through?</h1>
              <p>
                Payments, batches, and the everyday details.
                <br />
                Let’s make sense of it together.
              </p>
            </div>
          )}
          <div className={styles.composerArea}>
            <form className={styles.composer} onSubmit={submit}>
              <label className={styles.composerLabel} htmlFor={`${help}-input`}>
                Ask Fresh AI
              </label>
              <textarea
                id={`${help}-input`}
                ref={input}
                aria-describedby={help}
                placeholder={
                  hasConversation
                    ? "Ask another Freshphones question…"
                    : "Ask anything about Freshphones…"
                }
                disabled={!historyReady}
                value={draft}
                maxLength={2000}
                enterKeyHint="send"
                rows={1}
                onChange={(event) => {
                  return setDraft(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();

                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className={styles.composerTools}>
                <button
                  type="button"
                  className={styles.periodToggle}
                  disabled={!dataAvailable}
                  aria-pressed={dataAvailable && includeContext}
                  title={
                    dataAvailable
                      ? `Date label only: ${period}`
                      : "Reporting period unavailable"
                  }
                  onClick={() => {
                    return setIncludeContext(!includeContext);
                  }}
                >
                  <CalendarBlank aria-hidden="true" />
                  <span>
                    {dataAvailable
                      ? includeContext
                        ? "Period included"
                        : "Include period"
                      : "Period unavailable"}
                  </span>
                  {dataAvailable && includeContext && (
                    <Check aria-hidden="true" />
                  )}
                </button>
                <span className={styles.keyboardHint}>Enter to send</span>
                {answerPending ? (
                  <button
                    className={styles.send}
                    type="button"
                    onClick={stopAnswer}
                    aria-label="Stop generating"
                  >
                    <Square aria-hidden="true" weight="fill" />
                  </button>
                ) : (
                  <button
                    className={styles.send}
                    type="submit"
                    disabled={!draft.trim() || !historyReady}
                    aria-label="Ask Freshphones question"
                  >
                    <ArrowUp aria-hidden="true" weight="bold" />
                  </button>
                )}
              </div>
            </form>
            <div className={styles.composerFooter} id={help}>
              <span>Live data · changes require your confirmation.</span>
              <span>
                {draft.length
                  ? `${draft.length.toLocaleString()}/2,000`
                  : "Shift + Enter for a new line"}
              </span>
            </div>
          </div>
          {!hasConversation && (
            <div className={styles.starters}>
              <p className={styles.startersLabel}>NOT SURE WHERE TO START?</p>
              <div
                className={styles.suggestions}
                role="group"
                aria-label="Suggested questions"
              >
                {prompts.map(({ icon: Icon, title, description, text }) => {
                  return (
                    <button
                      type="button"
                      key={title}
                      onClick={() => {
                        return selectPrompt(text);
                      }}
                    >
                      <span className={styles.promptIcon}>
                        <Icon aria-hidden="true" />
                      </span>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {!hasConversation && (
          <p className={styles.note}>
            Built around Freshphones. Here to help you understand.
          </p>
        )}
      </div>
    </section>
  );
}
