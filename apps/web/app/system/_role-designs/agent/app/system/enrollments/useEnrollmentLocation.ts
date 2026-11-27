"use client";

import { useSearchParams } from "next/navigation";
import {
  enrollmentHref,
  enrollmentLocation,
  type EnrollmentLocation,
} from "./enrollment-location";

export function useEnrollmentLocation() {
  const params = useSearchParams();

  const parsed = enrollmentLocation(params);

  const location: EnrollmentLocation = parsed ?? {
    view: "requests",
    page: 1,
    q: "",
    status: "",
  };

  function navigate(next: Partial<EnrollmentLocation>, replace = false) {
    const method = replace ? "replaceState" : "pushState";

    window.history[method](null, "", enrollmentHref(location, next));
  }

  return { location, invalid: !parsed, navigate };
}
