"use client";

import { useEffect, useState } from "react";
import { Bell, FloppyDisk, Info, PaperPlaneTilt } from "@phosphor-icons/react";
import { tsRequest } from "@/lib/ts-api";
import { can, useMe } from "@/lib/useMe";
import styles from "./notification-settings.module.css";

type Template = { kind: string; subject: string; body: string; version: number };
type Settings = { reminderDays: string; reminderVersion: number; testEmailConfigured: boolean; usingResendTestSender: boolean; templates: Template[] };
const labels: Record<string, string> = { payment: "Payment verified", release: "Release status", support: "Support update", document: "Document review", installment: "Installment reminder" };

export default function NotificationSettingsPage() {
  const me = useMe();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  const [testEmail, setTestEmail] = useState("");
  useEffect(() => {
    if (!can(me, "ACCOUNT_MANAGE")) return;
    void tsRequest<Settings>("/customer-notification-settings").then(setSettings).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load notification settings."));
  }, [me]);
  function editTemplate(kind: string, field: "subject" | "body", value: string) {
    setSettings((current) => current ? { ...current, templates: current.templates.map((item) => item.kind === kind ? { ...item, [field]: value } : item) } : current);
  }
  async function saveTemplate(template: Template) {
    setSaving(template.kind); setError(""); setNotice("");
    try {
      const updated = await tsRequest<Template>(`/customer-notification-settings/templates/${template.kind}`, { method: "PATCH", body: JSON.stringify({ version: template.version, subject: template.subject, body: template.body }) });
      setSettings((current) => current ? { ...current, templates: current.templates.map((item) => item.kind === template.kind ? updated : item) } : current);
      setNotice(`${labels[template.kind]} email saved.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save template."); }
    finally { setSaving(""); }
  }
  async function saveReminders() {
    if (!settings) return;
    setSaving("reminders"); setError(""); setNotice("");
    try {
      const updated = await tsRequest<{ reminderDays: string; version: number }>("/customer-notification-settings/reminders", { method: "PATCH", body: JSON.stringify({ version: settings.reminderVersion, reminderDays: settings.reminderDays }) });
      setSettings((current) => current ? { ...current, reminderDays: updated.reminderDays, reminderVersion: updated.version } : current);
      setNotice("Reminder timing saved.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save reminder timing."); }
    finally { setSaving(""); }
  }
  async function sendTestReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving("test"); setError(""); setNotice("");
    try {
      await tsRequest<{ sent: true }>("/customer-notification-settings/test-reminder", { method: "POST", body: JSON.stringify({ email: testEmail.trim() }) });
      setNotice(`The email provider accepted a test reminder for ${testEmail.trim()}. Check that inbox and its spam folder.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send the test reminder."); }
    finally { setSaving(""); }
  }
  if (!can(me, "ACCOUNT_MANAGE")) return <main className={styles.page}><p>Owner access is required for customer email settings.</p></main>;
  return <main className={styles.page}>
    <header><p className={styles.eyebrow}>Customer communications</p><h1><Bell weight="duotone" aria-hidden="true" /> Notification settings</h1><p>Review the wording customers receive by email and choose when installment reminders run.</p></header>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.success} role="status">{notice}</p>}
    {!settings ? <p>Loading settings…</p> : <>
      <section className={styles.card}><h2>Installment reminders</h2><p>Enter days before the due date, separated by commas. For example, <strong>3,0</strong> sends one reminder three days before and one on the due date. Leave blank to stop reminders.</p><label htmlFor="reminder-days">Days before due date</label><div className={styles.row}><input id="reminder-days" value={settings.reminderDays} onChange={(event) => setSettings({ ...settings, reminderDays: event.target.value })} placeholder="Disabled" /><button type="button" disabled={Boolean(saving)} onClick={saveReminders}><FloppyDisk aria-hidden="true" /> {saving === "reminders" ? "Saving…" : "Save timing"}</button></div></section>
      <section className={`${styles.card} ${styles.testCard}`}><h2>Send yourself a test reminder</h2><p>Use your own inbox to check the installment reminder email. This sample has no customer details and creates no payment or notification record.</p>
        {!settings.testEmailConfigured && <p className={styles.setup}>To test your own inbox, create a Resend account with that email, then add its sending API key and <code>Fresh Phones Test &lt;onboarding@resend.dev&gt;</code> as the sender in the private API environment. Restart the API afterward.</p>}
        {settings.usingResendTestSender && <p className={styles.setup}>With Resend’s test sender, enter the same email address you used to create your Resend account.</p>}
        <form onSubmit={sendTestReminder}><label htmlFor="test-reminder-email">Your email address</label><div className={styles.testRow}><input id="test-reminder-email" type="email" autoComplete="email" required maxLength={254} value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="you@example.com" /><button type="submit" disabled={Boolean(saving) || !settings.testEmailConfigured}><PaperPlaneTilt aria-hidden="true" /> {saving === "test" ? "Sending…" : "Send test email"}</button></div></form>
      </section>
      <div className={styles.note}><Info aria-hidden="true" /><span>Use <code>{'{title}'}</code> in every subject and <code>{'{message}'}</code> and <code>{'{url}'}</code> in each email body. The system fills them from the customer’s own event.</span></div>
      <div className={styles.grid}>{settings.templates.map((template) => <section className={styles.card} key={template.kind}><h2>{labels[template.kind]}</h2><label htmlFor={`subject-${template.kind}`}>Subject</label><input id={`subject-${template.kind}`} value={template.subject} onChange={(event) => editTemplate(template.kind, "subject", event.target.value)} maxLength={180} /><label htmlFor={`body-${template.kind}`}>Email body</label><textarea id={`body-${template.kind}`} value={template.body} onChange={(event) => editTemplate(template.kind, "body", event.target.value)} maxLength={2500} rows={7} /><button type="button" disabled={Boolean(saving)} onClick={() => saveTemplate(template)}><FloppyDisk aria-hidden="true" /> {saving === template.kind ? "Saving…" : "Save email"}</button></section>)}</div>
    </>}
  </main>;
}
