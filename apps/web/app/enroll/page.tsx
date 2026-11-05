import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EnrollmentPageContent from "@/components/enrollment-form/EnrollmentPageContent";

export const metadata: Metadata = {
  title: "Apply to join · Fresh Phones PH",
  description:
    "Send a membership application to the Fresh Phones PH team for review.",
};

export default function EnrollmentPage() {
  return (
    <>
      <Navbar />
      <EnrollmentPageContent />
      <Footer />
    </>
  );
}
