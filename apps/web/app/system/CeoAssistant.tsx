"use client";

import { AssistantSidebar } from "./AssistantSidebar";
import { useWorkspaceMotion } from "@/lib/useWorkspaceMotion";
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
  Plus,
  Square,
  Stack,
} from "@phosphor-icons/react";
import { AssistantReportBrief } from "./AssistantReportBrief";
import { AssistantProgress } from "./AssistantProgress";
import {
  AssistantStreamingText,
  AssistantAnswer,
} from "./AssistantStreamingText";
import { CloudMark } from "./CloudMark";
import { useCeoAssistant } from "./useCeoAssistant";
import styles from "./ceo-assistant.module.css";

const prompts = [
  {
    icon: CheckCircle,
    title: "Understand payments",
    text: "Explain the difference between verified and pending payments.",
  },
  {
    icon: Stack,
    title: "Plan a new batch",
    text: "What information should I prepare before creating a Freshphones batch?",
  },
  {
    icon: FileText,
    title: "Summarize my reports",
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
    projects,
    editConversation,
    removeConversation,
    createProject,
    renameProject,
    removeProject,
    activeId,
    historyReady,
    saveError,
    saving,
    retryHistory,
    openConversation,
    reloadSavedConversation,
  } = useCeoAssistant(period, dataAvailable, reportRange);

  const motion = useWorkspaceMotion<HTMLElement>();

  const help = useId();

  const hasConversation = questions.length > 0;

  const conversationTitle =
    conversations.find((conversation) => {
      return conversation.id === activeId;
    })?.title ?? "New conversation";

  return (
    <section
      ref={motion}
      className={styles.workspace}
      aria-label="Cloud workspace"
      data-conversation={hasConversation}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {questions.at(-1)?.error ?? questions.at(-1)?.status ?? ""}
      </p>
      <AssistantSidebar
        conversations={conversations}
        projects={projects}
        activeId={activeId}
        busy={!historyReady || answerPending}
        onNew={newChat}
        onOpen={openConversation}
        onEdit={editConversation}
        onDelete={removeConversation}
        onCreateProject={createProject}
        onRenameProject={renameProject}
        onDeleteProject={removeProject}
      >
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
      </AssistantSidebar>
      <div
        className={`${styles.main} ${hasConversation ? styles.hasConversation : ""}`}
      >
        <header className={styles.workspaceHeader}>
          <span className={styles.conversationTitle}>{conversationTitle}</span>
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
                        <CloudMark
                          active={
                            !question.partial &&
                            !question.response &&
                            !question.error
                          }
                        />
                      </span>
                      {question.response ? (
                        <div>
                          <strong className={styles.replyName}>Cloud</strong>
                          {question.response.brief && (
                            <AssistantReportBrief
                              brief={question.response.brief}
                            />
                          )}
                          <div className={styles.answerText}>
                            {!question.response.brief && (
                              <AssistantAnswer
                                paragraphs={question.response.paragraphs}
                              />
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
                          <strong className={styles.replyName}>Cloud</strong>
                          {question.partial ? (
                            <AssistantStreamingText text={question.partial} />
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
                <CloudMark />
              </span>
              <h2>What’s on your mind?</h2>
            </div>
          )}
          <div className={styles.composerArea}>
            <form className={styles.composer} onSubmit={submit}>
              <label className="sr-only" htmlFor={`${help}-input`}>
                Ask Cloud
              </label>
              <textarea
                id={`${help}-input`}
                ref={input}
                aria-describedby={help}
                placeholder={
                  hasConversation ? "Ask Cloud a follow-up…" : "Ask Cloud…"
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
                      ? `Reporting period: ${period}`
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
              <div
                className={styles.suggestions}
                role="group"
                aria-label="Suggested questions"
              >
                {prompts.map(({ icon: Icon, title, text }) => {
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
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
