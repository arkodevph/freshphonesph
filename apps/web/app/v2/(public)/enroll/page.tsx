import type { Metadata } from "next";
import EnrollmentPageContent from "@/components/enrollment-form/EnrollmentPageContent";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Apply to join · Fresh Phones PH",
  description:
    "Send a membership application to the Fresh Phones PH team for review.",
};

export default function EnrollmentPage() {
  return <EnrollmentPageContent siteBasePath="/v2" />;
}
