"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCollectionReport, getPaymentReport } from "@/lib/api";
import { defaultReportFilters } from "@/lib/report-filters";
import AnalyticsDashboardLayout, {
  type AnalyticsData,
} from "./AnalyticsDashboardLayout";

export default function StaffDashboard() {
  const [data, setData] = useState<AnalyticsData>();

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;

    const { dateFrom, dateTo } = defaultReportFilters();

    setLoading(true);

    setError(null);

    try {
      const [collections, payments] = await Promise.all([
        getCollectionReport({ dateFrom, dateTo }),
        getPaymentReport({ dateFrom, dateTo }),
      ]);

      if (request === sequence.current) {
        setData({ collections, payments });
      }
    } catch (reason) {
      if (request === sequence.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load the business overview.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();

    return () => {
      sequence.current++;
    };
  }, [load]);

  return (
    <AnalyticsDashboardLayout
      data={data}
      pending={loading && !data}
      refreshing={loading && Boolean(data)}
      error={error}
      onRefresh={() => {
        void load();
      }}
    />
  );
}
