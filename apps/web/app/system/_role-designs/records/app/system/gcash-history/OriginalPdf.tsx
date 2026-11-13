"use client";

import WorkspaceProgress from "@/app/system/_role-designs/records/components/WorkspaceProgress";
import WorkspaceDetails from "@/app/system/_role-designs/records/components/WorkspaceDetails";
import WorkspaceNativeSelect from "@/app/system/_role-designs/records/components/WorkspaceNativeSelect";
import { useEffect, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import { downloadGcashSubmission } from "@/lib/gcash-history";
import styles from "@/app/system/_role-designs/records/app/system/gcash-history/workspace.module.css";

export default function OriginalPdf({
  id,
  filename,
  page,
  setPage,
  active = true,
}: {
  id: string;
  filename: string;
  page: number;
  setPage: (page: number) => void;
  active?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  const container = useRef<HTMLDivElement>(null);

  const unlock = useRef<((password: string) => void) | null>(null);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);

  const [password, setPassword] = useState("");

  const [passwordPrompt, setPasswordPrompt] = useState("");

  const [error, setError] = useState("");

  const [attempt, setAttempt] = useState(0);

  const [zoom, setZoom] = useState(1);

  const [width, setWidth] = useState(500);

  const [rendering, setRendering] = useState(false);

  const [text, setText] = useState("");

  useEffect(() => {
    const target = container.current;

    if (!target || !active) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(180, entry.contentRect.width - 24));
    });

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [active]);

  useEffect(() => {
    let active = true;

    let task: PDFDocumentLoadingTask | undefined;

    setPdf(null);

    setPassword("");

    setPasswordPrompt("");

    setError("");

    void (async () => {
      const [pdfjs, blob] = await Promise.all([
        import("pdfjs-dist"),
        downloadGcashSubmission(id),
      ]);

      if (!active) {
        return;
      }

      // Webpack emits the matching worker as a local static asset; no document/CDN requests.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const data = new Uint8Array(await blob.arrayBuffer());

      if (!active) {
        return;
      }

      task = pdfjs.getDocument({ data, stopAtErrors: true, verbosity: 0 });

      task.onPassword = (
        callback: (password: string) => void,
        reason: number,
      ) => {
        if (!active) {
          return;
        }

        unlock.current = callback;

        setPassword("");

        setPasswordPrompt(
          reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD
            ? "Incorrect PDF password. Try again."
            : "Enter the PDF password to view the original.",
        );
      };

      const loaded = await task.promise;

      if (loaded.numPages > 20) {
        throw new Error(
          "This PDF exceeds the 20-page viewing limit. Download the original instead.",
        );
      }

      if (active) {
        unlock.current = null;

        setPasswordPrompt("");

        setPassword("");

        setPdf(loaded);
      }
    })().catch((failure: unknown) => {
      if (active) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not open the original PDF.",
        );
      }
    });

    return () => {
      active = false;

      unlock.current = null;

      void task?.destroy();
    };
  }, [id, attempt]);

  useEffect(() => {
    if (!pdf || !canvas.current) {
      return;
    }

    let active = true;

    let render: RenderTask | undefined;

    setRendering(true);

    setText("");

    const target = canvas.current;

    void (async () => {
      const selected = await pdf.getPage(Math.min(page, pdf.numPages));

      if (!active) {
        return;
      }

      const viewport = selected.getViewport({
        scale:
          Math.min(2, width / selected.getViewport({ scale: 1 }).width) * zoom,
      });

      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      target.width = Math.floor(viewport.width * ratio);

      target.height = Math.floor(viewport.height * ratio);

      target.style.width = `${viewport.width}px`;

      target.style.height = `${viewport.height}px`;

      render = selected.render({
        canvas: target,
        viewport,
        transform: [ratio, 0, 0, ratio, 0, 0],
      });

      await render.promise;

      const content = await selected.getTextContent();

      if (active) {
        setText(
          content.items
            .map((item) => {
              return "str" in item ? item.str : "";
            })
            .join(" "),
        );
      }
    })()
      .catch((failure: unknown) => {
        if (active) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not render this page.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setRendering(false);
        }
      });

    return () => {
      active = false;

      render?.cancel();
    };
  }, [pdf, page, width, zoom]);

  return (
    <section className={styles.pdfPanel} aria-label="Original PDF">
      <header className={styles.panelHeader}>
        <div>
          <h3>Original PDF</h3>
          <p>{filename}</p>
        </div>
        {pdf && (
          <div className={styles.toolbar}>
            <button
              type="button"
              aria-label="Previous PDF page"
              disabled={page <= 1}
              onClick={() => {
                setPage(page - 1);
              }}
            >
              ←
            </button>
            <label>
              Page{" "}
              <WorkspaceNativeSelect
                aria-label="PDF page"
                value={Math.min(page, pdf.numPages)}
                onChange={(event) => {
                  const value = event.target.value;

                  setPage(Number(value));
                }}
              >
                {Array.from({ length: pdf.numPages }, (_, index) => {
                  return (
                    <option key={index} value={index + 1}>
                      {index + 1}
                    </option>
                  );
                })}
              </WorkspaceNativeSelect>{" "}
              of {pdf.numPages}
            </label>
            <button
              type="button"
              aria-label="Next PDF page"
              disabled={page >= pdf.numPages}
              onClick={() => {
                setPage(page + 1);
              }}
            >
              →
            </button>
            <WorkspaceNativeSelect
              aria-label="PDF zoom"
              value={zoom}
              onChange={(event) => {
                const value = event.target.value;

                setZoom(Number(value));
              }}
            >
              <option value={1}>Fit width</option>
              <option value={1.5}>150%</option>
              <option value={2}>200%</option>
            </WorkspaceNativeSelect>
          </div>
        )}
      </header>
      {passwordPrompt && (
        <form
          className={styles.unlock}
          onSubmit={(event) => {
            event.preventDefault();

            const value = password;

            setPassword("");

            unlock.current?.(value);
          }}
        >
          <p role="status">{passwordPrompt}</p>
          <label>
            PDF viewing password
            <input
              type="password"
              autoComplete="off"
              maxLength={128}
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
          </label>
          <p>Used only while this PDF is open.</p>
          <button type="submit" disabled={!password}>
            Unlock original PDF
          </button>
        </form>
      )}
      {error ? (
        <div className={styles.message} role="alert">
          {error}
          <button
            type="button"
            onClick={() => {
              setAttempt(attempt + 1);
            }}
          >
            Retry original PDF
          </button>
        </div>
      ) : !pdf && !passwordPrompt ? (
        <WorkspaceProgress
          className={styles.message}
          label="Loading original PDF…"
        />
      ) : null}
      <div
        className={styles.pdfCanvas}
        ref={container}
        tabIndex={0}
        aria-label="PDF page viewer"
      >
        {rendering && <p role="status">Rendering page {page}…</p>}
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Original PDF page ${page}`}
          hidden={!pdf || Boolean(error)}
        />
      </div>
      {pdf && (
        <WorkspaceDetails className={styles.pdfText}>
          <summary>Text from this PDF page</summary>
          <p>
            {text ||
              "This page has no selectable text. Compare its scanned image and the extracted transactions."}
          </p>
        </WorkspaceDetails>
      )}
    </section>
  );
}
