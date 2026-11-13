"use client";

import { listClients } from "@/lib/api";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { inputCls } from "@/app/system/_role-designs/finance_officer/components/FormField";
import { ClientChoice } from "@/app/system/_role-designs/finance_officer/app/system/payments/payment-view";
import { DropdownTooltip } from "@/app/system/_role-designs/finance_officer/components/dropdown/DropdownTooltip";
import { useDropdownText } from "@/components/dropdown/useDropdownText";
import { useDropdownMenu } from "@/components/dropdown/useDropdownMenu";
import styles from "@/app/system/_role-designs/finance_officer/app/system/payments/client-picker.module.css";

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

  const list = useRef<HTMLDivElement>(null);

  const keyboardNavigation = useRef(false);

  const { tooltip, tipRef, show, hide, keep, dismiss } = useDropdownText();

  const tooltipId = `${listId}-tooltip`;

  const searchVersion = useRef(0);

  const [query, setQuery] = useState("");

  const [results, setResults] = useState<ClientChoice[]>([]);

  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);

  useDropdownMenu(list, open);

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
    if (!open || active < 0 || !keyboardNavigation.current) {
      return;
    }

    const option = document.getElementById(`${listId}-${active}`);

    const menu = list.current;

    if (!option || !menu || !results[active]) {
      return;
    }

    const optionRect = option.getBoundingClientRect();

    const menuRect = menu.getBoundingClientRect();

    if (optionRect.top < menuRect.top) {
      menu.scrollTop -= menuRect.top - optionRect.top;
    } else if (optionRect.bottom > menuRect.bottom) {
      menu.scrollTop += optionRect.bottom - menuRect.bottom;
    }

    show(option, resultText(results[active]), menu, true);
  }, [active, listId, open, results, show]);

  useEffect(() => {
    dismiss();
  }, [query, selected, results, dismiss]);

  function resultText(client: ClientChoice) {
    return [
      client.full_name,
      client.unit_model,
      client.batch_number || "No batch code",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function choose(client: ClientChoice) {
    dismiss();

    onSelect(client);

    setOpen(false);

    setActive(-1);
  }

  return (
    <div
      ref={root}
      data-text-dropdown
      className={`client-picker ${styles.picker}`}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);

          setActive(-1);

          dismiss();
        }
      }}
    >
      <div className="client-picker-control">
        <MagnifyingGlass weight="bold" aria-hidden="true" />
        <input
          type="text"
          data-dropdown-trigger
          role="combobox"
          aria-label={label}
          aria-required={required}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && active >= 0 && results[active]
              ? `${listId}-${active}`
              : undefined
          }
          aria-describedby={tooltip ? tooltipId : undefined}
          autoComplete="off"
          value={query}
          maxLength={100}
          placeholder="Search clients…"
          title="Search by name, phone, or batch"
          className={`${inputCls} client-picker-input`}
          onFocus={(event) => {
            if (results.length || loading || searchError) {
              setOpen(true);
            }

            if (selected) {
              show(
                event.currentTarget,
                selectedText,
                event.currentTarget,
                true,
              );
            }
          }}
          onPointerEnter={(event) => {
            if (selected && event.pointerType !== "touch") {
              show(event.currentTarget, selectedText);
            }
          }}
          onPointerLeave={hide}
          onChange={(event) => {
            dismiss();

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

              keyboardNavigation.current = true;

              setOpen(true);

              setActive((current) => {
                return Math.min(current + 1, results.length - 1);
              });
            } else if (event.key === "ArrowUp" && results.length) {
              event.preventDefault();

              keyboardNavigation.current = true;

              setOpen(true);

              setActive((current) => {
                return Math.max(current - 1, 0);
              });
            } else if (event.key === "Enter" && open && active >= 0) {
              event.preventDefault();

              choose(results[active]);
            } else if (event.key === "Escape") {
              dismiss();

              setOpen(false);

              setActive(-1);
            }
          }}
        />
      </div>
      {open && (
        <div
          ref={list}
          id={listId}
          role="listbox"
          popover="manual"
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
                  onPointerEnter={(event) => {
                    keyboardNavigation.current = false;

                    setActive(index);

                    if (event.pointerType !== "touch") {
                      show(
                        event.currentTarget,
                        resultText(client),
                        list.current ?? event.currentTarget,
                      );
                    }
                  }}
                  onPointerLeave={hide}
                >
                  <span className="client-picker-identity">
                    <strong data-picker-text>{client.full_name}</strong>
                    <small data-picker-text>{client.unit_model}</small>
                  </span>
                  <span data-picker-text className={styles.batch}>
                    {client.batch_number || "No batch code"}
                  </span>
                </div>
              );
            })}
        </div>
      )}
      <DropdownTooltip
        tooltip={tooltip}
        id={tooltipId}
        tipRef={tipRef}
        keep={keep}
        hide={hide}
      />
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
