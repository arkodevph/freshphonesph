import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CareersBoard from "./CareersBoard";

export const metadata: Metadata = {
  title: "Careers · Fresh Phones PH",
  description: "Explore open roles at Fresh Phones PH and apply to join our growing team.",
};

export default function CareersPage() {
  return (
    <>
      <Navbar />
      <main>
        <CareersBoard />
      </main>
      <Footer />
    </>
  );
}
