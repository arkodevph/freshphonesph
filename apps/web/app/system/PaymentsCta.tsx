"use client";

import Link from "next/link";
import { Receipt, ArrowRight } from "@phosphor-icons/react";
import { useMe, can } from "@/lib/useMe";

export default function PaymentsCta() {
  const me = useMe();
  if (!can(me, "PAYMENT_RECORD", "PAYMENT_VERIFY")) return null;
  return (
    <Link
      href="/system/payments"
      className="btn-candy mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-700"
    >
      <Receipt weight="fill" className="h-5 w-5" />
      Open Payments &amp; Finance
      <ArrowRight weight="bold" className="h-4 w-4" />
    </Link>
  );
}
