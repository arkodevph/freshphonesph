import { tsRequest } from './ts-api';

export type CustomerWorkKind = 'support' | 'documents' | 'payments';
export type CustomerWorkItem = {
  id: string;
  clientName: string;
  label: string;
  status: string;
  waitingSince: string;
  href: string;
  customerReplied?: boolean;
};
export type CustomerWorkPage = {
  kind: CustomerWorkKind;
  count: number;
  page: number;
  next: number | null;
  results: CustomerWorkItem[];
};

export function getCustomerWork(kind: CustomerWorkKind, page = 1) {
  return tsRequest<CustomerWorkPage>(`/operations/customer-work?kind=${kind}&page=${page}`);
}
