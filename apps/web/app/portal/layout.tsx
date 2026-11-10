import "@/components/solar-icon-motion.css";
import PortalWorkspace from "./PortalWorkspace";
import { LegalGate } from "@/components/LegalGate";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LegalGate>
      <PortalWorkspace>{children}</PortalWorkspace>
    </LegalGate>
  );
}
