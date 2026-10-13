import Link from 'next/link';
import type { Metadata } from 'next';
import { legalDocuments } from '@freshphones/contracts';
import styles from './privacy.module.css';

const notices = [
  { href: '/privacy/customer', document: legalDocuments.CUSTOMER_PRIVACY },
  { href: '/privacy/employee', document: legalDocuments.EMPLOYEE_PRIVACY },
  { href: '/privacy/applicant', document: legalDocuments.APPLICANT_PRIVACY },
  { href: '/terms', document: legalDocuments.PORTAL_TERMS },
];
export const metadata: Metadata = {
  title: 'Privacy and terms · Fresh Phones PH',
  robots: notices.some(({ document }) => document.status === 'DRAFT') ? { index: false, follow: false } : undefined,
};

export default function PrivacyIndex() {
  return <main className={styles.page}><div className={styles.shell}>
    <Link href="/" className={styles.back}>← Fresh Phones PH</Link>
    <h1>Privacy and terms</h1>
    <p className={styles.intro}>Choose the notice that applies to you. The current texts are drafts for Fresh Phones PH to review before publication.</p>
    <div className={styles.grid}>{notices.map(({ href, document }) => <Link href={href} className={styles.card} key={href}>
      <span>{document.audience}</span><strong>{document.title}</strong><small>{document.status === 'DRAFT' ? 'Draft · awaiting business approval' : `Version ${document.version}`}</small>
    </Link>)}</div>
    <p className={styles.help}>For questions about a current account, use <Link href="/support">Help & Support</Link>. The formal privacy contact still needs confirmation by Fresh Phones PH.</p>
  </div></main>;
}
