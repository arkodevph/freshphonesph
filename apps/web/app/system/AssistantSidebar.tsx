"use client";

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from "react";
import {
  Plus,
  DotsThree,
  FolderSimple,
  Chats,
  Trash,
  X,
} from "@phosphor-icons/react";
import type {
  AssistantConversationSummary,
  AssistantProject,
} from "@freshphones/contracts";
import { createStyleSpring } from "@/lib/style-spring";
import { useSpringDialog } from "@/lib/useSpringDialog";
import styles from "./ceo-assistant.module.css";

type Editor = {
  kind: "conversation" | "project" | "create";
  id: string;
  name: string;
  projectId: string;
};

type Props = {
  conversations: AssistantConversationSummary[];
  projects: AssistantProject[];
  activeId: string | null;
  busy: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
  onEdit: (
    id: string,
    changes: { title?: string; projectId?: string | null },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateProject: (name: string) => Promise<void>;
  onRenameProject: (id: string, name: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  children: ReactNode;
};

export function AssistantSidebar(props: Props) {
  const [folder, setFolder] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(false);

  const [editor, setEditor] = useState<Editor | null>(null);

  const [open, setOpen] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [working, setWorking] = useState(false);

  const dialog = useRef<HTMLDialogElement>(null);

  const rail = useRef<HTMLElement>(null);

  const railMotion = useRef<ReturnType<typeof createStyleSpring> | null>(null);

  const [mobile, setMobile] = useState(false);

  useLayoutEffect(() => {
    if (!rail.current) {
      return;
    }

    const spring = createStyleSpring(rail.current, { "--library-open": 0 });

    railMotion.current = spring;

    return () => {
      spring.dispose();

      railMotion.current = null;
    };
  }, []);

  useEffect(() => {
    railMotion.current?.to({ "--library-open": expanded ? 1 : 0 });
  }, [expanded]);

  useEffect(() => {
    const query = matchMedia("(max-width: 760px)");

    const update = () => {
      return setMobile(query.matches);
    };

    update();

    query.addEventListener("change", update);

    return () => {
      return query.removeEventListener("change", update);
    };
  }, []);

  useSpringDialog(dialog, open, () => {
    return setEditor(null);
  });

  const visible = props.conversations.filter((item) => {
    return folder === null || item.projectId === folder;
  });

  function edit(value: Editor) {
    setEditor(value);

    setError(null);

    setDeleting(false);

    setOpen(true);
  }

  async function save() {
    if (!editor || working) {
      return;
    }

    setWorking(true);

    setError(null);

    try {
      if (deleting) {
        if (editor.kind === "conversation") {
          await props.onDelete(editor.id);
        } else {
          await props.onDeleteProject(editor.id);

          if (folder === editor.id) {
            setFolder(null);
          }
        }
      } else if (editor.kind === "create") {
        await props.onCreateProject(editor.name.trim());
      } else if (editor.kind === "project") {
        await props.onRenameProject(editor.id, editor.name.trim());
      } else {
        await props.onEdit(editor.id, {
          title: editor.name.trim(),
          projectId: editor.projectId || null,
        });
      }

      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save. Try again.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.mobileLibrary}
        aria-expanded={expanded}
        aria-controls="cloud-library"
        onClick={() => {
          return setExpanded(!expanded);
        }}
      >
        <Chats aria-hidden="true" /> Chats & projects
      </button>
      <aside
        ref={rail}
        inert={mobile && !expanded}
        className={styles.contextRail}
        id="cloud-library"
        aria-label="Conversations and projects"
        data-expanded={expanded}
      >
        <button
          type="button"
          className={styles.newChat}
          disabled={props.busy}
          onClick={() => {
            props.onNew();

            setExpanded(false);
          }}
        >
          <Plus aria-hidden="true" /> New conversation
        </button>
        <div className={styles.libraryScroll}>
          <div className={styles.railSection}>
            <div className={styles.label}>
              Projects{" "}
              <button
                type="button"
                aria-label="Create project"
                disabled={props.busy}
                onClick={() => {
                  return edit({
                    kind: "create",
                    id: "",
                    name: "",
                    projectId: "",
                  });
                }}
              >
                <Plus aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className={styles.projectRow}
              aria-current={folder === null ? "page" : undefined}
              onClick={() => {
                return setFolder(null);
              }}
            >
              <Chats aria-hidden="true" />
              <span>All conversations</span>
              <small>{props.conversations.length}</small>
            </button>
            {props.projects.map((project) => {
              return (
                <div className={styles.libraryRow} key={project.id}>
                  <button
                    type="button"
                    className={styles.projectRow}
                    aria-current={folder === project.id ? "page" : undefined}
                    onClick={() => {
                      return setFolder(project.id);
                    }}
                  >
                    <FolderSimple aria-hidden="true" />
                    <span>{project.name}</span>
                    <small>
                      {
                        props.conversations.filter((item) => {
                          return item.projectId === project.id;
                        }).length
                      }
                    </small>
                  </button>
                  <button
                    type="button"
                    className={styles.rowOptions}
                    aria-label={`Manage project ${project.name}`}
                    disabled={props.busy}
                    onClick={() => {
                      return edit({
                        kind: "project",
                        id: project.id,
                        name: project.name,
                        projectId: "",
                      });
                    }}
                  >
                    <DotsThree aria-hidden="true" weight="bold" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className={styles.railSection}>
            <p className={styles.label}>
              {folder
                ? props.projects.find((item) => {
                    return item.id === folder;
                  })?.name
                : "Recent conversations"}
            </p>
            <nav
              aria-label="Saved conversations"
              className={styles.historyList}
            >
              {visible.map((conversation) => {
                return (
                  <div className={styles.libraryRow} key={conversation.id}>
                    <button
                      type="button"
                      className={styles.currentChat}
                      aria-current={
                        conversation.id === props.activeId ? "page" : undefined
                      }
                      disabled={props.busy}
                      title={conversation.title}
                      onClick={() => {
                        props.onOpen(conversation.id);

                        setExpanded(false);
                      }}
                    >
                      <span>{conversation.title}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.rowOptions}
                      aria-label={`Manage conversation ${conversation.title}`}
                      disabled={props.busy}
                      onClick={() => {
                        return edit({
                          kind: "conversation",
                          id: conversation.id,
                          name: conversation.title,
                          projectId: conversation.projectId ?? "",
                        });
                      }}
                    >
                      <DotsThree aria-hidden="true" weight="bold" />
                    </button>
                  </div>
                );
              })}
            </nav>
            {!visible.length && (
              <p className={styles.railHint}>
                {props.busy
                  ? "Loading conversations…"
                  : "No conversations here yet."}
              </p>
            )}
          </div>
        </div>
        {props.children}
      </aside>
      <dialog
        ref={dialog}
        className={styles.libraryDialog}
        aria-labelledby="cloud-editor-title"
        onCancel={(event) => {
          event.preventDefault();

          if (!working) {
            setOpen(false);
          }
        }}
      >
        {editor && (
          <form
            onSubmit={(event) => {
              event.preventDefault();

              void save();
            }}
          >
            <header>
              <h2 id="cloud-editor-title">
                {deleting
                  ? editor.kind === "conversation"
                    ? "Delete conversation?"
                    : "Remove project?"
                  : editor.kind === "create"
                    ? "New project"
                    : editor.kind === "project"
                      ? "Edit project"
                      : "Edit conversation"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                disabled={working}
                onClick={() => {
                  return setOpen(false);
                }}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            {deleting ? (
              <p>
                {editor.kind === "conversation"
                  ? "This permanently deletes this conversation and its messages."
                  : "Conversations will stay in All conversations. Only the project folder is removed."}
              </p>
            ) : (
              <>
                <label htmlFor="cloud-editor-name">
                  {editor.kind === "conversation" ? "Title" : "Project name"}
                </label>
                <input
                  id="cloud-editor-name"
                  value={editor.name}
                  maxLength={100}
                  required
                  autoFocus
                  disabled={working}
                  onChange={(event) => {
                    return setEditor({ ...editor, name: event.target.value });
                  }}
                />
                {editor.kind === "conversation" && (
                  <>
                    <label htmlFor="cloud-editor-project">Project</label>
                    <select
                      id="cloud-editor-project"
                      value={editor.projectId}
                      disabled={working}
                      onChange={(event) => {
                        return setEditor({
                          ...editor,
                          projectId: event.target.value,
                        });
                      }}
                    >
                      <option value="">No project</option>
                      {props.projects.map((project) => {
                        return (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        );
                      })}
                    </select>
                  </>
                )}
              </>
            )}
            {error && (
              <p className={styles.dialogError} role="alert">
                {error}
              </p>
            )}
            <footer>
              {!deleting && editor.kind !== "create" && (
                <button
                  type="button"
                  className={styles.deleteAction}
                  disabled={working}
                  onClick={() => {
                    return setDeleting(true);
                  }}
                >
                  <Trash aria-hidden="true" />
                  {editor.kind === "conversation"
                    ? "Delete conversation"
                    : "Remove project"}
                </button>
              )}
              <button
                type="button"
                disabled={working}
                onClick={() => {
                  return deleting ? setDeleting(false) : setOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={
                  deleting ? styles.dangerButton : styles.primaryButton
                }
                disabled={working || (!deleting && !editor.name.trim())}
              >
                {working
                  ? "Saving…"
                  : deleting
                    ? "Delete"
                    : editor.kind === "create"
                      ? "Create project"
                      : "Save changes"}
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </>
  );
}
