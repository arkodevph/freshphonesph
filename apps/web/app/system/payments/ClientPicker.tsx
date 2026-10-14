"use client";

import { listClients } from "@/lib/api";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { inputCls } from "@/components/FormField";
import { ClientChoice } from "./payment-view";

export function ClientPicker({
  label,
  selected,
  onSelect,
  required = false,
}: {
  label: string;
  selected: ClientChoice | null;
  onSelect: (client: ClientChoice | null) => void;
  required?: boolean;
}) {
  const listId = useId();

  const root = useRef<HTMLDivElement>(null);

  const searchVersion = useRef(0);

  const [query, setQuery] = useState("");

  const [results, setResults] = useState<ClientChoice[]>([]);

  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);

  const [active, setActive] = useState(-1);

  const [searchError, setSearchError] = useState(false);

  const [retry, setRetry] = useState(0);

  const selectedText = selected
    ? `${selected.full_name}${selected.batch_number ? ` · ${selected.batch_number}` : ""}`
    : "";

  useEffect(() => {
    if (selected) {
      setQuery(selectedText);
    }
  }, [selected, selectedText]);

  useEffect(() => {
    const term = query.trim();

    if (selected || term.length < 2) {
      setResults([]);

      setLoading(false);

      setSearchError(false);

      return;
    }

    const requestVersion = searchVersion.current;

    let cancelled = false;

    const timer = setTimeout(() => {
      setLoading(true);

      setSearchError(false);

      void listClients({ q: term })
        .then((page) => {
          if (cancelled || requestVersion !== searchVersion.current) {
            return;
          }

          setResults(page.results);

          setOpen(true);

          setActive(-1);
        })
        .catch(() => {
          if (!cancelled && requestVersion === searchVersion.current) {
            setSearchError(true);
          }
        })
        .finally(() => {
          if (!cancelled && requestVersion === searchVersion.current) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;

      clearTimeout(timer);
    };
  }, [query, retry, selected]);

  useEffect(() => {
    if (active < 0) {
      return;
    }

    document
      .getElementById(`${listId}-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  function choose(client: ClientChoice) {
    onSelect(client);

    setOpen(false);

    setActive(-1);
  }

  return (
    <div
      ref={root}
      className="client-picker"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <div className="client-picker-control">
        <MagnifyingGlass weight="bold" aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-label={label}
          aria-required={required}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            active >= 0 ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          value={query}
          maxLength={100}
          placeholder="Search name, phone, or batch…"
          className={`${inputCls} client-picker-input`}
          onFocus={() => {
            if (results.length || loading || searchError) {
              setOpen(true);
            }
          }}
          onChange={(event) => {
            searchVersion.current += 1;

            setQuery(event.target.value);

            if (selected) {
              onSelect(null);
            }

            setResults([]);

            setLoading(false);

            setSearchError(false);

            setActive(-1);

            setOpen(event.target.value.trim().length >= 2);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && results.length) {
              event.preventDefault();

              setOpen(true);

              setActive((current) => {
                return Math.min(current + 1, results.length - 1);
              });
            } else if (event.key === "ArrowUp" && results.length) {
              event.preventDefault();

              setActive((current) => {
                return Math.max(current - 1, 0);
              });
            } else if (event.key === "Enter" && open && active >= 0) {
              event.preventDefault();

              choose(results[active]);
            } else if (event.key === "Escape") {
              setOpen(false);

              setActive(-1);
            }
          }}
        />
      </div>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={`${label} search results`}
          className="client-picker-results"
        >
          {loading && <p className="client-picker-state">Searching clients…</p>}
          {!loading && searchError && (
            <div className="client-picker-state is-error">
              <span>Could not search clients.</span>
              <button
                type="button"
                onMouseDown={(event) => {
                  return event.preventDefault();
                }}
                onClick={() => {
                  searchVersion.current += 1;

                  setRetry((current) => {
                    return current + 1;
                  });
                }}
              >
                Try again
              </button>
            </div>
          )}
          {!loading &&
            !searchError &&
            query.trim().length >= 2 &&
            results.length === 0 && (
              <p className="client-picker-state">No matching clients.</p>
            )}
          {!loading &&
            results.map((client, index) => {
              return (
                <div
                  key={client.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={active === index}
                  className={`client-picker-option ${active === index ? "is-active" : ""}`}
                  onMouseDown={(event) => {
                    event.preventDefault();

                    choose(client);
                  }}
                  onMouseEnter={() => {
                    return setActive(index);
                  }}
                >
                  <span className="client-picker-identity">
                    <strong>{client.full_name}</strong>
                    <small>{client.unit_model}</small>
                  </span>
                  <span>{client.batch_number || "No batch code"}</span>
                </div>
              );
            })}
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {loading
          ? "Searching clients"
          : searchError
            ? "Client search failed"
            : open
              ? `${results.length} clients found`
              : ""}
      </span>
    </div>
  );
}
