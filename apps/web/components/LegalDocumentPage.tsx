import Link from 'next/link';
import type { LegalDocument } from '@freshphones/contracts';
import styles from './legal-document.module.css';

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return <main className={styles.page}>
    <div className={styles.shell}>
      <Link className={styles.back} href="/privacy">← Privacy and terms</Link>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Fresh Phones PH · {document.audience}</span>
        <h1>{document.title}</h1>
        <p>Version {document.version}{document.status === 'PUBLISHED' && document.publishedAt ? ` · Effective ${new Date(document.publishedAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}` : ''}</p>
      </header>
      {document.status === 'DRAFT' && <section className={styles.draft} aria-label="Unapproved draft">
        <strong>Draft for business and legal review</strong>
        <p>This wording has not been approved by Fresh Phones PH. It is shown so the business can review the proposed notice. No acceptance is requested for this draft.</p>
      </section>}
      <div className={styles.sections}>
        {document.sections.map((section) => <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>)}
      </div>
      {document.status === 'DRAFT' && <section className={styles.review} aria-label="Business decisions needed">
        <h2>Business decisions needed before publication</h2>
        <ul>{document.reviewItems.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>}
      <footer className={styles.footer}>
        <Link href="/privacy">All notices</Link><Link href="/support">Contact Fresh Phones PH</Link>
      </footer>
    </div>
  </main>;
}
