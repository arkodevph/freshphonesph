"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  CheckCircle,
  FileArrowUp,
  FileText,
  IdentificationCard,
  PenNib,
  Plus,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  downloadCustomerDocument,
  getCustomerDocuments,
  reviewCustomerDocument,
  uploadCustomerDocument,
  type DocumentRequirement,
  type RecordId,
} from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { prepareDocumentFile } from "@/lib/document-file";
import styles from "./document-checklist.module.css";

const labels: Record<DocumentRequirement["status"], string> = {
  MISSING: "Missing",
  SUBMITTED: "Submitted for review",
  APPROVED: "Approved",
  NEEDS_CLARIFICATION: "Needs clarification",
};

function FolderArtwork({ identity }: { identity: boolean }) {
  return (
    <div className={styles.folderArtwork} aria-hidden="true">
      <span className={styles.folderBack} />
      <div className={styles.paperRear}>
        <span />
        <span />
        <span />
      </div>
      <div
        className={`${styles.paperSheet} ${identity ? styles.identityPaper : styles.agreementPaper}`}
      >
        <div className={styles.paperHeader}>
          <span className={styles.paperBrand}>FP</span>
          <span>FRESH PHONES PH</span>
          <FileText weight="duotone" />
        </div>
        <span className={styles.paperTitle}>
          {identity ? "Identification" : "Client agreement"}
        </span>
        {identity ? (
          <div className={styles.paperIdentity}>
            <span>
              <IdentificationCard weight="duotone" />
            </span>
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
        ) : (
          <div className={styles.paperLines}>
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
        <div className={styles.paperFooter}>
          <span>{identity ? "Personal document" : "Signed document"}</span>
          {identity ? (
            <span className={styles.paperSeal}>
              <IdentificationCard />
            </span>
          ) : (
            <PenNib weight="duotone" />
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentChecklist({
  clientId,
  reviewer = false,
}: {
  clientId?: RecordId;
  reviewer?: boolean;
}) {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  const [working, setWorking] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const [reasons, setReasons] = useState<Record<string, string>>({});

  const [previews, setPreviews] = useState<
    Record<string, { url: string; name: string; mime: string }>
  >({});

  const previewUrls = useRef<Record<string, string>>({});

  const scrolledHash = useRef<string | null>(null);

  useEffect(() => {
    setSelectedFiles({});

    setPreviews({});

    setUploadErrors({});

    return () => {
      Object.values(previewUrls.current).forEach((url) => {
        return URL.revokeObjectURL(url);
      });

      previewUrls.current = {};
    };
  }, [clientId]);

  const load = useCallback(() => {
    void getCustomerDocuments(clientId)
      .then((items) => {
        setRequirements(items);

        setError(null);
      })
      .catch((caught) => {
        return setError(
          caught instanceof Error
            ? caught.message
            : "Could not load documents.",
        );
      })
      .finally(() => {
        return setLoading(false);
      });
  }, [clientId]);

  useEffect(() => {
    setLoading(true);

    load();
  }, [load]);

  useLiveRecords(load, true);

  useEffect(() => {
    const target = window.location.hash.slice(1);

    if (!target.startsWith("document-") || scrolledHash.current === target) {
      return;
    }

    const element = document.getElementById(target);

    if (element) {
      element.scrollIntoView({ block: "start" });

      scrolledHash.current = target;
    }
  }, [requirements]);

  async function upload(event: React.FormEvent<HTMLFormElement>, key: string) {
    event.preventDefault();

    const input =
      event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');

    const file = selectedFiles[key];

    if (!file) {
      setUploadErrors((current) => {
        return {
          ...current,
          [key]: current[key] || "Choose a file before uploading.",
        };
      });

      input?.focus();

      return;
    }

    setWorking(key);

    setError(null);

    setNotice(null);

    setUploadErrors((current) => {
      return { ...current, [key]: "" };
    });

    try {
      await uploadCustomerDocument(key, file, clientId);

      if (input) {
        input.value = "";
      }

      if (previewUrls.current[key]) {
        URL.revokeObjectURL(previewUrls.current[key]);
      }

      delete previewUrls.current[key];

      setSelectedFiles((current) => {
        const next = { ...current };

        delete next[key];

        return next;
      });

      setPreviews((current) => {
        const next = { ...current };

        delete next[key];

        return next;
      });

      setNotice(
        `${file.name} submitted for Records review. You can track its status below.`,
      );

      load();
    } catch (caught) {
      setUploadErrors((current) => {
        return {
          ...current,
          [key]:
            caught instanceof Error
              ? caught.message
              : "Upload failed. Choose the file and try again.",
        };
      });
    } finally {
      setWorking(null);
    }
  }

  function chooseFile(key: string, input: HTMLInputElement) {
    const file = input.files?.[0];

    if (previewUrls.current[key]) {
      URL.revokeObjectURL(previewUrls.current[key]);
    }

    delete previewUrls.current[key];

    setSelectedFiles((current) => {
      const next = { ...current };

      delete next[key];

      return next;
    });

    setPreviews((current) => {
      const next = { ...current };

      delete next[key];

      return next;
    });

    setError(null);

    setUploadErrors((current) => {
      return { ...current, [key]: "" };
    });

    if (!file) {
      return;
    }

    try {
      const selected = prepareDocumentFile(file);

      const url = URL.createObjectURL(selected);

      previewUrls.current[key] = url;

      setSelectedFiles((current) => {
        return { ...current, [key]: selected };
      });

      setPreviews((current) => {
        return {
          ...current,
          [key]: { url, name: selected.name, mime: selected.type },
        };
      });
    } catch (caught) {
      input.value = "";

      setUploadErrors((current) => {
        return {
          ...current,
          [key]:
            caught instanceof Error
              ? caught.message
              : "Could not select this file. Choose it again.",
        };
      });
    }
  }

  async function review(
    item: DocumentRequirement,
    status: "APPROVED" | "NEEDS_CLARIFICATION",
  ) {
    if (!item.latest) {
      return;
    }

    const reason = reasons[item.key]?.trim() ?? "";

    if (status === "NEEDS_CLARIFICATION" && !reason) {
      setError("Enter a correction request before asking for clarification.");

      return;
    }

    setWorking(item.key);

    setError(null);

    setNotice(null);

    try {
      await reviewCustomerDocument(
        item.latest.id,
        status,
        item.latest.version,
        reason,
      );

      setNotice(
        status === "APPROVED"
          ? "Document approved."
          : "Clarification requested.",
      );

      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review failed.");
    } finally {
      setWorking(null);
    }
  }

  async function download(id: string, fileName: string) {
    setError(null);

    try {
      const blob = await downloadCustomerDocument(id);

      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = url;

      anchor.download = fileName;

      anchor.click();

      setTimeout(() => {
        return URL.revokeObjectURL(url);
      }, 60000);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not download document.",
      );
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <span className={styles.headingIcon}>
          <FileArrowUp weight="duotone" aria-hidden="true" />
        </span>
        <div>
          <p>Requirements</p>
          <h2>{reviewer ? "Client documents" : "My documents"}</h2>
        </div>
      </div>
      <p className={styles.helper}>
        Upload a clear PDF, JPG, PNG or WebP file, up to 5 MB. Files are
        reviewed by Records. If your phone uses HEIC, save or share the photo as
        JPG or PDF first.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <div
          className={styles.documentSkeleton}
          role="status"
          aria-label="Loading document requirements"
        >
          <span className={styles.skeletonSrOnly}>
            Loading document requirements…
          </span>
          <div aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => {
              return (
                <div className={styles.documentSkeletonItem} key={index}>
                  <div>
                    <span
                      className={styles.documentSkeletonBar}
                      style={{ width: index === 1 ? "42%" : "58%", height: 18 }}
                    />
                    <span
                      className={styles.documentSkeletonBar}
                      style={{ width: "75%", height: 12 }}
                    />
                  </div>
                  <span
                    className={styles.documentSkeletonBar}
                    style={{ width: 92, height: 26 }}
                  />
                  <span
                    className={styles.documentSkeletonBar}
                    style={{ width: "38%", height: 34 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : requirements.length === 0 ? (
        <p className={styles.empty}>No requirements are configured.</p>
      ) : (
        <div
          className={`${styles.list}${reviewer ? "" : ` ${styles.folderList}`}`}
        >
          {requirements.map((item) => {
            return (
              <article
                className={reviewer ? styles.item : styles.folderCard}
                id={`document-${item.key}`}
                key={item.key}
              >
                {!reviewer && (
                  <FolderArtwork identity={item.key === "PHOTO_ID"} />
                )}
                <div className={reviewer ? undefined : styles.folderBody}>
                  {!reviewer && (
                    <div className={styles.folderMeta}>
                      <span>
                        <FileText weight="duotone" aria-hidden="true" />{" "}
                        {item.key === "PHOTO_ID"
                          ? "Identity document"
                          : "Client agreement"}
                      </span>
                      <span
                        className={`${styles.status} ${styles[item.status]}`}
                      >
                        {labels[item.status]}
                      </span>
                    </div>
                  )}
                  <div className={styles.itemHeading}>
                    <div>
                      <h3>{item.label}</h3>
                      <p>{item.description}</p>
                    </div>
                    {reviewer && (
                      <span
                        className={`${styles.status} ${styles[item.status]}`}
                      >
                        {labels[item.status]}
                      </span>
                    )}
                  </div>
                  {item.latest?.clarification &&
                    item.status === "NEEDS_CLARIFICATION" && (
                      <p className={styles.clarification}>
                        <WarningCircle weight="fill" aria-hidden="true" />{" "}
                        {item.latest.clarification}
                      </p>
                    )}
                  {item.latest && (
                    <div className={styles.fileLine}>
                      <span>
                        {item.latest.fileName} ·{" "}
                        {new Date(item.latest.uploadedAt).toLocaleDateString(
                          "en-PH",
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          return download(
                            item.latest!.id,
                            item.latest!.fileName,
                          );
                        }}
                      >
                        <ArrowDown weight="bold" aria-hidden="true" /> Download
                      </button>
                    </div>
                  )}
                  {(item.status === "MISSING" ||
                    item.status === "NEEDS_CLARIFICATION") && (
                    <form
                      className={styles.uploadForm}
                      noValidate
                      onSubmit={(event) => {
                        return upload(event, item.key);
                      }}
                    >
                      <label
                        className={reviewer ? undefined : styles.filePicker}
                      >
                        {!reviewer && (
                          <>
                            <span className={styles.filePickerIcon}>
                              <Plus weight="bold" aria-hidden="true" />
                            </span>
                            <span className={styles.filePickerName}>
                              {previews[item.key]?.name ?? "Choose a file"}
                            </span>
                          </>
                        )}
                        <input
                          className={reviewer ? undefined : styles.fileInput}
                          type="file"
                          aria-label={`Choose ${item.label}`}
                          aria-invalid={Boolean(uploadErrors[item.key])}
                          aria-describedby={
                            uploadErrors[item.key]
                              ? `document-upload-error-${clientId ?? "own"}-${item.key}`
                              : undefined
                          }
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
                          onChange={(event) => {
                            return chooseFile(item.key, event.currentTarget);
                          }}
                          disabled={working === item.key}
                          required
                        />
                      </label>
                      <button type="submit" disabled={working === item.key}>
                        <FileArrowUp weight="bold" aria-hidden="true" />
                        {working === item.key
                          ? "Uploading…"
                          : item.status === "MISSING"
                            ? "Upload"
                            : "Submit a corrected file"}
                      </button>
                      {uploadErrors[item.key] && (
                        <p
                          id={`document-upload-error-${clientId ?? "own"}-${item.key}`}
                          className={styles.fileError}
                          role="alert"
                        >
                          {uploadErrors[item.key]}
                        </p>
                      )}
                    </form>
                  )}
                  {previews[item.key] && (
                    <div className={styles.preview}>
                      <strong>
                        Check this file before uploading:{" "}
                        {previews[item.key].name}
                      </strong>
                      {previews[item.key].mime === "application/pdf" ? (
                        <iframe
                          src={previews[item.key].url}
                          title={`Preview of ${previews[item.key].name}`}
                        />
                      ) : (
                        <img
                          src={previews[item.key].url}
                          alt={`Preview of ${previews[item.key].name}`}
                        />
                      )}
                    </div>
                  )}
                  {reviewer && item.status === "SUBMITTED" && item.latest && (
                    <div className={styles.review}>
                      <label>
                        Correction request
                        <input
                          value={reasons[item.key] ?? ""}
                          onChange={(event) => {
                            return setReasons((current) => {
                              return {
                                ...current,
                                [item.key]: event.target.value,
                              };
                            });
                          }}
                          maxLength={1000}
                          placeholder="What should the customer correct?"
                        />
                      </label>
                      <div>
                        <button
                          type="button"
                          disabled={working === item.key}
                          onClick={() => {
                            return review(item, "APPROVED");
                          }}
                        >
                          <CheckCircle weight="bold" aria-hidden="true" />{" "}
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={working === item.key}
                          onClick={() => {
                            return review(item, "NEEDS_CLARIFICATION");
                          }}
                        >
                          Request clarification
                        </button>
                      </div>
                    </div>
                  )}
                  {item.history.length > 1 && (
                    <details className={styles.history}>
                      <summary>
                        Previous submissions ({item.history.length - 1})
                      </summary>
                      <ul>
                        {item.history.slice(1).map((entry) => {
                          return (
                            <li key={entry.id}>
                              <span>
                                {entry.fileName} · {labels[entry.status]} ·{" "}
                                {new Date(entry.uploadedAt).toLocaleDateString(
                                  "en-PH",
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  return download(entry.id, entry.fileName);
                                }}
                              >
                                Download
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
