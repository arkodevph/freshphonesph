"use client";

import { reportingDate } from "@/lib/executive-overview";
import CeoAssistant from "../CeoAssistant";
import { useExecutiveCharts } from "../useExecutiveCharts";

export default function AssistantPage() {
  const { data, pending, error, refresh } = useExecutiveCharts();

  const period = data
    ? `${reportingDate(data.dateFrom)} – ${reportingDate(data.dateTo)}`
    : "Last 6 months";

  return (
    <CeoAssistant
      period={period}
      reportRange={
        data ? { dateFrom: data.dateFrom, dateTo: data.dateTo } : undefined
      }
      dataAvailable={Boolean(data)}
      pending={pending}
      error={error}
      retry={() => {
        void refresh();
      }}
    />
  );
}
