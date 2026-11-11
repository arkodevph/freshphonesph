"use client";

import { useEffect, useId, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import styles from "./workspace-page-search.module.css";
import WorkspacePopover from "./WorkspacePopover";

type Page = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

type Props = {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: readonly Page[];
};

export default function WorkspacePageSearch({
  label,
  open,
  onOpenChange,
  pages,
}: Props) {
  const id = useId();

  const trigger = useRef<HTMLButtonElement>(null);

  const input = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");

  const [shortcut, setShortcut] = useState("Ctrl K");

  const results = pages.filter((page) => {
    return page.label.toLowerCase().includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) {
      setShortcut("⌘ K");
    }
  }, []);

  useEffect(() => {
    if (open) {
      input.current?.focus();
    }
  }, [open]);

  function close() {
    onOpenChange(false);

    trigger.current?.focus();
  }

  function clear() {
    setQuery("");

    input.current?.focus();
  }

  return (
    <div
      className="system-search-wrap"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();

          event.stopPropagation();

          close();
        }
      }}
    >
      <button
        ref={trigger}
        className="system-search"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        aria-label={label}
        onClick={() => {
          return onOpenChange(!open);
        }}
      >
        <MagnifyingGlass className="h-4 w-4" aria-hidden="true" />
        <span>{label}</span>
        <kbd>{shortcut}</kbd>
      </button>
      <WorkspacePopover
        open={open}
        id={id}
        className="system-popover system-search-popover"
        role="dialog"
        aria-label={label}
      >
        <header className={styles.heading}>
          <label htmlFor={`${id}-query`}>Search accessible pages</label>
          <button
            type="button"
            className={styles.close}
            onClick={close}
            aria-label="Close page search"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="system-popover-search">
          <MagnifyingGlass className="h-4 w-4" aria-hidden="true" />
          <input
            id={`${id}-query`}
            ref={input}
            autoFocus
            value={query}
            onChange={(event) => {
              return setQuery(event.target.value);
            }}
            placeholder="Enter a page name"
          />
          {query && (
            <button type="button" className={styles.clear} onClick={clear}>
              Clear
            </button>
          )}
        </div>
        <p className={styles.count} role="status">
          {results.length} {results.length === 1 ? "page" : "pages"} available
        </p>
        <div className="system-search-results">
          {results.length ? (
            results.map(({ icon: PageIcon, label: name, href }) => {
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    return onOpenChange(false);
                  }}
                >
                  <PageIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span>{name}</span>
                  <span>Open</span>
                </Link>
              );
            })
          ) : (
            <div className={styles.empty}>
              <strong>No matching pages</strong>
              <p>Try a different page name, or clear your search.</p>
              <button type="button" onClick={clear}>
                Clear search
              </button>
            </div>
          )}
        </div>
      </WorkspacePopover>
    </div>
  );
}
