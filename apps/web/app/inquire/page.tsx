import type { Metadata } from "next";
import InquiryPage from "@/components/InquiryPage";
export const metadata: Metadata = {
  title: "Ask about a device · Fresh Phones PH",
  description:
    "Talk to the Fresh Phones PH team about a device and payment options.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ device?: string | string[] }>;
}) {
  const { device } = await searchParams;

  const name =
    typeof device === "string" && device.trim().length <= 160
      ? device.trim()
      : undefined;

  return <InquiryPage deviceName={name} />;
}
