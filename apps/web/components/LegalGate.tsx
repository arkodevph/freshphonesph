'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { TYPESCRIPT_API } from '@/lib/backend';
import { getLegalStatus, acknowledgeLegalDocument, type LegalStatus } from '@/lib/legal';
import { logoutSession } from '@/lib/auth';
import { useMe } from '@/lib/useMe';
import styles from './legal-gate.module.css';

export function LegalGate({ children }: { children: ReactNode }) {
  const me = useMe();
  const [status, setStatus] = useState<LegalStatus | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const loadingFor = useRef<string | null>(null);
  const reload = useCallback(() => {
    if (!TYPESCRIPT_API || !me) return;
    const userId = String(me.id);
    if (loadingFor.current === userId) return;
    loadingFor.current = userId;
    setLoadError(null); setActionError(null); setLoadedFor(null);
    void getLegalStatus().then((result) => { if (loadingFor.current !== userId) return; setStatus(result); setLoadedFor(userId); setChecked(false); })
      .catch(() => { if (loadingFor.current === userId) setLoadError('Could not check the current notices. Please try again.'); })
      .finally(() => { if (loadingFor.current === userId) loadingFor.current = null; });
  }, [me?.id]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (!TYPESCRIPT_API) return;
    window.addEventListener('focus', reload);
    window.addEventListener('fp-legal-required', reload);
    return () => { window.removeEventListener('focus', reload); window.removeEventListener('fp-legal-required', reload); };
  }, [reload]);

  if (!TYPESCRIPT_API) return <>{children}</>;
  if (!me || (loadedFor !== String(me.id) && !loadError)) return <section className={styles.screen} role="status">Checking account notices…</section>;
  if (loadError) return <section className={styles.screen} aria-label="Current privacy notice"><div className={styles.card} role="alert">
    <h1>Notices are unavailable</h1><p>{loadError}</p><button type="button" onClick={reload}>Try again</button>
  </div></section>;
  const document = status?.pending[0];
  if (!document) return <>{children}</>;

  async function submit() {
    if (!document || !checked || busy) return;
    setBusy(true); setActionError(null);
    try { await acknowledgeLegalDocument(document); reload(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Could not save your choice.'); }
    finally { setBusy(false); }
  }
  async function leave() {
    await logoutSession().catch(() => undefined);
    window.location.assign('/login');
  }
  return <section className={styles.screen} aria-label="Current privacy notice and terms">
    <div className={styles.card}>
      <p className={styles.eyebrow}>Fresh Phones PH · Current document</p>
      <h1>{document.title}</h1>
      <p className={styles.meta}>Version {document.version} · {status?.pending.length} document{status?.pending.length === 1 ? '' : 's'} to review</p>
      <div className={styles.content}>
        {document.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>)}
      </div>
      <p className={styles.links}>You can also open the <Link href={document.key === 'PORTAL_TERMS' ? '/terms' : document.key === 'CUSTOMER_PRIVACY' ? '/privacy/customer' : '/privacy/employee'} target="_blank">full document in a new tab</Link>.</p>
      <label className={styles.choice}><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
        <span>{document.key === 'PORTAL_TERMS' ? 'I agree to this version of the Portal Terms of Use.' : 'I have read this version of the privacy notice.'}</span>
      </label>
      {actionError && <p className={styles.error} role="alert">{actionError}</p>}
      <div className={styles.actions}><button type="button" onClick={submit} disabled={!checked || busy}>{busy ? 'Saving…' : document.key === 'PORTAL_TERMS' ? 'Agree and continue' : 'Acknowledge and continue'}</button>
        <button type="button" className={styles.leave} onClick={() => void leave()}>Sign out</button></div>
    </div>
  </section>;
}
