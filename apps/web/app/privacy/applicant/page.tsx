import { legalDocuments } from '@freshphones/contracts';
import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';
export const metadata: Metadata = { title: 'Applicant Privacy Notice · Fresh Phones PH',
  robots: legalDocuments.APPLICANT_PRIVACY.status === 'DRAFT' ? { index: false, follow: false } : undefined };
export default function ApplicantPrivacyPage() { return <LegalDocumentPage document={legalDocuments.APPLICANT_PRIVACY} />; }
