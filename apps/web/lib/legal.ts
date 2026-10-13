import type { LegalDocument, LegalDocumentKey } from '@freshphones/contracts';
import { tsRequest } from './ts-api';

export type LegalStatus = {
  pending: LegalDocument[];
  history: { key: LegalDocumentKey; version: string; title: string; action: 'ACKNOWLEDGED' | 'ACCEPTED'; acknowledgedAt: string }[];
};

export const getLegalStatus = () => tsRequest<LegalStatus>('/legal/status');
export const acknowledgeLegalDocument = (document: LegalDocument) => tsRequest('/legal/acknowledgments', {
  method: 'POST',
  body: JSON.stringify({ key: document.key, version: document.version,
    action: document.key === 'PORTAL_TERMS' ? 'ACCEPTED' : 'ACKNOWLEDGED' }),
});
