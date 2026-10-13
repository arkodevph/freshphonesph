"use client";

import Link from "next/link";
import { ArrowRight, Receipt } from "@phosphor-icons/react";
import { can, useMe } from "@/lib/useMe";

export default function PaymentsCta() {
  const me = useMe();

  if (!can(me, "PAYMENT_READ", "PAYMENT_RECORD", "PAYMENT_VERIFY")) {
    return null;
  }
  return (
    <Link href="/system/payments" className="system-primary-action">
      <Receipt weight="fill" className="h-5 w-5" />
      Open Payments &amp; Finance
      <ArrowRight weight="bold" className="h-4 w-4" />
    </Link>
  );
}
