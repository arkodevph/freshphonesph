"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeSlash,
  ShieldCheck,
  Sparkle,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { login, fetchMe, MfaChallenge } from "@/lib/api";
import { saveTokens, saveMe } from "@/lib/auth";
import { TYPESCRIPT_API } from "@/lib/backend";
import { tsRequest } from "@/lib/ts-api";
import { safeSupportReturn, signInDestination } from "@/lib/support-entry";
import LoginCharacters, { type CharacterMood } from "./LoginCharacters";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState(false);
  const [code, setCode] = useState('');
  const [supportEntry, setSupportEntry] = useState(false);
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(null);
  const mood: CharacterMood = showPassword
    ? "private"
    : error
      ? "error"
      : loading
        ? "loading"
        : focusedField ? "typing" : "idle";

  useEffect(() => {
    setSupportEntry(Boolean(safeSupportReturn(new URLSearchParams(window.location.search).get("next"))));
  }, []);

  async function navigateAfterSignIn(destination: string) {
    if (TYPESCRIPT_API) {
      const security = await tsRequest<{ enabled: boolean; required: boolean }>('/auth/security');
      if (security.required && !security.enabled) { router.push('/security'); return; }
    }
    if (safeSupportReturn(destination)) {
      window.location.assign(destination);
      return;
    }
    router.push(destination);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await login(username, password);
      saveTokens(tokens);
      const requested = new URLSearchParams(window.location.search).get("next");
      let destination = signInDestination(null, requested);
      try {
        const me = await fetchMe();
        saveMe(me);
        destination = signInDestination(me, requested);
      } catch {
        /* non-fatal: useMe() will retry */
      }
      await navigateAfterSignIn(destination);
    } catch (caughtError) {
      if (caughtError instanceof MfaChallenge) { setChallenge(true); setPassword(''); setCode(''); }
      else setError(caughtError instanceof Error ? caughtError.message : "Sign-in failed. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault(); setError(null); setLoading(true);
    try {
      await tsRequest(`/auth/mfa/${recoveryCode ? 'backup' : 'verify'}`, { method: 'POST', body: JSON.stringify({ code: code.trim() }) });
      setCode(''); const me = await fetchMe(); saveMe(me);
      await navigateAfterSignIn(signInDestination(me, new URLSearchParams(window.location.search).get('next')));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not verify the code.'); }
    finally { setLoading(false); }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
      <section className={styles.story} aria-label="Fresh Phones PH">
        <Link href="/" className={styles.brand} aria-label="Fresh Phones PH home">
          <span className={styles.brandMark}>
            <Image src="/brand/fresh-phones-logo.png" alt="" width={48} height={48} priority />
          </span>
          <strong>Fresh Phones <span>PH</span></strong>
        </Link>
        <LoginCharacters mood={mood} />
      </section>

      <section className={styles.panel} aria-labelledby="login-title">
        <Link href="/" className={styles.backLink} aria-label="Back to website"><ArrowLeft aria-hidden="true" /> Back</Link>
        <Sparkle weight="fill" className={styles.symbol} aria-hidden="true" />
        <div className={styles.formWrap}>
          <h1 id="login-title">{challenge ? 'Verify your sign-in' : supportEntry ? "Sign in for support" : "Welcome back!"}</h1>
          <p className={styles.intro}>{supportEntry ? "Use your Fresh Phones PH account to start a request or follow an existing concern. We’ll bring you back to Support after sign-in." : "Your Fresh Phones workspace is waiting."}</p>

          {challenge ? <form onSubmit={verifyCode} className={styles.form} aria-busy={loading}>
            <p>{recoveryCode ? 'Enter one of your saved recovery codes. Each code can be used once.' : 'Enter the six-digit code from your authenticator app.'}</p>
            <div className={styles.field}><label htmlFor="mfa-code">{recoveryCode ? 'Recovery code' : 'Verification code'}</label>
              <input id="mfa-code" autoFocus required autoComplete="one-time-code" inputMode={recoveryCode ? 'text' : 'numeric'} pattern={recoveryCode ? undefined : '[0-9]{6}'} maxLength={40} value={code} onChange={event => setCode(event.target.value)} disabled={loading} /></div>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <button className={styles.submit} disabled={loading}>{loading ? 'Verifying…' : 'Verify and sign in'}</button>
            <button type="button" className={styles.accessLink} disabled={loading} onClick={() => { setRecoveryCode(!recoveryCode); setCode(''); setError(null); }}>{recoveryCode ? 'Use authenticator app' : 'Use a recovery code'}</button>
            <button type="button" className={styles.accessLink} disabled={loading} onClick={() => { setChallenge(false); setCode(''); setError(null); }}>Back to sign in</button>
          </form> : <><form onSubmit={onSubmit} className={styles.form} aria-busy={loading}>
            <div className={styles.field}>
              <label htmlFor="login-username">Email or username</label>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(event) => { setUsername(event.target.value); setError(null); }}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                placeholder="you@freshphones.ph"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="login-password">Password</label>
              <span className={styles.passwordField}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(null); }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
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
                  aria-controls="login-password"
                  disabled={loading}
                >
                  {showPassword ? <EyeSlash aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </div>

            <div className={styles.formOptions}>
              <span className={styles.secureNote}><ShieldCheck aria-hidden="true" /> Secure sign-in</span>
              {TYPESCRIPT_API && <Link href="/forgot-password" className={styles.recovery}>Forgot password?</Link>}
            </div>

            {error && (
              <div id="login-error" className={styles.error} role="alert">
                <WarningCircle weight="fill" aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className={styles.submit}>
              {loading && <SpinnerGap className={styles.spinner} aria-hidden="true" />}
              {loading ? "Signing in…" : "Log in"}
            </button>
            {TYPESCRIPT_API && <Link href="/account-access" className={styles.accessLink}>Need your account details? <ArrowRight aria-hidden="true" /></Link>}
          </form>

          </>}

          <p className={styles.helpLinks}><Link href="/support#contact">Need help signing in?</Link></p>
          <p className={styles.legalLinks}>Review the <Link href="/privacy/customer">customer privacy notice</Link>, <Link href="/privacy/employee">employee privacy notice</Link> and <Link href="/terms">portal terms</Link>.</p>
        </div>
        <p className={styles.footer}><strong>One login. Your own workspace.</strong>Secure access for customers and the Fresh Phones team.</p>
      </section>
      </div>
    </main>
  );
}
