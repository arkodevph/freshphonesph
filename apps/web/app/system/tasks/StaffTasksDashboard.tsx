"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ListChecks } from "@phosphor-icons/react";
import { ApiError, tsDownload, tsRequest, tsUpload } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { can, useMe } from "@/lib/useMe";
import styles from "./staff-tasks.module.css";
import StaffTaskDialog from "./StaffTaskDialog";
import {
  Assignee,
  deadlineDefault,
  formatDate,
  label,
  message,
  Page,
  Pagination,
  Priority,
  Review,
  Status,
  Task,
  TaskLocationSync,
} from "./task-view";
import TaskFiltersPanel from "./TaskFiltersPanel";

export default function StaffTasksDashboard() {
  const me = useMe();

  if (!me) {
    return <p role="status">Loading task access…</p>;
  }

  if (me.account_type !== "employee") {
    return (
      <section>
        <h1>No access</h1>
        <p>Staff access is required for tasks.</p>
      </section>
    );
  }

  return (
    <TaskWorkspace
      key={`${me.id}:${can(me, "TASK_ASSIGN")}:${can(me, "KPI_REVIEW")}`}
      me={me}
    />
  );
}

function TaskWorkspace({ me }: { me: NonNullable<ReturnType<typeof useMe>> }) {
  const canAssign = can(me, "TASK_ASSIGN");

  const canReview = can(me, "KPI_REVIEW");

  const [tasks, setTasks] = useState<Page<Task> | null>(null);

  const [queue, setQueue] = useState<Page<Task> | null>(null);

  const [history, setHistory] = useState<Page<Review> | null>(null);

  const [assignees, setAssignees] = useState<Assignee[]>([]);

  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const [queuePage, setQueuePage] = useState(1);

  const [historyPage, setHistoryPage] = useState(1);

  const [activeId, setActiveId] = useState<string | null>(null);

  const [active, setActive] = useState<Task | null>(null);

  const [linkedId, setLinkedId] = useState<string | null>(null);

  const [activeChanged, setActiveChanged] = useState(false);

  const [loadingDetail, setLoadingDetail] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    instructions: "",
    assigneeId: "",
    priority: "MEDIUM" as Priority,
    deadline: deadlineDefault(),
  });

  const [report, setReport] = useState("");

  const [attachment, setAttachment] = useState<File | null>(null);

  const [evaluation, setEvaluation] = useState("");

  const [recommendation, setRecommendation] = useState("");

  const [decision, setDecision] = useState("NOTED");

  const dialog = useRef<HTMLDialogElement>(null);

  const activeTaskId = useRef<string | null>(null);

  const detailSequence = useRef(0);

  const listSequence = useRef(0);

  const draft = useRef(false);

  const activeSnapshot = useRef(active);

  activeSnapshot.current = active;

  const mutationBusy = useRef(busy);

  mutationBusy.current = busy;

  draft.current = Boolean(
    report.trim() ||
    attachment ||
    evaluation.trim() ||
    recommendation.trim() ||
    decision !== "NOTED",
  );

  const staff = Boolean(me && me.account_type === "employee");

  const reload = useCallback(async () => {
    if (!staff) {
      return;
    }

    const request = ++listSequence.current;

    try {
      const [taskData, queueData, historyData] = await Promise.all([
        tsRequest<Page<Task>>(
          `/tasks?page=${page}${status ? `&status=${status}` : ""}`,
        ),
        canReview
          ? tsRequest<Page<Task>>(`/kpi/queue?page=${queuePage}`)
          : Promise.resolve(null),
        canReview
          ? tsRequest<Page<Review>>(`/kpi/reviews?page=${historyPage}`)
          : Promise.resolve(null),
      ]);

      if (request !== listSequence.current) {
        return;
      }

      setTasks(taskData);

      setQueue(queueData);

      setHistory(historyData);
    } catch (caught) {
      if (request === listSequence.current) {
        setError(message(caught));
      }
    }
  }, [staff, page, status, canReview, queuePage, historyPage]);

  const refreshActive = useCallback(async () => {
    const id = activeTaskId.current;

    if (
      !staff ||
      !id ||
      mutationBusy.current ||
      activeSnapshot.current?.id !== id
    ) {
      return;
    }

    const request = ++detailSequence.current;

    try {
      const latest = await tsRequest<Task>(`/tasks/${id}`);

      if (request !== detailSequence.current || activeTaskId.current !== id) {
        return;
      }

      // Keep the record version captured when the report/review editor opened.
      if (
        activeSnapshot.current?.id === id &&
        activeSnapshot.current.version !== latest.version
      ) {
        setActiveChanged(true);
      } else {
        setActive(latest);
      }
    } catch (caught) {
      if (request !== detailSequence.current || activeTaskId.current !== id) {
        return;
      }

      setError(message(caught));

      if (caught instanceof ApiError && [403, 404].includes(caught.status)) {
        dialog.current?.close();

        activeTaskId.current = null;

        setActiveId(null);

        setActive(null);
      }
    }
  }, [staff]);

  useEffect(() => {
    void reload();

    return () => {
      listSequence.current++;
    };
  }, [reload]);

  useEffect(() => {
    if (!canAssign) {
      return;
    }

    void tsRequest<Assignee[]>("/tasks/assignees")
      .then(setAssignees)
      .catch((caught) => {
        return setError(message(caught));
      });
  }, [canAssign]);

  useLiveRecords(() => {
    void reload();

    void refreshActive();
  }, staff);

  const openTask = useCallback(async (id: string) => {
    if (activeTaskId.current === id) {
      return;
    }

    if (
      activeTaskId.current &&
      draft.current &&
      !window.confirm(
        "Discard your unsaved task report or review and open the linked task?",
      )
    ) {
      window.history.replaceState(
        null,
        "",
        `/system/tasks?task=${activeTaskId.current}`,
      );

      return;
    }

    const request = ++detailSequence.current;

    activeTaskId.current = id;

    setActiveChanged(false);

    setActiveId(id);

    setActive(null);

    setLoadingDetail(true);

    setError("");

    setNotice("");

    setReport("");

    setAttachment(null);

    setEvaluation("");

    setRecommendation("");

    setDecision("NOTED");

    if (!dialog.current?.open) {
      dialog.current?.showModal();
    }

    try {
      const task = await tsRequest<Task>(`/tasks/${id}`);

      if (request === detailSequence.current && activeTaskId.current === id) {
        setActive(task);
      }
    } catch (caught) {
      if (request === detailSequence.current) {
        setError(message(caught));

        dialog.current?.close();

        activeTaskId.current = null;

        setActiveId(null);
      }
    } finally {
      if (request === detailSequence.current) {
        setLoadingDetail(false);
      }
    }
  }, []);

  useEffect(() => {
    if (staff && linkedId) {
      void openTask(linkedId);
    }
  }, [staff, linkedId, openTask]);

  function clearTask() {
    detailSequence.current++;

    activeTaskId.current = null;

    setActiveId(null);

    setActive(null);

    setActiveChanged(false);

    setReport("");

    setAttachment(null);

    setEvaluation("");

    setRecommendation("");

    setDecision("NOTED");

    if (new URLSearchParams(window.location.search).has("task")) {
      window.history.replaceState(null, "", "/system/tasks");
    }
  }

  function closeTask() {
    if (
      busy ||
      (draft.current &&
        !window.confirm("Discard your unsaved task report or review?"))
    ) {
      return;
    }

    dialog.current?.close();

    clearTask();
  }

  async function loadLatestTask() {
    if (
      !active ||
      (draft.current &&
        !window.confirm(
          "Discard your unsaved task report or review and load the latest task?",
        ))
    ) {
      return;
    }

    const id = active.id;

    activeTaskId.current = null;

    await openTask(id);
  }

  async function mutate(run: () => Promise<unknown>, success: string) {
    setBusy(true);

    setError("");

    setNotice("");

    try {
      await run();

      setNotice(success);

      await reload();

      if (activeId && activeTaskId.current === activeId) {
        const request = ++detailSequence.current;

        const latest = await tsRequest<Task>(`/tasks/${activeId}`);

        if (
          request === detailSequence.current &&
          activeTaskId.current === activeId
        ) {
          setActive(latest);

          setActiveChanged(false);
        }
      }

      return true;
    } catch (caught) {
      setError(message(caught));

      return false;
    } finally {
      setBusy(false);
    }
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      await mutate(() => {
        return tsRequest("/tasks", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            deadline: new Date(form.deadline).toISOString(),
          }),
        });
      }, "Task assigned.")
    ) {
      setForm((current) => {
        return { ...current, title: "", instructions: "" };
      });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!active || activeChanged || (!report.trim() && !attachment)) {
      return;
    }

    const data = new FormData();

    data.set("version", String(active.version));

    data.set("report", report.trim());

    if (attachment) {
      data.set("attachment", attachment);
    }

    if (
      await mutate(() => {
        return tsUpload(`/tasks/${active.id}/submit`, data);
      }, "Work submitted for review.")
    ) {
      setReport("");

      setAttachment(null);
    }
  }

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!active || activeChanged) {
      return;
    }

    await mutate(() => {
      return tsRequest("/kpi/reviews", {
        method: "POST",
        body: JSON.stringify({
          taskId: active.id,
          version: active.version,
          evaluation: evaluation.trim(),
          recommendation: recommendation.trim(),
          decision,
        }),
      });
    }, "KPI review recorded.");
  }

  async function download(task: Task) {
    try {
      const blob = await tsDownload(`/tasks/${task.id}/attachment`);

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = task.attachment?.fileName ?? "task-evidence";

      link.click();

      window.setTimeout(() => {
        return URL.revokeObjectURL(url);
      }, 1000);
    } catch (caught) {
      setError(message(caught));
    }
  }

  if (me && !staff) {
    return (
      <section>
        <h1>No access</h1>
        <p>Staff access is required for tasks.</p>
      </section>
    );
  }

  return (
    <main className={styles.page}>
      <Suspense fallback={null}>
        <TaskLocationSync onTask={setLinkedId} />
      </Suspense>
      <header className={styles.header}>
        <div className={styles.icon}>
          <ListChecks weight="duotone" />
        </div>
        <div>
          <span className={styles.eyebrow}>Staff operations</span>
          <h1>Tasks &amp; KPI</h1>
          <p>
            Assign work, submit evidence, and record a human review of late
            submissions.
          </p>
        </div>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.success} role="status">
          {notice}
        </p>
      )}

      {canAssign && (
        <TaskFiltersPanel
          assign={assign}
          form={form}
          setForm={setForm}
          assignees={assignees}
          busy={busy}
        />
      )}

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrow}>Work list</span>
            <h2>{canAssign ? "All staff tasks" : "My tasks"}</h2>
          </div>
          <label className={styles.filter}>
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);

                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {(["TODO", "IN_PROGRESS", "SUBMITTED", "DONE"] as Status[]).map(
                (item) => {
                  return (
                    <option key={item} value={item}>
                      {label(item)}
                    </option>
                  );
                },
              )}
            </select>
          </label>
        </div>
        {!tasks ? (
          <p className={styles.empty}>Loading tasks…</p>
        ) : tasks.results.length === 0 ? (
          <p className={styles.empty}>No tasks in this view.</p>
        ) : (
          <div className={styles.list}>
            {tasks.results.map((task) => {
              return (
                <article className={styles.taskRow} key={task.id}>
                  <div className={styles.taskMain}>
                    <strong>{task.title}</strong>
                    <span>
                      {task.assigneeName} · Due {formatDate(task.deadline)}
                    </span>
                  </div>
                  <span
                    className={styles.priority}
                    data-priority={task.priority}
                  >
                    {label(task.priority)}
                  </span>
                  <span className={styles.badge} data-status={task.status}>
                    {label(task.status)}
                  </span>
                  <span className={styles.timing}>
                    {task.lateFlag === null
                      ? "—"
                      : task.lateFlag
                        ? "Late"
                        : "On time"}
                  </span>
                  <button
                    className={styles.secondary}
                    type="button"
                    onClick={() => {
                      return void openTask(task.id);
                    }}
                  >
                    View task
                  </button>
                </article>
              );
            })}
          </div>
        )}
        {tasks && <Pagination data={tasks} setPage={setPage} />}
      </section>

      {canReview && (
        <div className={styles.reviewGrid}>
          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.eyebrow}>Needs context</span>
                <h2>KPI review queue</h2>
              </div>
              <strong className={styles.count}>{queue?.count ?? 0}</strong>
            </div>
            <p className={styles.help}>
              A late flag compares timestamps. HR/Owner records the evaluation
              and decision.
            </p>
            {!queue ? (
              <p className={styles.empty}>Loading queue…</p>
            ) : queue.results.length === 0 ? (
              <p className={styles.empty}>
                No late submissions awaiting review.
              </p>
            ) : (
              queue.results.map((task) => {
                return (
                  <div className={styles.reviewRow} key={task.id}>
                    <div>
                      <strong>{task.title}</strong>
                      <span>
                        {task.assigneeName} · Submitted{" "}
                        {task.submittedAt ? formatDate(task.submittedAt) : "—"}
                      </span>
                    </div>
                    <button
                      className={styles.secondary}
                      type="button"
                      onClick={() => {
                        return void openTask(task.id);
                      }}
                    >
                      Review
                    </button>
                  </div>
                );
              })
            )}
            {queue && <Pagination data={queue} setPage={setQueuePage} />}
          </section>
          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.eyebrow}>Recorded decisions</span>
                <h2>Review history</h2>
              </div>
            </div>
            {!history ? (
              <p className={styles.empty}>Loading reviews…</p>
            ) : history.results.length === 0 ? (
              <p className={styles.empty}>No reviews recorded yet.</p>
            ) : (
              history.results.map((item) => {
                return (
                  <div className={styles.reviewRow} key={item.id}>
                    <div>
                      <strong>{item.taskTitle}</strong>
                      <span>
                        {item.assigneeName} · {label(item.decision)} ·{" "}
                        {formatDate(item.createdAt)}
                      </span>
                      <p>{item.evaluation}</p>
                    </div>
                    <button
                      className={styles.secondary}
                      type="button"
                      onClick={() => {
                        return void openTask(item.taskId);
                      }}
                    >
                      View task
                    </button>
                  </div>
                );
              })
            )}
            {history && <Pagination data={history} setPage={setHistoryPage} />}
          </section>
        </div>
      )}

      <StaffTaskDialog
        dialog={dialog}
        clearTask={clearTask}
        busy={busy}
        draft={draft}
        active={active}
        closeTask={closeTask}
        activeChanged={activeChanged}
        loadLatestTask={loadLatestTask}
        error={error}
        notice={notice}
        loadingDetail={loadingDetail}
        download={download}
        canReview={canReview}
        me={me}
        mutate={mutate}
        submit={submit}
        report={report}
        setReport={setReport}
        setAttachment={setAttachment}
        attachment={attachment}
        review={review}
        evaluation={evaluation}
        setEvaluation={setEvaluation}
        recommendation={recommendation}
        setRecommendation={setRecommendation}
        decision={decision}
        setDecision={setDecision}
        canAssign={canAssign}
      />
    </main>
  );
}
