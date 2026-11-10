import type { Metadata } from "next";
import SupportContent from "@/components/SupportContent";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Help & Support · Fresh Phones PH",
  description:
    "Start a customer support request, follow an existing concern, or contact Fresh Phones PH for help with an offer or portal access.",
};

export default function PublicSupportPage() {
  return <SupportContent faqHref="/v2#faq" />;
}
