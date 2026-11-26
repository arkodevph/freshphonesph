"use client";

import { useHandlerHome } from "@/app/system/handler/useHandlerHome";
import HandlerDashboardLayout from "./HandlerDashboardLayout";

export default function HandlerHome({ name }: { name: string }) {
  const work = useHandlerHome();

  return (
    <HandlerDashboardLayout
      name={name}
      work={work}
      onRefresh={() => {
        void work.load();
      }}
    />
  );
}
