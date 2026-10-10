import { z } from 'zod';

export const legalDocumentKeys = [
  'CUSTOMER_PRIVACY', 'EMPLOYEE_PRIVACY', 'APPLICANT_PRIVACY', 'PORTAL_TERMS',
] as const;
export const legalDocumentKeySchema = z.enum(legalDocumentKeys);
export type LegalDocumentKey = z.infer<typeof legalDocumentKeySchema>;
export type LegalDocument = {
  key: LegalDocumentKey;
  version: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  title: string;
  audience: string;
  sections: readonly { heading: string; paragraphs: readonly string[] }[];
  reviewItems: readonly string[];
};

// These texts are deliberately inactive. Fresh Phones PH must approve the exact
// controller identity, contact, legal bases, recipients and retention rules before
// changing a document to PUBLISHED. Change its version whenever the text changes.
export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  CUSTOMER_PRIVACY: {
    key: 'CUSTOMER_PRIVACY', version: 'draft-2026-10-09', status: 'DRAFT', publishedAt: null,
    title: 'Customer Privacy Notice', audience: 'Customers and prospective customers',
    sections: [
      { heading: 'Who handles your information', paragraphs: [
        'Fresh Phones PH / FP Gadget Center operates the customer records and portal. The exact registered name and privacy contact will be inserted after business review.',
      ] },
      { heading: 'Information used', paragraphs: [
        'The system may hold your name, contact details, batch and unit details, payment records and proof, support messages, account activity, and documents you or Records submit for an approved requirement.',
        'The portal does not take online payments. Staff record externally made payments, and Finance verifies them before they affect your balance.',
      ] },
      { heading: 'Why and how it is used', paragraphs: [
        'The proposed purposes are enrollment and account administration, installment and payment records, document review, support, service updates, security and audit. A human reviews payment verification and document decisions.',
        'The business must confirm the lawful basis for each purpose before this notice is published. This draft does not ask for marketing consent.',
      ] },
      { heading: 'Access and sharing', paragraphs: [
        'Authorized staff see only information needed for their roles. The portal limits customers to their own records. Private files are not public catalog files.',
        'The business must identify any service providers and other recipient categories, their locations, and any intended sharing before publication.',
      ] },
      { heading: 'Retention and your choices', paragraphs: [
        'The business must approve record-by-record retention periods and deletion rules. No fixed period is promised by this draft.',
        'You may ask about your information and applicable rights to be informed, access, correction, objection, erasure or blocking, and other rights under Philippine privacy law. A confirmed privacy contact and request process will be added here.',
      ] },
    ],
    reviewItems: ['Exact registered controller name and privacy contact', 'Lawful basis by purpose and any optional consent', 'Recipients, service providers and locations', 'Retention periods and request procedure'],
  },
  EMPLOYEE_PRIVACY: {
    key: 'EMPLOYEE_PRIVACY', version: 'draft-2026-10-09', status: 'DRAFT', publishedAt: null,
    title: 'Employee Privacy Notice', audience: 'Employees and authorized staff',
    sections: [
      { heading: 'Who handles your information', paragraphs: [
        'Fresh Phones PH / FP Gadget Center operates the staff workspace. The exact registered name and privacy contact remain subject to business confirmation.',
      ] },
      { heading: 'Information used', paragraphs: [
        'The system holds staff identity and account details, roles and access grants, assigned work, submitted task reports and files, objective timestamps, human KPI reviews, support and operational actions, and security/audit records.',
        'A late task flag records timing only. A consequential HR action requires a separate human proposal and Owner decision; the system does not calculate wage deductions or carry out an employment action.',
      ] },
      { heading: 'Purposes, access and retention', paragraphs: [
        'The proposed purposes are workspace access, task coordination, human review, operational accountability, account security, and legal recordkeeping. Confidential KPI and applicant access is separately restricted.',
        'Staff may ask about applicable rights to be informed, access, correction, objection, erasure or blocking, and other rights under Philippine privacy law. The business must identify the contact and procedure for those requests.',
        'The business must confirm the lawful basis, permitted recipients and processors, retention periods, employee rights channel, and any applicable HR policy before publication.',
      ] },
    ],
    reviewItems: ['Exact controller and privacy contact', 'HR/payroll lawful bases and approved written policy', 'Recipients and processors', 'Retention and employee rights procedure'],
  },
  APPLICANT_PRIVACY: {
    key: 'APPLICANT_PRIVACY', version: 'draft-2026-10-09', status: 'DRAFT', publishedAt: null,
    title: 'Applicant Privacy Notice', audience: 'Job applicants',
    sections: [
      { heading: 'Who handles your information', paragraphs: [
        'Fresh Phones PH / FP Gadget Center receives applications submitted on the Careers page. The exact registered name and privacy contact require business confirmation.',
      ] },
      { heading: 'Information used', paragraphs: [
        'The application form collects the role applied for, name and email, optional phone number and message, and an optional résumé or portfolio file. Authorized recruitment staff may record a review status and notes.',
      ] },
      { heading: 'Purpose and access', paragraphs: [
        'The proposed purpose is to review and respond to the application. Applicant details and attachments are restricted to authorized recruitment staff with confidential access. The system does not use an AI hiring decision.',
        'The business must confirm the lawful basis, any sharing or processors, whether unsuccessful applications are kept for future roles, and whether that would need a separate choice.',
      ] },
      { heading: 'Retention and rights', paragraphs: [
        'The business must approve how long applications and files are kept and how an applicant may request access, correction, objection or deletion where applicable. This draft gives no retention promise.',
      ] },
    ],
    reviewItems: ['Exact controller and privacy contact', 'Lawful basis and future-role choice', 'Recipients and processors', 'Applicant retention and request procedure'],
  },
  PORTAL_TERMS: {
    key: 'PORTAL_TERMS', version: 'draft-2026-10-09', status: 'DRAFT', publishedAt: null,
    title: 'Portal Terms of Use', audience: 'Customer portal users',
    sections: [
      { heading: 'What the portal does', paragraphs: [
        'The portal shows your membership, issued schedule, Finance-verified payment history, documents, release status, notifications and support requests. It is an operational records service; it does not collect an online payment or issue an official BIR invoice.',
      ] },
      { heading: 'Account use', paragraphs: [
        'Use the account provided for your own records and keep your sign-in details private. Tell Fresh Phones PH if you suspect unauthorized access or find an incorrect record.',
        'An individual offer or signed client agreement controls its own commercial terms. A public sample payment plan does not enroll you or replace your signed agreement.',
      ] },
      { heading: 'Business rules to approve', paragraphs: [
        'Fresh Phones PH must approve the final rules for account eligibility, support and correction requests, suspension, changes to these terms, notices, contact details, dispute handling, and the relationship between these terms and signed client agreements.',
        'These draft terms are not an accepted customer contract. An approved version will require a separate affirmative acceptance before portal use.',
      ] },
    ],
    reviewItems: ['Exact contracting entity and contact', 'Portal eligibility and account recovery', 'Corrections, suspension and dispute process', 'Relationship to signed agreement and version effective date'],
  },
};

export const legalAcknowledgmentSchema = z.object({
  key: legalDocumentKeySchema,
  version: z.string().min(1).max(60),
  action: z.enum(['ACKNOWLEDGED', 'ACCEPTED']),
}).strict();

export function legalAction(key: LegalDocumentKey): 'ACKNOWLEDGED' | 'ACCEPTED' {
  return key === 'PORTAL_TERMS' ? 'ACCEPTED' : 'ACKNOWLEDGED';
}

export function requiredLegalKeys(role: string): readonly LegalDocumentKey[] {
  return role === 'CUSTOMER' ? ['CUSTOMER_PRIVACY', 'PORTAL_TERMS'] : ['EMPLOYEE_PRIVACY'];
}
