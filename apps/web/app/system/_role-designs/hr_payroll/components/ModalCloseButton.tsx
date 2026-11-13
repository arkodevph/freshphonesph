import type { ComponentProps } from "react";
import { X } from "@phosphor-icons/react/dist/ssr";
import styles from "@/app/system/_role-designs/hr_payroll/components/modal-close-button.module.css";

/** A single close affordance; callers keep their existing draft and busy guards. */
export default function ModalCloseButton({
  className = "",
  ...props
}: Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      {...props}
      type="button"
      data-modal-close
      aria-label="Close dialog"
      title="Close"
      className={`${styles.button} ${className}`}
    >
      <X size={18} weight="regular" aria-hidden="true" />
    </button>
  );
}
