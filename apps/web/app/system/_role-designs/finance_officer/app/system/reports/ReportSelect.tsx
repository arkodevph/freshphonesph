"use client";

import { useId } from "react";
import Select from "@/app/system/_role-designs/finance_officer/components/Select";
import styles from "@/app/system/_role-designs/finance_officer/app/system/reports/reports.module.css";

export default function ReportSelect({
  label,
  value,
  options,
  onValueChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div className={styles.field}>
      <span id={`${id}-label`}>{label}</span>
      <Select
        animate
        id={id}
        labelId={`${id}-label`}
        value={value}
        options={options}
        onValueChange={onValueChange}
        disabled={disabled}
        fitViewport
      />
    </div>
  );
}
