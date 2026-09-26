"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle, LockKey, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { API_URL } from "@/lib/backend";

export function PasswordRecovery({ mode }: { mode: "request" | "reset" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "reset") return;
    const value = window.location.hash.slice(1);
    setToken(value);
    if (value) window.history.replaceState(null, "", window.location.pathname);
  }, [mode]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "reset" && password !== confirm) { setError("Passwords do not match."); return; }
    if (mode === "reset" && !token) { setError("This reset link is missing its token. Request a new link."); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/${mode === "request" ? "forgot-password" : "reset-password"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "request" ? { email } : { token, password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string | string[] };
        throw new Error(Array.isArray(body.message) ? body.message.join(" ") : body.message ?? "Could not complete this request.");
      }
      setSuccess(true);
      setToken("");
      setPassword("");
      setConfirm("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete this request.");
    } finally { setLoading(false); }
  }

  return <main className="login-shell">
    <section className="login-story" aria-label="Fresh Phones PH operations workspace">
      <div className="login-story-grid" aria-hidden="true" />
      <Link href="/" className="login-brand" aria-label="Fresh Phones PH home"><span className="login-brand-mark"><Image src="/brand/fresh-phones-logo.png" alt="" width={48} height={48} /></span><span><strong>Fresh Phones PH</strong><small>Operations workspace</small></span></Link>
      <div className="login-story-copy"><p className="login-story-kicker"><span aria-hidden="true" /> Private workspace</p><p className="login-story-title">Clear records.<br /><span>Confident decisions.</span></p><p className="login-story-description">Secure access for your membership and payment records.</p></div>
      <p className="login-story-footer">FP Gadget Center <span aria-hidden="true">•</span> Internal access</p>
    </section>
    <section className="login-panel">
      <Link href="/login" className="login-back-link"><ArrowLeft aria-hidden="true" /> Back to sign in</Link>
      <div className="login-form-wrap">
        <p className="login-eyebrow">Account access</p>
        <h1>{mode === "request" ? "Reset your password" : "Choose a new password"}</h1>
        <p className="login-intro">{mode === "request" ? "Enter your account email. If it is active, we’ll send a link that expires in 30 minutes." : "Use at least 12 characters. This link works once and expires after 30 minutes."}</p>
        {success ? <div className="login-recovery-success" role="status"><CheckCircle weight="fill" aria-hidden="true" /><div><strong>{mode === "request" ? "Check your email" : "Password updated"}</strong><p>{mode === "request" ? "If an active account exists, a reset link has been sent." : "Sign in with your new password."}</p><Link href="/login">Back to sign in</Link></div></div> :
        <form className="login-form" onSubmit={submit}>
          {mode === "request" ? <div className="login-field"><label htmlFor="recovery-email">Account email</label><input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@freshphones.ph" /></div> : <>
            <div className="login-field"><label htmlFor="recovery-password">New password</label><input id="recovery-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            <div className="login-field"><label htmlFor="recovery-confirm">Confirm new password</label><input id="recovery-confirm" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></div>
          </>}
          {error && <div className="login-error" role="alert"><WarningCircle weight="fill" aria-hidden="true" /><div><strong>Couldn’t complete this request</strong><p>{error}</p></div></div>}
          <button type="submit" disabled={loading || (mode === "reset" && !token)} className="login-submit">{loading ? <SpinnerGap className="login-spinner" aria-hidden="true" /> : <LockKey aria-hidden="true" />}{loading ? "Please wait…" : mode === "request" ? "Send reset link" : "Update password"}</button>
          {mode === "reset" && !token && <p className="login-recovery-help">No valid link found. <Link href="/forgot-password">Request a new one</Link>.</p>}
        </form>}
      </div>
      <p className="login-panel-footer">Fresh Phones PH customer and staff accounts</p>
    </section>
  </main>;
}
