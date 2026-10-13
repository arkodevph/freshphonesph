"use client";

import type { Me } from "@/lib/api";
import { ROLES, type Employee } from "@/lib/api";
import {
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Users,
  X,
} from "@phosphor-icons/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { formatDate, initials, roleLabel, SkeletonRow } from "./team-view";

type Props = {
  detailLoading: boolean;
  detailError: string | null;
  selectedRef: RefObject<string | null>;
  loadManaged: (id: string) => Promise<void>;
  resultSummary: string;
  loading: boolean;
  loadDirectory: () => Promise<void>;
  loadStats: () => Promise<void>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  setPage: Dispatch<SetStateAction<number>>;
  roleFilter: string;
  setRoleFilter: Dispatch<SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  hasFilters: boolean;
  clearFilters: () => void;
  accounts: Employee[];
  me: Me | null;
  openManage: (account: Employee) => void;
  page: number;
  pageCount: number;
};

export default function AccountDirectory({
  detailLoading,
  detailError,
  selectedRef,
  loadManaged,
  resultSummary,
  loading,
  loadDirectory,
  loadStats,
  query,
  setQuery,
  setPage,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  hasFilters,
  clearFilters,
  accounts,
  me,
  openManage,
  page,
  pageCount,
}: Props) {
  return (
    <section
      className="team-directory"
      aria-labelledby="account-directory-title"
    >
      {(detailLoading || detailError) && (
        <div
          className="team-dialog-body"
          role={detailError ? "alert" : "status"}
        >
          <p>{detailError ?? "Loading current account settings…"}</p>
          {detailError && selectedRef.current && (
            <button
              type="button"
              className="team-secondary-button"
              onClick={() => {
                if (selectedRef.current) {
                  void loadManaged(selectedRef.current);
                }
              }}
            >
              Retry account
            </button>
          )}
        </div>
      )}
      <div className="team-directory-heading">
        <div>
          <h3 id="account-directory-title">Account directory</h3>
          <p>{resultSummary}</p>
        </div>
        <button
          type="button"
          className="team-secondary-button"
          disabled={loading}
          onClick={() => {
            void loadDirectory();

            void loadStats();
          }}
        >
          Refresh accounts
        </button>
      </div>

      <div className="team-toolbar">
        <label className="team-search-field">
          <span className="sr-only">Search accounts</span>
          <MagnifyingGlass aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);

              setPage(1);
            }}
            placeholder="Search by name or email"
          />
        </label>
        <label className="team-filter-field">
          <span>Role</span>
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);

              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {ROLES.map(([value, label]) => {
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
            <option value="customer">Customer</option>
          </select>
        </label>
        <label className="team-filter-field">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);

              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        {hasFilters && (
          <button
            type="button"
            className="team-clear-button"
            onClick={clearFilters}
          >
            <X /> Clear
          </button>
        )}
      </div>

      <div className="team-table-wrap">
        <table className="team-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => {
                return <SkeletonRow key={index} />;
              })
            ) : accounts.length ? (
              accounts.map((account) => {
                const isSelf = String(account.id) === String(me?.id);

                return (
                  <tr key={account.id}>
                    <td data-label="Person">
                      <div className="team-person">
                        <span className="team-person-avatar">
                          {initials(account.full_name)}
                        </span>
                        <span>
                          <strong>
                            {account.full_name}
                            {isSelf && <small> You</small>}
                          </strong>
                          <em>{account.email}</em>
                        </span>
                      </div>
                    </td>
                    <td data-label="Role">
                      <span className="team-role-badge">
                        {roleLabel(account.role)}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span
                        className={`team-status-badge is-${account.status}`}
                      >
                        <i />
                        {account.status}
                      </span>
                    </td>
                    <td data-label="Created" className="team-created-cell">
                      {formatDate(account.created_at)}
                    </td>
                    <td data-label="Action" className="team-action-cell">
                      <button
                        type="button"
                        onClick={() => {
                          return openManage(account);
                        }}
                        aria-label={`Manage ${account.full_name}`}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="team-empty-cell">
                  <span>
                    <Users />
                  </span>
                  <strong>
                    {hasFilters
                      ? "No accounts match these filters"
                      : "No accounts yet"}
                  </strong>
                  <p>
                    {hasFilters
                      ? "Try a broader search or clear the filters."
                      : "Add the first staff account to start the directory."}
                  </p>
                  {hasFilters && (
                    <button type="button" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="team-pagination">
        <p>
          Page {page} of {pageCount}
        </p>
        <div>
          <button
            type="button"
            onClick={() => {
              return setPage((current) => {
                return current - 1;
              });
            }}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <CaretLeft />
          </button>
          <button
            type="button"
            onClick={() => {
              return setPage((current) => {
                return current + 1;
              });
            }}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            <CaretRight />
          </button>
        </div>
      </footer>
    </section>
  );
}
