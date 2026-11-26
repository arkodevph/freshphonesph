"use client";

import EmailTemplates from "@/app/system/_role-designs/coo/app/system/notification-settings/EmailTemplates";
import { useToastNotice } from "@/lib/useToastNotice";
import { useEffect, useState } from "react";
import { Bell, FloppyDisk, PaperPlaneTilt } from "@phosphor-icons/react";
import { tsRequest } from "@/lib/ts-api";
import { can, useMe } from "@/lib/useMe";
import styles from "@/app/system/_role-designs/coo/app/system/notification-settings/notification-settings.module.css";
import StaffEmailSettings from "@/app/system/_role-designs/coo/components/StaffEmailSettings";

type Template = {
  kind: string;
  subject: string;
  body: string;
  version: number;
};

type Settings = {
  reminderDays: string;
  reminderVersion: number;
  testEmailConfigured: boolean;
  usingResendTestSender: boolean;
  templates: Template[];
};

const labels: Record<string, string> = {
  payment: "Payment verified",
  release: "Release status",
  support: "Support update",
  document: "Document review",
  installment: "Installment reminder",
};

export default function NotificationSettingsPage() {
  const me = useMe();

  const [section, setSection] = useState("templates");

  const [templateKind, setTemplateKind] = useState("payment");

  const [settings, setSettings] = useState<Settings | null>(null);

  const [error, setError] = useState("");

  const [notice, setNotice] = useToastNotice("");

  const [saving, setSaving] = useState("");

  const [testEmail, setTestEmail] = useState("");

  const [audience, setAudience] = useState<"customer" | "staff">("customer");

  useEffect(() => {
    if (!can(me, "ACCOUNT_MANAGE")) {
      return;
    }

    void tsRequest<Settings>("/customer-notification-settings")
      .then(setSettings)
      .catch((caught) => {
        return setError(
          caught instanceof Error
            ? caught.message
            : "Could not load notification settings.",
        );
      });
  }, [me]);

  function editTemplate(
    kind: string,
    field: "subject" | "body",
    value: string,
  ) {
    setSettings((current) => {
      return current
        ? {
            ...current,
            templates: current.templates.map((item) => {
              return item.kind === kind ? { ...item, [field]: value } : item;
            }),
          }
        : current;
    });
  }

  async function saveTemplate(template: Template) {
    setSaving(template.kind);

    setError("");

    setNotice("");

    try {
      const updated = await tsRequest<Template>(
        `/customer-notification-settings/templates/${template.kind}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            version: template.version,
            subject: template.subject,
            body: template.body,
          }),
        },
      );

      setSettings((current) => {
        return current
          ? {
              ...current,
              templates: current.templates.map((item) => {
                return item.kind === template.kind ? updated : item;
              }),
            }
          : current;
      });

      setNotice(`${labels[template.kind]} email saved.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save template.",
      );
    } finally {
      setSaving("");
    }
  }

  async function saveReminders() {
    if (!settings) {
      return;
    }

    setSaving("reminders");

    setError("");

    setNotice("");

    try {
      const updated = await tsRequest<{
        reminderDays: string;
        version: number;
      }>("/customer-notification-settings/reminders", {
        method: "PATCH",
        body: JSON.stringify({
          version: settings.reminderVersion,
          reminderDays: settings.reminderDays,
        }),
      });

      setSettings((current) => {
        return current
          ? {
              ...current,
              reminderDays: updated.reminderDays,
              reminderVersion: updated.version,
            }
          : current;
      });

      setNotice("Reminder timing saved.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save reminder timing.",
      );
    } finally {
      setSaving("");
    }
  }

  async function sendTestReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving("test");

    setError("");

    setNotice("");

    try {
      await tsRequest<{ sent: true }>(
        "/customer-notification-settings/test-reminder",
        { method: "POST", body: JSON.stringify({ email: testEmail.trim() }) },
      );

      setNotice(
        `The email provider accepted a test reminder for ${testEmail.trim()}. Check that inbox and its spam folder.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not send the test reminder.",
      );
    } finally {
      setSaving("");
    }
  }

  if (!can(me, "ACCOUNT_MANAGE")) {
    return (
      <main className={styles.page}>
        <p>Owner access is required for email settings.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Email communications</p>
        <h1>
          <Bell weight="duotone" aria-hidden="true" /> Notification settings
        </h1>
        <p>
          Review customer and staff email wording, reminder timing and staff
          delivery status.
        </p>
      </header>
      <div className={styles.audience} role="group" aria-label="Email audience">
        <button
          type="button"
          aria-pressed={audience === "customer"}
          onClick={() => {
            return setAudience("customer");
          }}
        >
          Customer email
        </button>
        <button
          type="button"
          aria-pressed={audience === "staff"}
          onClick={() => {
            return setAudience("staff");
          }}
        >
          Staff email
        </button>
      </div>
      <div hidden={audience !== "staff"}>
        <StaffEmailSettings />
      </div>
      <div hidden={audience !== "customer"}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className={styles.success} role="status">
            {notice}
          </p>
        )}
        <div
          className={styles.audience}
          role="group"
          aria-label="Customer email settings"
        >
          {[
            ["templates", "Email templates"],
            ["timing", "Reminder timing"],
            ["test", "Test email"],
          ].map(([value, label]) => {
            return (
              <button
                key={value}
                type="button"
                disabled={!settings}
                aria-pressed={section === value}
                onClick={() => {
                  return setSection(value);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {!settings ? (
          <div>
            <EmailTemplates
              labels={labels}
              selected={templateKind}
              onSelect={setTemplateKind}
              saving={saving}
              onEdit={editTemplate}
              onSave={(template) => {
                void saveTemplate(template);
              }}
            />
          </div>
        ) : (
          <>
            <section hidden={section !== "timing"} className={styles.card}>
              <h2>Installment reminders</h2>
              <p>
                Enter days before the due date, separated by commas. For
                example, <strong>3,0</strong> sends one reminder three days
                before and one on the due date. Leave blank to stop reminders.
              </p>
              <label htmlFor="reminder-days">Days before due date</label>
              <div className={styles.row}>
                <input
                  id="reminder-days"
                  value={settings.reminderDays}
                  onChange={(event) => {
                    return setSettings({
                      ...settings,
                      reminderDays: event.target.value,
                    });
                  }}
                  placeholder="Disabled"
                />
                <button
                  type="button"
                  disabled={Boolean(saving)}
                  onClick={saveReminders}
                >
                  <FloppyDisk aria-hidden="true" />{" "}
                  {saving === "reminders" ? "Saving…" : "Save timing"}
                </button>
              </div>
            </section>
            <section
              hidden={section !== "test"}
              className={`${styles.card} ${styles.testCard}`}
            >
              <h2>Send yourself a test reminder</h2>
              <p>
                Use your own inbox to check the installment reminder email. This
                sample has no customer details and creates no payment or
                notification record.
              </p>
              {!settings.testEmailConfigured && (
                <p className={styles.setup}>
                  To test your own inbox, create a Resend account with that
                  email, then add its sending API key and{" "}
                  <code>Fresh Phones Test &lt;onboarding@resend.dev&gt;</code>{" "}
                  as the sender in the private API environment. Restart the API
                  afterward.
                </p>
              )}
              {settings.usingResendTestSender && (
                <p className={styles.setup}>
                  With Resend’s test sender, enter the same email address you
                  used to create your Resend account.
                </p>
              )}
              <form onSubmit={sendTestReminder}>
                <label htmlFor="test-reminder-email">Your email address</label>
                <div className={styles.testRow}>
                  <input
                    id="test-reminder-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={testEmail}
                    onChange={(event) => {
                      return setTestEmail(event.target.value);
                    }}
                    placeholder="you@example.com"
                  />
                  <button
                    type="submit"
                    disabled={Boolean(saving) || !settings.testEmailConfigured}
                  >
                    <PaperPlaneTilt aria-hidden="true" />{" "}
                    {saving === "test" ? "Sending…" : "Send test email"}
                  </button>
                </div>
              </form>
            </section>
            <div hidden={section !== "templates"}>
              <EmailTemplates
                templates={settings.templates}
                labels={labels}
                selected={templateKind}
                onSelect={setTemplateKind}
                saving={saving}
                onEdit={editTemplate}
                onSave={(template) => {
                  void saveTemplate(template);
                }}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
