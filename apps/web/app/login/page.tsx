"use client";

import { useState } from "react";
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
import { login, fetchMe } from "@/lib/api";
import { saveTokens, saveMe } from "@/lib/auth";
import { TYPESCRIPT_API } from "@/lib/backend";
import LoginCharacters, { type CharacterMood } from "./LoginCharacters";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(null);
  const mood: CharacterMood = showPassword
    ? "private"
    : error
      ? "error"
      : loading
        ? "loading"
        : focusedField ? "typing" : "idle";

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
          <h1 id="login-title">Welcome back!</h1>
          <p className={styles.intro}>Your Fresh Phones workspace is waiting.</p>

          <form onSubmit={onSubmit} className={styles.form} aria-busy={loading}>
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
        </div>
        <p className={styles.footer}><strong>One login. Your own workspace.</strong>Secure access for customers and the Fresh Phones team.</p>
      </section>
      </div>
    </main>
  );
}
