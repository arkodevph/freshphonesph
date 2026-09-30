"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LockKey, SignOut } from "@phosphor-icons/react";
import { TYPESCRIPT_API, API_URL } from "@/lib/backend";
import { tsRequest } from "@/lib/ts-api";
import styles from "./portal.module.css";

type RequestState = "idle" | "sending" | "sent";

export function CustomerSecuritySettings({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const resetPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const match = /^#reset-code=([A-Za-z0-9_-]{32,128})$/.exec(window.location.hash);
    if (!match) return;
    setResetCode(match[1]);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    document.getElementById("settings-security-title")?.scrollIntoView({ block: "start" });
    window.requestAnimationFrame(() => resetPasswordRef.current?.focus());
  }, []);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changeBusy) return;
    setChangeError(null);
    setChangeSuccess(false);
    if (newPassword !== confirmPassword) { setChangeError("New passwords do not match."); return; }
    if (currentPassword === newPassword) { setChangeError("Choose a different new password."); return; }
    setChangeBusy(true);
    try {
      await tsRequest<{ ok: true }>("/auth/change-password", {
        method: "POST", body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangeSuccess(true);
    } catch (caught) {
      setChangeError(caught instanceof Error ? caught.message : "Could not change your password.");
    } finally { setChangeBusy(false); }
  }

  async function requestResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || requestState !== "idle") return;
    setRequestState("sending");
    setRequestError(null);
    try {
      await tsRequest<{ message: string }>("/auth/forgot-password", {
        method: "POST", body: JSON.stringify({ email }),
      });
      setRequestState("sent");
    } catch (caught) {
      setRequestError(caught instanceof Error ? caught.message : "Could not request a reset code.");
      setRequestState("idle");
    }
  }

  async function resetWithCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resetBusy || resetSuccess) return;
    setResetError(null);
    if (resetPassword !== resetConfirm) { setResetError("New passwords do not match."); return; }
    setResetBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetCode.trim(), password: resetPassword }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string | string[] };
        throw new Error(Array.isArray(body.message) ? body.message.join(" ") : body.message ?? "Could not reset your password.");
      }
      setResetCode("");
      setResetPassword("");
      setResetConfirm("");
      setResetSuccess(true);
    } catch (caught) {
      setResetError(caught instanceof Error ? caught.message : "Could not reset your password.");
    } finally { setResetBusy(false); }
  }

  return <section className={`${styles.sectionCard} ${styles.settingsSecurity}`} aria-labelledby="settings-security-title">
    <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.settingsIcon}`}><LockKey weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Account access</p><h2 id="settings-security-title">Security</h2></div></div>
    {TYPESCRIPT_API ? <div className={styles.securityMethods}>
      <div className={styles.securityMethod}>
        <h3>Change password</h3>
        <p>Use your current password to update it here. Other sessions will be signed out.</p>
        <form className={styles.securityForm} onSubmit={changePassword}>
          <label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <label>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          {changeError && <p className={styles.resetRequestError} role="alert">{changeError}</p>}
          {changeSuccess && <p className={styles.resetRequestSuccess} role="status">Password changed. You can keep using this session.</p>}
          <button type="submit" disabled={changeBusy}><LockKey aria-hidden="true" /> {changeBusy ? "Updating…" : "Update password"}</button>
        </form>
      </div>
      <div className={styles.securityMethod}>
        <h3>Reset by email</h3>
        <p>Request a code for your account email. It expires after 30 minutes.</p>
        <form className={styles.securityForm} onSubmit={requestResetLink}>
          <div className={styles.resetRecipient}><span>Account email</span><strong>{email ?? "Loading account email…"}</strong></div>
          {requestError && <p className={styles.resetRequestError} role="alert">{requestError}</p>}
          {requestState === "sent" && <p className={styles.resetRequestSuccess} role="status">If this account is active, a reset email will be sent. Copy its code below.</p>}
          <button type="submit" disabled={!email || requestState !== "idle"}><LockKey aria-hidden="true" /> {requestState === "sending" ? "Requesting…" : requestState === "sent" ? "Code requested" : "Send reset code"}</button>
        </form>
        <form className={`${styles.securityForm} ${styles.resetCodeForm}`} onSubmit={resetWithCode}>
          <h4>Enter your reset code</h4>
          <label>Code from email<input type="password" autoComplete="one-time-code" autoCapitalize="off" spellCheck={false} minLength={32} maxLength={128} required value={resetCode} onChange={(event) => setResetCode(event.target.value)} /></label>
          <label>New password<input ref={resetPasswordRef} type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} /></label>
          {resetError && <p className={styles.resetRequestError} role="alert">{resetError}</p>}
          {resetSuccess && <p className={styles.resetRequestSuccess} role="status">Password reset. Existing sessions are signed out. <Link href="/login">Sign in again</Link>.</p>}
          <button type="submit" disabled={resetBusy || resetSuccess}><LockKey aria-hidden="true" /> {resetBusy ? "Resetting…" : "Reset password"}</button>
        </form>
      </div>
    </div> : <><p className={styles.settingsDescription}>Contact Customer Service if you need help with your account password.</p><Link className={styles.settingsLink} href="/portal/support">Contact support <ArrowRight weight="bold" aria-hidden="true" /></Link></>}
    <div className={styles.settingsActions}><button type="button" onClick={onSignOut}><SignOut aria-hidden="true" /> Sign out</button></div>
  </section>;
}
