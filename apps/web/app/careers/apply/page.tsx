import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ApplyForm from "../ApplyForm";

export const metadata: Metadata = {
  title: "Apply · Fresh Phones PH Careers",
  description: "Apply for an open role at Fresh Phones PH.",
};

export default function CareersApplyPage() {
  return (
    <>
      <Navbar />
      <main>
        <ApplyForm />
      </main>
      <Footer />
    </>
  );
}
