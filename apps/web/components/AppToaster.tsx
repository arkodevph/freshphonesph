"use client";

import { Toaster } from "sonner";
import styles from "./AppToaster.module.css";

export default function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      visibleToasts={3}
      closeButton
      duration={6000}
      offset={24}
      mobileOffset={16}
      toastOptions={{
        classNames: {
          toast: styles.toast,
          title: styles.title,
          description: styles.description,
          closeButton: styles.close,
        },
      }}
    />
  );
}
