import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicEnrollmentForm from "@/components/enrollment-form/PublicEnrollmentForm";
import styles from "@/components/enrollment-form/public-enrollment.module.css";

export const metadata: Metadata = {
  title: "Apply to join · Fresh Phones PH",
  description:
    "Send a membership application to the Fresh Phones PH team for review.",
};

export default function EnrollmentPage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={styles.shell}>
          <aside
            className={styles.intro}
            aria-label="How membership applications work"
          >
            <p className={styles.eyebrow}>Apply to join</p>
            <h2>Your next device starts with a conversation.</h2>
            <p>
              Tell us how to reach you. Our team will help you explore a
              suitable device and batch.
            </p>
            <ol>
              <li>Send your application.</li>
              <li>
                An Agent reviews your details and discusses available batches.
              </li>
              <li>
                A Batch Manager reviews enrollment before your membership
                begins.
              </li>
            </ol>
            <Link href="/inquire">
              Have a question first? Contact our team.
            </Link>
          </aside>
          <PublicEnrollmentForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
