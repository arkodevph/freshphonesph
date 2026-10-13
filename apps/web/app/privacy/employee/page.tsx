import { legalDocuments } from '@freshphones/contracts';
import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';
export const metadata: Metadata = { title: 'Employee Privacy Notice · Fresh Phones PH',
  robots: legalDocuments.EMPLOYEE_PRIVACY.status === 'DRAFT' ? { index: false, follow: false } : undefined };
export default function EmployeePrivacyPage() { return <LegalDocumentPage document={legalDocuments.EMPLOYEE_PRIVACY} />; }
