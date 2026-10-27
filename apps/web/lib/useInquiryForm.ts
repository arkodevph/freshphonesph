"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { inquirySchema } from "@freshphones/contracts";
import { submitInquiry } from "./inquiries";

export function useInquiryForm(deviceName?: string) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const [pending, setPending] = useState(false);

  const [error, setError] = useState("");

  const [reference, setReference] = useState("");

  const requestId = useRef("");

  const sending = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sending.current) {
      return;
    }

    const fields = new FormData(event.currentTarget);

    if (!requestId.current) {
      requestId.current = crypto.randomUUID();
    }

    const result = inquirySchema.safeParse({
      submissionId: requestId.current,
      name: fields.get("name"),
      phone: fields.get("phone"),
      email: fields.get("email"),
      deviceName: deviceName || fields.get("deviceName"),
      message: fields.get("message"),
      contactAcknowledged: fields.get("contactAcknowledged") === "on",
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message || "Please check your details.");

      return;
    }

    sending.current = true;

    setPending(true);

    setError("");

    try {
      setReference((await submitInquiry(result.data)).reference);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Please try again shortly.",
      );
    } finally {
      sending.current = false;

      setPending(false);
    }
  }

  return { ready, pending, error, reference, submit };
}
