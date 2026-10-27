import type {
  DeviceInquiry,
  InquiryInput,
  InquiryQuery,
  InquiryStatus,
  Page,
} from "@freshphones/contracts";
import { API_URL } from "./backend";
import { tsRequest } from "./ts-api";

export async function submitInquiry(
  input: InquiryInput,
): Promise<{ reference: string }> {
  const response = await fetch(`${API_URL}/api/inquiries`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => {
    return {};
  });

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Too many inquiries. Please wait before trying again."
        : response.status === 400
          ? "Please check your name, phone number and email, then try again."
          : "We couldn't send your inquiry. Your details are still here—please try again shortly.",
    );
  }

  if (typeof data.reference !== "string") {
    throw new Error("We couldn't confirm your inquiry. Please try again.");
  }

  return data;
}

export function listInquiries(query: InquiryQuery) {
  const params = new URLSearchParams({
    page: String(query.page),
    q: query.q,
    ...(query.status ? { status: query.status } : {}),
  });

  return tsRequest<Page<DeviceInquiry>>(`/inquiries?${params}`);
}

export function updateInquiry(item: DeviceInquiry, status: InquiryStatus) {
  return tsRequest<DeviceInquiry>(`/inquiries/${item.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, version: item.version }),
  });
}
