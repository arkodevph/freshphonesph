import { legalDocuments } from '@freshphones/contracts';
import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';
export const metadata: Metadata = { title: 'Customer Privacy Notice · Fresh Phones PH',
  robots: legalDocuments.CUSTOMER_PRIVACY.status === 'DRAFT' ? { index: false, follow: false } : undefined };
export default function CustomerPrivacyPage() { return <LegalDocumentPage document={legalDocuments.CUSTOMER_PRIVACY} />; }
