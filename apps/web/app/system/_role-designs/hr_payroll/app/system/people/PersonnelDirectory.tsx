"use client";

import WorkspaceProgress, {
  TableSkeletonRows,
} from "@/app/system/_role-designs/hr_payroll/components/WorkspaceProgress";
import { useState } from "react";
import { roleLabels, type Role } from "@freshphones/contracts";
import { RecordPagination } from "@/app/system/_role-designs/hr_payroll/components/RecordPagination";
import Select from "@/app/system/_role-designs/hr_payroll/components/Select";
import styles from "@/app/system/_role-designs/hr_payroll/app/system/people/people.module.css";

export type Staff = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  supervisor?: { name: string } | null;
};

export default function PersonnelDirectory({
  staff,
  loading,
}: {
  staff: Staff[];
  loading: boolean;
}) {
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");

  const [role, setRole] = useState("");

  const [status, setStatus] = useState("");

  const roles = [
    ...new Set(
      staff.map((person) => {
        return person.role;
      }),
    ),
  ].sort((a, b) => {
    return roleLabels[a].localeCompare(roleLabels[b]);
  });

  const people = staff.filter((person) => {
    const text =
      `${person.name} ${roleLabels[person.role]} ${person.supervisor?.name ?? ""}`.toLowerCase();

    return (
      text.includes(query.trim().toLowerCase()) &&
      (!role || person.role === role) &&
      (!status || person.active === (status === "active"))
    );
  });

  const filtered = Boolean(query || role || status);

  const pageSize = 10;

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(people.length / pageSize)),
  );

  const visible = people.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <section
      className={styles.directory}
      aria-label="Personnel directory"
      aria-busy={loading}
    >
      <div className={styles.toolbar}>
        <label className={styles.search}>
          Search personnel
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setPage(1);

              setQuery(event.target.value);
            }}
            placeholder="Name, role or supervisor"
          />
        </label>
        <label className={styles.filter}>
          <span id="personnel-role-label">Role</span>
          <Select
            id="personnel-role"
            labelId="personnel-role-label"
            value={role}
            onValueChange={(value) => {
              setRole(value);

              setPage(1);
            }}
            options={[
              { value: "", label: "All roles" },
              ...roles.map((value) => {
                return { value, label: roleLabels[value] };
              }),
            ]}
          />
        </label>
        <label className={styles.filter}>
          <span id="personnel-status-label">Status</span>
          <Select
            id="personnel-status"
            labelId="personnel-status-label"
            value={status}
            onValueChange={(value) => {
              setStatus(value);

              setPage(1);
            }}
            options={[
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </label>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setPage(1);

              setQuery("");

              setRole("");

              setStatus("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      <p className={styles.count} role="status">
        {loading ? (
          <WorkspaceProgress label="Loading personnel…" />
        ) : (
          `${people.length} of ${staff.length} staff`
        )}
      </p>
      <div
        className={styles.tableWrap}
        role="region"
        aria-label="Personnel results"
        tabIndex={0}
      >
        <table className={styles.table}>
          <caption className={styles.srOnly}>
            Authorized personnel directory
          </caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">Supervisor</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && !staff.length ? (
              <TableSkeletonRows
                columns={4}
                rows={8}
                label="Loading personnel"
              />
            ) : (
              visible.map((person) => {
                return (
                  <tr key={person.id}>
                    <th scope="row">{person.name}</th>
                    <td data-label="Role">{roleLabels[person.role]}</td>
                    <td data-label="Supervisor">
                      {person.supervisor?.name ?? "Not assigned"}
                    </td>
                    <td data-label="Status">
                      <span
                        className={styles.status}
                        data-active={person.active}
                      >
                        {person.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <RecordPagination
        page={currentPage}
        pageSize={pageSize}
        total={people.length}
        hasNext={currentPage * pageSize < people.length}
        loading={loading}
        onPage={setPage}
      />
      {!loading && !people.length && (
        <div className={styles.empty}>
          <strong>
            {filtered ? "No matching personnel" : "No personnel in your scope"}
          </strong>
          {filtered && <p>Try another name or clear the filters.</p>}
        </div>
      )}
    </section>
  );
}
