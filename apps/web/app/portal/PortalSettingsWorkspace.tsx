"use client";

import type { Me } from "@/lib/api";
import { type PortalSummary } from "@/lib/api";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Moon,
  Sun,
  UserCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { type MouseEvent } from "react";
import { CustomerSecuritySettings } from "./CustomerSecuritySettings";
import styles from "./portal.module.css";

type Props = {
  summary: PortalSummary | null;
  me: Me | null;
  theme: "light" | "dark";
  toggleTheme: (event: MouseEvent<HTMLButtonElement>) => void;
  logout: () => Promise<void>;
};

export default function PortalSettingsWorkspace({
  summary,
  me,
  theme,
  toggleTheme,
  logout,
}: Props) {
  return (
    <div className={styles.settingsWorkspace}>
      <section
        className={styles.sectionCard}
        aria-labelledby="settings-profile-title"
      >
        <div className={styles.sectionHeading}>
          <span className={`${styles.sectionIcon} ${styles.settingsIcon}`}>
            <UserCircle weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>Account</p>
            <h2 id="settings-profile-title">Profile details</h2>
          </div>
        </div>
        <dl className={styles.settingsDetails}>
          <div>
            <dt>Name</dt>
            <dd>{summary?.full_name ?? me?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{me?.email ?? "—"}</dd>
          </div>
        </dl>
        <p className={styles.settingsDescription}>
          If a detail is incorrect, Customer Service can help review your
          account record.
        </p>
        <Link className={styles.settingsLink} href="/portal/support">
          Contact support <ArrowRight weight="bold" aria-hidden="true" />
        </Link>
      </section>
      <section
        className={styles.sectionCard}
        aria-labelledby="settings-appearance-title"
      >
        <div className={styles.sectionHeading}>
          <span className={`${styles.sectionIcon} ${styles.settingsIcon}`}>
            <Sun weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>Display</p>
            <h2 id="settings-appearance-title">Appearance</h2>
          </div>
        </div>
        <p className={styles.settingsDescription}>
          Choose how the portal looks on this browser.
        </p>
        <div
          className={styles.appearanceOptions}
          role="group"
          aria-label="Portal appearance"
        >
          <button
            type="button"
            aria-pressed={theme === "light"}
            onClick={(event) => {
              if (theme !== "light") {
                toggleTheme(event);
              }
            }}
          >
            <Sun aria-hidden="true" />
            <span>Light</span>
            {theme === "light" && (
              <CheckCircle weight="fill" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            aria-pressed={theme === "dark"}
            onClick={(event) => {
              if (theme !== "dark") {
                toggleTheme(event);
              }
            }}
          >
            <Moon aria-hidden="true" />
            <span>Dark</span>
            {theme === "dark" && (
              <CheckCircle weight="fill" aria-hidden="true" />
            )}
          </button>
        </div>
      </section>
      <CustomerSecuritySettings email={me?.email} onSignOut={logout} />
      <section
        className={styles.sectionCard}
        aria-labelledby="settings-privacy-title"
      >
        <div className={styles.sectionHeading}>
          <span className={`${styles.sectionIcon} ${styles.settingsIcon}`}>
            <FileText weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>Your information</p>
            <h2 id="settings-privacy-title">Privacy and portal terms</h2>
          </div>
        </div>
        <p className={styles.settingsDescription}>
          Read the customer notice and portal terms that apply to this
          workspace.
        </p>
        <Link className={styles.settingsLink} href="/privacy/customer">
          Customer Privacy Notice{" "}
          <ArrowRight weight="bold" aria-hidden="true" />
        </Link>
        <Link className={styles.settingsLink} href="/terms">
          Portal Terms of Use <ArrowRight weight="bold" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
