"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeSlash,
  LockKey,
  SignIn,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { login, fetchMe } from "@/lib/api";
import { saveTokens, saveMe } from "@/lib/auth";

const accessPrinciples = [
  "Role-based access for staff and customers",
  "Only Finance-verified payments affect balances",
  "Sensitive account changes are recorded",
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await login(username, password);
      saveTokens(tokens);
      let destination = "/system";
      try {
        const me = await fetchMe();
        saveMe(me);
        if (me.account_type === "customer") destination = "/portal";
      } catch {
        /* non-fatal: useMe() will retry */
      }
      router.push(destination);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Sign-in failed. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Fresh Phones PH operations workspace">
        <div className="login-story-grid" aria-hidden="true" />
        <Link href="/" className="login-brand" aria-label="Fresh Phones PH home">
          <span className="login-brand-mark">
            <Image src="/brand/fresh-phones-logo.png" alt="" width={48} height={48} priority />
          </span>
          <span><strong>Fresh Phones PH</strong><small>Operations workspace</small></span>
        </Link>

        <div className="login-story-copy">
          <p className="login-story-kicker"><span aria-hidden="true" /> Private workspace</p>
          <p className="login-story-title">Clear records.<br /><span>Confident decisions.</span></p>
          <p className="login-story-description">
            A focused workspace for paluwagan records, customer updates, and payment verification.
          </p>
          <ul className="login-principles">
            {accessPrinciples.map((principle) => (
              <li key={principle}><CheckCircle weight="fill" aria-hidden="true" /><span>{principle}</span></li>
            ))}
          </ul>
        </div>

        <p className="login-story-footer">FP Gadget Center <span aria-hidden="true">•</span> Internal access</p>
      </section>

      <section className="login-panel">
        <Link href="/" className="login-back-link"><ArrowLeft aria-hidden="true" /> Back to website</Link>

        <div className="login-form-wrap">
          <p className="login-eyebrow">Account access</p>
          <h1>Welcome back</h1>
          <p className="login-intro">Sign in with the account provided by Fresh Phones PH.</p>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-username">Email or username</label>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                placeholder="you@freshphones.ph"
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <span className="login-password-field">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeSlash aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </div>

            {error && (
              <div id="login-error" className="login-error" role="alert">
                <WarningCircle weight="fill" aria-hidden="true" />
                <div><strong>Couldn’t sign you in</strong><p>{error}</p></div>
              </div>
            )}

            <button type="submit" disabled={loading} className="login-submit">
              {loading ? <SpinnerGap className="login-spinner" aria-hidden="true" /> : <SignIn weight="bold" aria-hidden="true" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="login-safety-note">
            <LockKey weight="fill" aria-hidden="true" />
            <p><strong>Private and role-protected</strong><span>Never share your password or one-time access details.</span></p>
          </div>
        </div>

        <p className="login-panel-footer">Payments happen externally. This workspace records and verifies them.</p>
      </section>
    </main>
  );
}
