import type { Metadata } from "next";
import ApplyForm from "@/app/careers/ApplyForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Apply · Fresh Phones PH Careers",
  description: "Apply for an open role at Fresh Phones PH.",
};

export default function CareersApplyPage() {
  return (
    <>
      <main>
        <ApplyForm siteBasePath="/v2" />
      </main>
    </>
  );
}
