import type { Metadata } from "next";
import type { ReactNode } from "react";
import PublicPageShell from "@/components/PublicPageShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
