import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CareersBoard from "./CareersBoard";
import { landingV2Font } from "@/components/font";
import typography from "@/components/typography.module.css";
import styles from "./CareersBoard.module.css";
import "@/components/landing-v2.css";

export const metadata: Metadata = {
  title: "Careers · Fresh Phones PH",
  description:
    "Explore open roles at Fresh Phones PH and apply to join our growing team.",
};

export default function CareersPage() {
  return (
    <div
      data-landing-version="2"
      className={`${styles.shell} ${landingV2Font.variable} ${typography.root}`}
    >
      <Navbar />
      <main>
        <CareersBoard />
      </main>
      <Footer />
    </div>
  );
}
