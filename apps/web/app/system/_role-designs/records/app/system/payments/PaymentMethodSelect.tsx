"use client";

import { useId } from "react";
import { Bank, DotsThree, Money } from "@phosphor-icons/react";
import { receiptTypes } from "@freshphones/contracts";
import Select from "@/app/system/_role-designs/records/components/Select";
import styles from "@/app/system/_role-designs/records/app/system/payments/payment-method-select.module.css";

const names: Record<string, string> = {
  gcash: "GCash",
  maya: "Maya",
  bank: "Bank transfer",
  cash: "Cash",
  other: "Other",
};

function MethodMark({ method }: { method: string }) {
  return (
    <span className={styles.mark} data-method={method} aria-hidden="true">
      {method === "gcash" || method === "maya" ? (
        <img src={`/brand/payment-methods/${method}.svg`} alt="" />
      ) : method === "bank" ? (
        <Bank />
      ) : method === "cash" ? (
        <Money />
      ) : (
        <DotsThree weight="bold" />
      )}
    </span>
  );
}

export default function PaymentMethodSelect({
  value,
  onValueChange,
  receipt = false,
}: {
  value: string;
  onValueChange: (method: string) => void;
  receipt?: boolean;
}) {
  const id = useId();

  const methods: string[] = receipt
    ? [...receiptTypes]
    : [...receiptTypes, "other"];

  // Existing records may contain a method outside the usual options; keep it visible.
  if (value && !methods.includes(value)) {
    methods.push(value);
  }

  const options = methods.map((method) => {
    return {
      value: method,
      label:
        receipt && method === "cash"
          ? "Cash receipt"
          : (names[method] ?? method),
    };
  });

  return (
    <div
      className={styles.picker}
      data-payment-method-select={receipt ? "receipt" : "payment"}
    >
      <span
        id={`${id}-label`}
        className={receipt ? styles.srOnly : styles.label}
      >
        {receipt ? "Receipt type" : "Method"}
      </span>
      <Select
        id={id}
        labelId={`${id}-label`}
        value={value}
        options={options}
        onValueChange={onValueChange}
        fitViewport
        renderLabel={(option) => {
          return (
            <span className={styles.choice}>
              <MethodMark method={option.value.toLowerCase()} />
              <span>{option.label}</span>
            </span>
          );
        }}
      />
    </div>
  );
}
