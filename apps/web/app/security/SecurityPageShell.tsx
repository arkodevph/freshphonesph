import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import glass from "../portal/portal-glass.module.css";
import portal from "../portal/portal.module.css";
import styles from "./security.module.css";

export default function SecurityPageShell({
  children,
  workspaceHref,
}: {
  children: ReactNode;
  workspaceHref?: string;
}) {
  return (
    <div
      className={`${portal.shell} ${portal.macDashboard} ${glass.material} ${glass.interactions} ${styles.page}`}
      data-glass-portal=""
      data-security-page=""
    >
      <header className={styles.topbar} data-portal-material="toolbar">
        <div className={styles.topbarInner}>
          <Link className={styles.brand} href="/">
            <Image
              src="/brand/fresh-phones-logo.png"
              alt=""
              width={40}
              height={40}
            />
            <span>
              <strong>Fresh Phones</strong>
              <small>Account security</small>
            </span>
          </Link>
          {workspaceHref && (
            <Link className={styles.workspaceLink} href={workspaceHref}>
              Return to your workspace
            </Link>
          )}
        </div>
      </header>
      <main className={styles.wrap}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Your account</p>
          <h1>Account security</h1>
          <p>Protect your account and manage where you are signed in.</p>
        </header>
        {children}
      </main>
    </div>
  );
}
