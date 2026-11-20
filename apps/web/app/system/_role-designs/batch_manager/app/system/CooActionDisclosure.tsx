import type { ReactNode } from "react";
import AnimatedDisclosure from "@/app/system/_role-designs/batch_manager/components/AnimatedDisclosure";

/** Keeps occasional creation work available without displacing the COO's directory. */
export default function CooActionDisclosure({
  role,
  title,
  children,
}: {
  role: string | null | undefined;
  title: string;
  children: ReactNode;
}) {
  if (role !== "batch_manager") {
    return <>{children}</>;
  }

  return (
    <AnimatedDisclosure className="coo-action-disclosure" title={title}>
      <div className="coo-action-body">{children}</div>
    </AnimatedDisclosure>
  );
}
