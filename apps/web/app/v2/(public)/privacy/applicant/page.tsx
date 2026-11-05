import type { Metadata } from "next";
import { legalDocuments } from "@freshphones/contracts";
import { LegalDocumentPage } from "@/components/LegalDocumentPage";
export const metadata: Metadata = {
  title: "Applicant Privacy Notice · Fresh Phones PH",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <LegalDocumentPage
      document={legalDocuments.APPLICANT_PRIVACY}
      siteBasePath="/v2"
    />
  );
}
