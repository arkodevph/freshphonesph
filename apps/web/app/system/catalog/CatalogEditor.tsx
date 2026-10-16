"use client";

import {
  createCatalogItem,
  getCatalogItem,
  removeCatalogPhoto,
  updateCatalogItem,
  uploadCatalogPhoto,
} from "@/lib/api";
import { catalogDraft, catalogPhoto, emptyCatalogInput } from "@/lib/catalog";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import {
  catalogAssets,
  catalogAvailability,
  catalogAvailabilityLabels,
  catalogConditionLabels,
  catalogItemSchema,
  catalogPlanBreakdown,
  catalogPlanSchema,
  type CatalogInput,
  type CatalogItem,
} from "@freshphones/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./catalog.module.css";
import CatalogPaymentTermsForm from "./CatalogPaymentTermsForm";

export function CatalogEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: CatalogItem | null;
  onClose: () => void;
  onSaved: (item: CatalogItem) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const alive = useRef(true);

  const busy = useRef(false);

  const checkSequence = useRef(0);

  const [item, setItem] = useState(initial);

  const itemRef = useRef(item);

  itemRef.current = item;

  const [draft, setDraft] = useState<CatalogInput>(
    initial ? catalogDraft(initial) : { ...emptyCatalogInput },
  );

  const [saving, setSaving] = useState(false);

  const [outdated, setOutdated] = useState(false);

  const [error, setError] = useState("");

  const [saved, setSaved] = useState("");

  const [confirm, setConfirm] = useState<"close" | "reload" | "photo" | null>(
    null,
  );

  const [file, setFile] = useState<File | null>(null);

  const [fileKey, setFileKey] = useState(0);

  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify(item ? catalogDraft(item) : emptyCatalogInput);

  const check = useCallback(async () => {
    const current = itemRef.current;

    if (!current || busy.current) {
      return;
    }

    const request = ++checkSequence.current;

    try {
      const latest = await getCatalogItem(current.id);

      if (
        alive.current &&
        !busy.current &&
        request === checkSequence.current &&
        itemRef.current?.version === current.version &&
        latest.version !== current.version
      ) {
        setOutdated(true);
      }
    } catch (failure) {
      if (
        alive.current &&
        failure instanceof ApiError &&
        [401, 403, 404].includes(failure.status)
      ) {
        setOutdated(true);

        setError(failure.message);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;

    dialog.current?.showModal();

    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    void check();

    return () => {
      alive.current = false;

      checkSequence.current++;

      document.body.style.overflow = overflow;
    };
  }, [check]);

  useLiveRecords(check);

  function close() {
    if (!busy.current) {
      dirty || file ? setConfirm("close") : onClose();
    }
  }

  function accept(row: CatalogItem) {
    setItem(row);

    itemRef.current = row;

    setDraft(catalogDraft(row));

    setOutdated(false);

    setSaved("Listing saved.");

    onSaved(row);
  }

  async function run(work: () => Promise<CatalogItem>, photo = false) {
    if (busy.current) {
      return;
    }

    busy.current = true;

    checkSequence.current++;

    setSaving(true);

    setError("");

    setSaved("");

    try {
      const row = await work();

      if (alive.current) {
        accept(row);

        if (photo) {
          setFile(null);

          setFileKey((value) => {
            return value + 1;
          });
        }
      }
    } catch (failure) {
      if (alive.current) {
        if (
          failure instanceof ApiError &&
          failure.status === 409 &&
          failure.message.includes("This listing changed")
        ) {
          setOutdated(true);
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not save listing.",
        );
      }
    } finally {
      busy.current = false;

      if (alive.current) {
        setSaving(false);
      }
    }
  }

  async function reload() {
    if (!item || busy.current) {
      return;
    }

    busy.current = true;

    checkSequence.current++;

    setSaving(true);

    setError("");

    try {
      const latest = await getCatalogItem(item.id);

      if (alive.current) {
        setItem(latest);

        itemRef.current = latest;

        setDraft(catalogDraft(latest));

        setOutdated(false);

        setFile(null);

        setFileKey((value) => {
          return value + 1;
        });

        setSaved("");
      }
    } catch (failure) {
      if (alive.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not reload listing.",
        );
      }
    } finally {
      busy.current = false;

      if (alive.current) {
        setSaving(false);
      }
    }
  }

  function save(event: React.FormEvent) {
    event.preventDefault();

    if (outdated || busy.current) {
      return;
    }

    const parsed = catalogItemSchema.safeParse(draft);

    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((issue) => {
            return issue.message;
          })
          .join(" "),
      );

      return;
    }

    void run(() => {
      return item
        ? updateCatalogItem(item.id, item.version, parsed.data)
        : createCatalogItem(parsed.data);
    });
  }

  const photo = item ? catalogPhoto(item, true) : null;

  const parsedPlan = catalogPlanSchema.safeParse(draft.installmentPlan);

  const planPreview = parsedPlan.success
    ? catalogPlanBreakdown(parsedPlan.data)
    : null;

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="catalog-editor-title"
      onCancel={(event) => {
        event.preventDefault();

        close();
      }}
    >
      <header className={styles.editorHeading}>
        <div>
          <h2 id="catalog-editor-title">
            {item ? `Edit ${item.name}` : "Add catalog listing"}
          </h2>
          <p>Published details appear on the public website.</p>
        </div>
        <button type="button" disabled={saving} onClick={close}>
          Close listing
        </button>
      </header>
      {confirm && (
        <div role="alert" className={styles.warning}>
          <p>
            {confirm === "photo"
              ? "Remove the current product photo?"
              : "Discard unsaved changes?"}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => {
                return setConfirm(null);
              }}
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => {
                const action = confirm;

                setConfirm(null);

                if (action === "close") {
                  onClose();
                } else if (action === "reload") {
                  void reload();
                } else if (item) {
                  void run(() => {
                    return removeCatalogPhoto(item);
                  }, true);
                }
              }}
            >
              {confirm === "photo" ? "Remove photo" : "Discard changes"}
            </button>
          </div>
        </div>
      )}
      {outdated && (
        <div className={styles.warning} role="alert">
          This listing changed. Your draft is preserved. Review the latest
          version before saving.{" "}
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              return dirty || file ? setConfirm("reload") : void reload();
            }}
          >
            Load latest listing
          </button>
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className={styles.notice} role="status">
          {saved}
        </p>
      )}
      <form onSubmit={save}>
        <fieldset disabled={saving || Boolean(confirm)} className={styles.form}>
          <label>
            Model / listing name
            <input
              required
              minLength={2}
              maxLength={100}
              value={draft.name}
              onChange={(event) => {
                return setDraft({ ...draft, name: event.target.value });
              }}
            />
          </label>
          <label>
            Listing code
            <input
              required
              minLength={2}
              maxLength={40}
              pattern="[A-Za-z0-9-]+"
              placeholder="IPHONE-13-128-PRE"
              value={draft.code}
              onChange={(event) => {
                return setDraft({ ...draft, code: event.target.value });
              }}
            />
            <small>
              Use a different code for each model, storage or condition offer.
            </small>
          </label>
          <label>
            Condition
            <select
              value={draft.condition}
              onChange={(event) => {
                return setDraft({
                  ...draft,
                  condition: event.target.value as CatalogInput["condition"],
                });
              }}
            >
              {Object.entries(catalogConditionLabels).map(([value, label]) => {
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            Daily advertised rate (PHP)
            <input
              type="number"
              min="0.01"
              max="9999999999.99"
              step="0.01"
              inputMode="decimal"
              value={draft.dailyAmount ?? ""}
              onChange={(event) => {
                return setDraft({
                  ...draft,
                  dailyAmount: event.target.value || null,
                });
              }}
            />
            <small>Leave blank to show “Ask for pricing”.</small>
          </label>
          <label>
            Availability
            <select
              value={draft.availability}
              onChange={(event) => {
                return setDraft({
                  ...draft,
                  availability: event.target
                    .value as CatalogInput["availability"],
                });
              }}
            >
              {catalogAvailability.map((value) => {
                return (
                  <option key={value} value={value}>
                    {catalogAvailabilityLabels[value]}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            Display order
            <input
              type="number"
              min="0"
              max="9999"
              step="1"
              required
              value={Number.isFinite(draft.sortOrder) ? draft.sortOrder : ""}
              onChange={(event) => {
                return setDraft({
                  ...draft,
                  sortOrder:
                    event.target.value === ""
                      ? NaN
                      : Number(event.target.value),
                });
              }}
            />
            <small>Lower numbers appear first.</small>
          </label>
          <label className={styles.wide}>
            Public details
            <textarea
              maxLength={240}
              rows={3}
              value={draft.description}
              placeholder="Storage, color or details customers should know"
              onChange={(event) => {
                return setDraft({ ...draft, description: event.target.value });
              }}
            />
          </label>
          <label>
            Existing product artwork
            <select
              value={draft.imageAsset ?? ""}
              onChange={(event) => {
                return setDraft({
                  ...draft,
                  imageAsset:
                    (event.target.value as CatalogInput["imageAsset"]) || null,
                });
              }}
            >
              <option value="">Generic device illustration</option>
              {catalogAssets.map((asset) => {
                return (
                  <option key={asset} value={asset}>
                    {asset.replaceAll("-", " ")}
                  </option>
                );
              })}
            </select>
            <small>An uploaded photo takes priority.</small>
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(event) => {
                return setDraft({ ...draft, published: event.target.checked });
              }}
            />
            Published on the public website
          </label>
          <CatalogPaymentTermsForm
            draft={draft}
            setDraft={setDraft}
            planPreview={planPreview}
          />
          <div className={`${styles.actions} ${styles.wide}`}>
            <button
              className={styles.primary}
              type="submit"
              disabled={outdated || (!dirty && Boolean(item))}
            >
              {saving ? "Saving…" : item ? "Save listing" : "Create listing"}
            </button>
            <span>
              {draft.published
                ? "Customers can see this listing after saving."
                : "This listing will be hidden from customers."}
            </span>
          </div>
        </fieldset>
      </form>
      <section className={styles.photoSection} aria-label="Product photo">
        <h3>Product photo</h3>
        <p>
          Upload a JPG, PNG or WebP up to 5 MB. Use a product photo suitable for
          public display.
        </p>
        {photo && (
          <img
            src={photo}
            crossOrigin={item?.hasImage ? "use-credentials" : undefined}
            alt={`${item?.name} current product photo`}
            className={styles.photo}
          />
        )}
        {!item ? (
          <p>Save the listing first to upload a photo.</p>
        ) : (
          <>
            <label className={styles.file}>
              Choose product photo
              <input
                key={fileKey}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={saving || outdated || Boolean(confirm)}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);

                  setSaved("");
                }}
              />
            </label>
            {dirty && (
              <p>Save your listing changes before changing the photo.</p>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                disabled={
                  !file || saving || outdated || dirty || Boolean(confirm)
                }
                onClick={() => {
                  if (file) {
                    void run(() => {
                      return uploadCatalogPhoto(item, file);
                    }, true);
                  }
                }}
              >
                Upload photo
              </button>
              <button
                type="button"
                disabled={
                  !photo || saving || outdated || dirty || Boolean(confirm)
                }
                onClick={() => {
                  return setConfirm("photo");
                }}
              >
                Remove current photo
              </button>
            </div>
          </>
        )}
      </section>
    </dialog>
  );
}
