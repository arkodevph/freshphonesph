"use client";

import WorkspaceProgress from "@/components/WorkspaceProgress";
import { can, useMe } from "@/lib/useMe";
import styles from "./catalog.module.css";
import { CatalogWorkspace } from "./CatalogWorkspace";

export default function CatalogPage() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading catalog access…" />;
  }

  if (!can(me, "CATALOG_MANAGE")) {
    return (
      <section className={styles.page}>
        <h1>No access</h1>
        <p>Your role cannot manage the public catalog.</p>
      </section>
    );
  }

  return <CatalogWorkspace key={me.id} />;
}
