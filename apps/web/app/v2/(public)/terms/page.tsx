import type { Metadata } from "next";
import { legalDocuments } from "@freshphones/contracts";
import { LegalDocumentPage } from "@/components/LegalDocumentPage";
export const metadata: Metadata = {
  title: "Portal Terms of Use · Fresh Phones PH",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <LegalDocumentPage
      document={legalDocuments.PORTAL_TERMS}
      siteBasePath="/v2"
    />
  );
}
