"use client";

import { getCatalogItems } from "@/lib/api";
import { catalogPrice } from "@/lib/catalog";
import { useLiveRecords } from "@/lib/useLiveRecords";
import {
  catalogAvailability,
  catalogAvailabilityLabels,
  catalogConditionLabels,
  type CatalogItem,
  type CatalogQuery,
  type Page,
} from "@freshphones/contracts";
import { Stack } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./catalog.module.css";
import { CatalogEditor } from "./CatalogEditor";

export function CatalogWorkspace() {
  const [query, setQuery] = useState<CatalogQuery>({ page: 1, q: "" });

  const [result, setResult] = useState<Page<CatalogItem> | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;

    setLoading(true);

    setError("");

    try {
      const page = await getCatalogItems(query);

      if (request !== sequence.current) {
        return;
      }

      if (query.page > 1 && page.items.length === 0) {
        setQuery((current) => {
          return { ...current, page: 1 };
        });

        return;
      }

      setResult(page);
    } catch (failure) {
      if (request === sequence.current) {
        setResult(null);

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load catalog.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      return void load();
    }, 200);

    return () => {
      clearTimeout(timer);

      sequence.current++;
    };
  }, [load]);

  useLiveRecords(load);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <span className={styles.icon}>
          <Stack weight="duotone" />
        </span>
        <div>
          <p>Public website</p>
          <h1>Unit catalog</h1>
          <p>
            Manage the models, daily rates and availability customers can
            browse.
          </p>
        </div>
        <button
          className={styles.primary}
          type="button"
          onClick={() => {
            setNotice("");

            setEditing("new");
          }}
        >
          Add listing
        </button>
      </header>
      <section className={styles.panel} aria-label="Catalog filters">
        <div className={styles.filters}>
          <label>
            Search listings
            <input
              value={query.q}
              maxLength={100}
              placeholder="Model or listing code"
              onChange={(event) => {
                return setQuery({ ...query, q: event.target.value, page: 1 });
              }}
            />
          </label>
          <label>
            Visibility
            <select
              value={query.visibility ?? ""}
              onChange={(event) => {
                return setQuery({
                  ...query,
                  visibility:
                    (event.target.value as CatalogQuery["visibility"]) ||
                    undefined,
                  page: 1,
                });
              }}
            >
              <option value="">All listings</option>
              <option value="PUBLISHED">Published</option>
              <option value="HIDDEN">Hidden</option>
            </select>
          </label>
          <label>
            Availability
            <select
              value={query.availability ?? ""}
              onChange={(event) => {
                return setQuery({
                  ...query,
                  availability:
                    (event.target.value as CatalogQuery["availability"]) ||
                    undefined,
                  page: 1,
                });
              }}
            >
              <option value="">All availability</option>
              {catalogAvailability.map((value) => {
                return (
                  <option key={value} value={value}>
                    {catalogAvailabilityLabels[value]}
                  </option>
                );
              })}
            </select>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              return void load();
            }}
          >
            Refresh
          </button>
        </div>
        <p className={styles.help}>
          Availability is maintained by your team. Hiding a listing removes it
          from the public catalog. Existing batch agreements and customer
          balances stay separate.
        </p>
      </section>
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              return void load();
            }}
          >
            Retry catalog
          </button>
        </p>
      )}
      <section
        className={styles.panel}
        aria-busy={loading}
        aria-label="Catalog listings"
      >
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Daily rate</th>
                <th>Availability</th>
                <th>Visibility</th>
                <th>Order</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Loading listings…</td>
                </tr>
              ) : !result?.items.length ? (
                <tr>
                  <td colSpan={6}>No listings match your filters.</td>
                </tr>
              ) : (
                result.items.map((item) => {
                  return (
                    <tr key={item.id}>
                      <th scope="row">
                        {item.name}
                        <small>
                          {item.code} · {catalogConditionLabels[item.condition]}
                        </small>
                      </th>
                      <td>{catalogPrice(item.dailyAmount)}</td>
                      <td>{catalogAvailabilityLabels[item.availability]}</td>
                      <td>
                        <span
                          className={
                            item.published ? styles.published : styles.hidden
                          }
                        >
                          {item.published ? "Published" : "Hidden"}
                        </span>
                      </td>
                      <td>{item.sortOrder}</td>
                      <td>
                        <button
                          type="button"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => {
                            setNotice("");

                            setEditing(item);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <nav className={styles.pagination} aria-label="Catalog directory pages">
          <span>{result ? `${result.total} matching listings` : ""}</span>
          <button
            type="button"
            disabled={loading || query.page <= 1}
            onClick={() => {
              return setQuery({ ...query, page: query.page - 1 });
            }}
          >
            Previous
          </button>
          <span>Page {query.page}</span>
          <button
            type="button"
            disabled={
              loading || !result || query.page * result.pageSize >= result.total
            }
            onClick={() => {
              return setQuery({ ...query, page: query.page + 1 });
            }}
          >
            Next
          </button>
        </nav>
      </section>
      {editing && (
        <CatalogEditor
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          onClose={() => {
            return setEditing(null);
          }}
          onSaved={(item) => {
            setNotice(
              `${item.name} saved${item.published ? " and published" : " as a hidden listing"}.`,
            );

            void load();
          }}
        />
      )}
    </div>
  );
}
