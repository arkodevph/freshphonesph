import { legalDocuments } from '@freshphones/contracts';
import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';
export const metadata: Metadata = { title: 'Portal Terms of Use · Fresh Phones PH',
  robots: legalDocuments.PORTAL_TERMS.status === 'DRAFT' ? { index: false, follow: false } : undefined };
export default function TermsPage() { return <LegalDocumentPage document={legalDocuments.PORTAL_TERMS} />; }
