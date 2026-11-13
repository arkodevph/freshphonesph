"use client";

import WorkspaceProgress from "@/app/system/_role-designs/batch_manager/components/WorkspaceProgress";
import { can, useMe } from "@/lib/useMe";
import styles from "@/app/system/_role-designs/batch_manager/app/system/catalog/catalog.module.css";
import { CatalogWorkspace } from "@/app/system/_role-designs/batch_manager/app/system/catalog/CatalogWorkspace";

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
