import type { Metadata } from "next";
import CareersBoard from "@/app/careers/CareersBoard";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Careers · Fresh Phones PH",
  description:
    "Explore open roles at Fresh Phones PH and apply to join our growing team.",
};

export default function CareersPage() {
  return (
    <>
      <main>
        <CareersBoard siteBasePath="/v2" />
      </main>
    </>
  );
}
