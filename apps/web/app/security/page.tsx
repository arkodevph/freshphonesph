"use client";

import { useToastNotice } from "@/lib/useToastNotice";
import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/lib/api";
import { logoutSession } from "@/lib/auth";
import { ApiError, tsRequest } from "@/lib/ts-api";
import PasswordChangeForm from "./PasswordChangeForm";
import SecurityPageShell from "./SecurityPageShell";
import ActiveSessions, { type SecuritySession } from "./ActiveSessions";
import styles from "./security.module.css";

type Security = {
  enabled: boolean;
  required: boolean;
  sessions: SecuritySession[];
};

type Enrollment = { totpURI: string; backupCodes: string[] };

export default function SecurityPage() {
  const router = useRouter();

  const [security, setSecurity] = useState<Security | null>(null),
    [destination, setDestination] = useState("/system");

  const [staff, setStaff] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState(""),
    [code, setCode] = useState("");

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null),
    [codes, setCodes] = useState<string[]>([]);

  const [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useToastNotice("");

  async function load() {
    try {
      const [current, me] = await Promise.all([
        tsRequest<Security>("/auth/security"),
        fetchMe(),
      ]);

      setSecurity(current);

      setStaff(me.account_type === "employee");

      setEmail(me.email);

      setError("");

      setDestination(
        me.account_type === "customer" ? "/portal/settings" : "/system",
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        router.replace("/login");
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load account security.",
        );
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(work: () => Promise<void>) {
    setBusy(true);

    setError("");

    setNotice("");

    try {
      await work();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update account security.",
      );
    } finally {
      setBusy(false);

      setPassword("");

      setCode("");
    }
  }

  function enable(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      const data = await tsRequest<Enrollment>("/auth/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      setEnrollment(data);

      setCodes(data.backupCodes);

      setSaved(false);
    });
  }

  function verify(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await tsRequest("/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });

      setEnrollment(null);

      setCodes([]);

      setNotice(
        "Two-factor authentication is enabled. Other sessions have been signed out.",
      );

      await load();
    });
  }

  function manage(action: "disable" | "recovery-codes") {
    void run(async () => {
      const data = await tsRequest<{ backupCodes?: string[] }>(
        `/auth/mfa/${action}`,
        { method: "POST", body: JSON.stringify({ password }) },
      );

      setCodes(data.backupCodes ?? []);

      setSaved(false);

      setNotice(
        action === "disable"
          ? "Two-factor authentication is disabled. Other sessions have been signed out."
          : "New recovery codes are ready. Your previous codes no longer work.",
      );

      await load();
    });
  }

  return (
    <SecurityPageShell
      workspaceHref={
        security && (!security.required || security.enabled)
          ? destination
          : undefined
      }
    >
      {error && (
        <p className={styles.error} role="alert">
          {error}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void load();
            }}
          >
            Retry security settings
          </button>
        </p>
      )}
      {notice && (
        <p className={styles.success} role="status">
          {notice}
        </p>
      )}
      {!security ? (
        error ? null : (
          <p role="status">Loading security settings…</p>
        )
      ) : (
        <>
          <div className={styles.contentGrid} data-has-password={staff}>
            {staff && (
              <PasswordChangeForm
                email={email}
                disabled={busy || !!enrollment || (codes.length > 0 && !saved)}
                unavailableReason={
                  enrollment
                    ? "Finish your authenticator setup before changing your password."
                    : codes.length > 0 && !saved
                      ? "Save your recovery codes before changing your password."
                      : undefined
                }
                onBusyChange={(changing) => {
                  setBusy(changing);

                  if (changing) {
                    setError("");

                    setNotice("");
                  }
                }}
                onChanged={async () => {
                  setPassword("");

                  setCode("");

                  await load();
                }}
                onSessionExpired={() => {
                  setPassword("");

                  setCode("");

                  setSecurity(null);

                  router.replace("/login");
                }}
              />
            )}
            <div className={styles.securityColumn}>
              <section
                className={styles.card}
                data-portal-material="card"
                aria-labelledby="security-mfa-title"
              >
                <div className={styles.cardHeading}>
                  <span className={styles.sectionIcon}>
                    <ShieldCheck aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="security-mfa-title">Two-factor authentication</h2>
                    <p
                      className={styles.statusBadge}
                      data-enabled={security.enabled}
                    >
                      <strong>
                        {security.enabled ? "Enabled" : "Not enabled"}
                      </strong>
                    </p>
                  </div>
                </div>
                {security.required && <p>Required for your staff account</p>}
                <p>
                  Use an authenticator app to generate a code when you sign in.
                  Keep recovery codes somewhere safe for use if you lose access
                  to your app.
                </p>
                {security.required && !security.enabled && (
                  <p className={styles.note}>
                    Set up your authenticator before opening the staff
                    workspace.
                  </p>
                )}
                {enrollment ? (
                  <>
                    <h3>1. Add this account to your authenticator</h3>
                    <p>
                      Scan this QR code in your authenticator app. This code
                      stays on this device.
                    </p>
                    <div className={styles.qr}>
                      <QRCode value={enrollment.totpURI} size={200} />
                    </div>
                    <details>
                      <summary>Enter a setup key manually</summary>
                      <p>
                        Account: {new URL(enrollment.totpURI).pathname.slice(1)}
                      </p>
                      <code className={styles.secret}>
                        {new URL(enrollment.totpURI).searchParams.get("secret")}
                      </code>
                    </details>
                    <h3>2. Save your recovery codes</h3>
                  </>
                ) : !security.enabled ? (
                  <form onSubmit={enable}>
                    <label>
                      Current password
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        maxLength={128}
                        value={password}
                        onChange={(event) => {
                          return setPassword(event.target.value);
                        }}
                        disabled={busy}
                      />
                    </label>
                    <button className={styles.primaryButton} disabled={busy}>
                      {busy ? "Preparing…" : "Set up authenticator"}
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();

                      manage("recovery-codes");
                    }}
                  >
                    <label>
                      Current password
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        maxLength={128}
                        value={password}
                        onChange={(event) => {
                          return setPassword(event.target.value);
                        }}
                        disabled={busy}
                      />
                    </label>
                    <div className={styles.actions}>
                      <button disabled={busy}>
                        Generate new recovery codes
                      </button>
                      {!security.required && (
                        <button
                          type="button"
                          disabled={busy || !password}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Disable two-factor authentication for this account?",
                              )
                            ) {
                              manage("disable");
                            }
                          }}
                        >
                          Disable two-factor authentication
                        </button>
                      )}
                    </div>
                  </form>
                )}
                {codes.length > 0 && (
                  <div className={styles.recovery}>
                    <p>
                      Each code works once. Save these now; they will disappear
                      when you leave this screen.
                    </p>
                    <ul>
                      {codes.map((value) => {
                        return (
                          <li key={value}>
                            <code>{value}</code>
                          </li>
                        );
                      })}
                    </ul>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={saved}
                        onChange={(event) => {
                          return setSaved(event.target.checked);
                        }}
                      />{" "}
                      I have saved my recovery codes in a safe place.
                    </label>
                    {!enrollment && (
                      <button
                        type="button"
                        disabled={!saved}
                        onClick={() => {
                          return setCodes([]);
                        }}
                      >
                        Done
                      </button>
                    )}
                  </div>
                )}
                {enrollment && (
                  <form onSubmit={verify}>
                    <h3>3. Verify your authenticator</h3>
                    <label>
                      Six-digit code
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={code}
                        onChange={(event) => {
                          return setCode(event.target.value);
                        }}
                        disabled={busy}
                      />
                    </label>
                    <button
                      className={styles.primaryButton}
                      disabled={busy || !saved}
                    >
                      {busy ? "Verifying…" : "Verify and enable"}
                    </button>
                  </form>
                )}
              </section>
              <ActiveSessions
                sessions={security.sessions}
                busy={busy}
                onRevoke={(sessionId) => {
                  void run(async () => {
                    await tsRequest("/auth/sessions/revoke", {
                      method: "POST",
                      body: JSON.stringify(sessionId ? { sessionId } : {}),
                    });

                    setNotice(
                      sessionId
                        ? "Session signed out."
                        : "Other sessions signed out.",
                    );

                    await load();
                  });
                }}
              />
            </div>
          </div>
          <footer>
            <button
              type="button"
              className={styles.dangerButton}
              disabled={busy}
              onClick={() => {
                return void run(async () => {
                  await logoutSession();

                  router.replace("/login");
                });
              }}
            >
              Sign out
            </button>
          </footer>
        </>
      )}
    </SecurityPageShell>
  );
}
