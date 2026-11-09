import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SupportContent from "@/components/SupportContent";
import { landingV2Font } from "@/components/font";
import typography from "@/components/typography.module.css";
import styles from "./support.module.css";
import "@/components/landing-v2.css";

export const metadata: Metadata = {
  title: "Help & Support · Fresh Phones PH",
  description:
    "Start a customer support request, follow an existing concern, or contact Fresh Phones PH for help with an offer or portal access.",
};

export default function PublicSupportPage() {
  return (
    <div
      data-landing-version="2"
      className={`${styles.shell} ${landingV2Font.variable} ${typography.root}`}
    >
      <Navbar />
      <SupportContent />
      <Footer />
    </div>
  );
}
