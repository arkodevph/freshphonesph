import { LegalGate } from '@/components/LegalGate';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <LegalGate>{children}</LegalGate>;
}
