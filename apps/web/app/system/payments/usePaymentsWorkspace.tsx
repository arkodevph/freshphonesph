"use client";

import {
  createPayment,
  decidePayment,
  findDuplicatePayments,
  getBalance,
  getProofUrl,
  listPayments,
  scanPaymentReceipt,
  updatePayment,
  uploadProof,
  type Balance,
  type Payment,
} from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { can, useMe } from "@/lib/useMe";
import type {
  PaymentDuplicateMatch,
  ReceiptScan,
  ReceiptType,
} from "@freshphones/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { today } from "@/lib/date";
import { ClientChoice, duplicateKey, ReviewDecision } from "./payment-view";

export function usePaymentsWorkspace() {
  const me = useMe();

  const canRecord = can(me, "PAYMENT_RECORD");

  const canVerify = can(me, "PAYMENT_VERIFY");

  const canRead = can(me, "PAYMENT_READ");

  const [payments, setPayments] = useState<Payment[]>([]);

  const [filter, setFilter] = useState("");

  const [focusedPayment, setFocusedPayment] = useState<string | null>(null);

  const [paymentQuery, setPaymentQuery] = useState("");

  const [appliedPaymentQuery, setAppliedPaymentQuery] = useState("");

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [paymentPage, setPaymentPage] = useState(1);

  const [paymentCount, setPaymentCount] = useState(0);

  const [paymentPageSize, setPaymentPageSize] = useState(20);

  const [paymentHasNext, setPaymentHasNext] = useState(false);

  const paymentLoadVersion = useRef(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    client: "",
    amount: "",
    payment_date: today(),
    method: "gcash",
    reference_no: "",
    receipt_time: "",
    receipt_name: "",
    receipt_phone: "",
  });

  const [saving, setSaving] = useState(false);

  const [proof, setProof] = useState<File | null>(null);

  const [editing, setEditing] = useState<Payment | null>(null);

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const [reviewPayment, setReviewPayment] = useState<Payment | null>(null);

  const [reviewDecision, setReviewDecision] = useState<ReviewDecision | null>(
    null,
  );

  const [reviewError, setReviewError] = useState<string | null>(null);

  const [reviewSaving, setReviewSaving] = useState(false);

  const [detailsPayment, setDetailsPayment] = useState<Payment | null>(null);

  const [adjustmentPayment, setAdjustmentPayment] = useState<Payment | null>(
    null,
  );

  const [receiptType, setReceiptType] = useState<ReceiptType>("gcash");

  const [receiptImage, setReceiptImage] = useState<File | null>(null);

  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [receiptDragging, setReceiptDragging] = useState(false);

  const [scanResult, setScanResult] = useState<ReceiptScan | null>(null);

  const [scanning, setScanning] = useState(false);

  const [duplicateMatches, setDuplicateMatches] = useState<
    PaymentDuplicateMatch[]
  >([]);

  const [duplicateChecking, setDuplicateChecking] = useState(false);

  const [duplicateCheckError, setDuplicateCheckError] = useState(false);

  const [reviewedDuplicates, setReviewedDuplicates] = useState<string | null>(
    null,
  );

  const scanVersion = useRef(0);

  const receiptInput = useRef<HTMLInputElement>(null);

  const receiptDialog = useRef<HTMLDialogElement>(null);

  const financeDialog = useRef<HTMLDialogElement>(null);

  const detailsDialog = useRef<HTMLDialogElement>(null);

  const financeNoteInput = useRef<HTMLTextAreaElement>(null);

  const [recordClient, setRecordClient] = useState<ClientChoice | null>(null);

  const [balanceClient, setBalanceClient] = useState("");

  const [balanceClientChoice, setBalanceClientChoice] =
    useState<ClientChoice | null>(null);

  const [balance, setBalance] = useState<Balance | null>(null);

  const load = useCallback(
    async (preserveError = false) => {
      if (!canRead) {
        return;
      }
      const requestVersion = ++paymentLoadVersion.current;

      setLoading(true);

      if (!preserveError) {
        setError(null);
      }
      try {
        const data = await listPayments({
          ...(focusedPayment ? { id: focusedPayment } : {}),
          ...(filter ? { status: filter } : {}),
          ...(appliedPaymentQuery ? { q: appliedPaymentQuery } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
          page: String(paymentPage),
        });

        if (requestVersion !== paymentLoadVersion.current) {
          return;
        }
        setPayments(data.results);

        setPaymentCount(data.count);

        setPaymentPageSize(data.page_size ?? 20);

        setPaymentHasNext(Boolean(data.next));
      } catch (e) {
        if (requestVersion !== paymentLoadVersion.current) {
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load payments.");
      } finally {
        if (requestVersion === paymentLoadVersion.current) {
          setLoading(false);
        }
      }
    },
    [
      canRead,
      appliedPaymentQuery,
      dateFrom,
      dateTo,
      filter,
      focusedPayment,
      paymentPage,
    ],
  );

  useEffect(() => {
    load();
  }, [load]);

  useLiveRecords(() => {
    void load();
  }, canRead);

  useEffect(() => {
    if (!canVerify) {
      setAdjustmentPayment(null);
    }
  }, [canVerify]);

  const openLocation = useCallback((payment: string | null, status: string) => {
    setFocusedPayment(payment);

    // Clearing a URL from the search/filter controls keeps their local choices.
    // An alert target starts a clean search so old filters cannot hide the payment.
    if (payment || status) {
      paymentLoadVersion.current++;

      setFilter(payment ? "" : status);

      setPaymentQuery("");

      setAppliedPaymentQuery("");

      setDateFrom("");

      setDateTo("");

      setPaymentPage(1);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) {
        clearTimeout(noticeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!receiptImage) {
      setReceiptPreview(null);

      return;
    }
    const url = URL.createObjectURL(receiptImage);

    setReceiptPreview(url);

    return () => {
      return URL.revokeObjectURL(url);
    };
  }, [receiptImage]);

  useEffect(() => {
    if (!reviewPayment || !financeDialog.current) {
      return;
    }
    if (!financeDialog.current.open) {
      financeDialog.current.showModal();
    }
    financeNoteInput.current?.focus();
  }, [reviewPayment]);

  useEffect(() => {
    if (
      detailsPayment &&
      detailsDialog.current &&
      !detailsDialog.current.open
    ) {
      detailsDialog.current.showModal();
    }
  }, [detailsPayment]);

  useEffect(() => {
    const reference = form.reference_no.trim();

    setReviewedDuplicates(null);

    setDuplicateMatches([]);

    setDuplicateCheckError(false);

    if (reference.replace(/[^a-z0-9]/gi, "").length < 3) {
      setDuplicateChecking(false);

      return;
    }
    let current = true;

    setDuplicateChecking(true);

    const timer = setTimeout(() => {
      findDuplicatePayments(form.method, reference, editing?.id)
        .then((matches) => {
          if (current) {
            setDuplicateMatches(matches);
          }
        })
        .catch(() => {
          if (current) {
            setDuplicateCheckError(true);
          }
        })
        .finally(() => {
          if (current) {
            setDuplicateChecking(false);
          }
        });
    }, 350);

    return () => {
      current = false;

      clearTimeout(timer);
    };
  }, [form.method, form.reference_no, editing?.id]);

  const duplicateReviewKey = duplicateKey(
    form.method,
    form.reference_no,
    form.client,
    duplicateMatches,
  );

  function flash(msg: string) {
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
    }
    setNotice(msg);

    noticeTimer.current = setTimeout(() => {
      return setNotice(null);
    }, 3000);
  }

  function clearExtractedCandidates(nextMethod?: ReceiptType) {
    if (scanResult) {
      setForm((current) => {
        return {
          ...current,
          amount: current.amount === scanResult.amount ? "" : current.amount,
          payment_date:
            current.payment_date === scanResult.paymentDate
              ? ""
              : current.payment_date,
          reference_no:
            current.reference_no === scanResult.referenceNumber
              ? ""
              : current.reference_no,
          receipt_time:
            current.receipt_time === scanResult.receiptTime
              ? ""
              : current.receipt_time,
          receipt_name:
            current.receipt_name === scanResult.receiptName
              ? ""
              : current.receipt_name,
          receipt_phone:
            current.receipt_phone === scanResult.receiptPhone
              ? ""
              : current.receipt_phone,
          ...(nextMethod ? { method: nextMethod } : {}),
        };
      });
    } else if (nextMethod) {
      setForm((current) => {
        return { ...current, method: nextMethod };
      });
    }
  }

  function selectReceipt(file: File | null) {
    if (!file) {
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPG, PNG, or WebP receipt image.");

      if (receiptInput.current) {
        receiptInput.current.value = "";
      }
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt image must be 5 MB or smaller.");

      if (receiptInput.current) {
        receiptInput.current.value = "";
      }
      return;
    }
    scanVersion.current += 1;

    setScanning(false);

    setError(null);

    clearExtractedCandidates();

    receiptDialog.current?.close();

    setReceiptImage(file);

    setScanResult(null);
  }

  async function onRecord(e: React.FormEvent) {
    e.preventDefault();

    if (!form.client) {
      setError("Search for and select a client before recording the payment.");

      return;
    }
    setSaving(true);

    setError(null);

    try {
      if (form.reference_no.trim()) {
        const matches = await findDuplicatePayments(
          form.method,
          form.reference_no.trim(),
          editing?.id,
        );

        setDuplicateMatches(matches);

        setDuplicateCheckError(false);

        if (
          matches.length &&
          reviewedDuplicates !==
            duplicateKey(form.method, form.reference_no, form.client, matches)
        ) {
          setError(
            "This reference matches an existing payment. Review the match below before recording.",
          );

          return;
        }
      }
      const record = {
        client: form.client,
        batch: recordClient?.batch,
        amount: form.amount,
        payment_date: form.payment_date,
        method: form.method,
        reference_no: form.reference_no,
        ...{
          receipt_time: form.receipt_time,
          receipt_name: form.receipt_name,
          receipt_phone: form.receipt_phone,
        },
      };

      const created = editing
        ? await updatePayment(editing.id, editing.version ?? 1, record)
        : await createPayment(record);

      const proofToUpload = receiptImage;

      let proofAttached = false;

      if (proofToUpload) {
        try {
          await uploadProof(created.id, proofToUpload);

          proofAttached = true;
        } catch (uploadError) {
          setError(
            `Payment was recorded, but its proof was not attached: ${uploadError instanceof Error ? uploadError.message : "upload failed"}`,
          );
        }
      }
      if (!proofToUpload || proofAttached) {
        flash(
          editing
            ? "Payment corrected and returned to pending review."
            : proofAttached
              ? "Payment recorded with private proof (pending verification)."
              : "Payment recorded (pending verification).",
        );
      }
      setForm((f) => {
        return {
          ...f,
          amount: "",
          reference_no: "",
          receipt_time: "",
          receipt_name: "",
          receipt_phone: "",
        };
      });

      setEditing(null);

      setProof(null);

      receiptDialog.current?.close();

      setReceiptImage(null);

      if (receiptInput.current) {
        receiptInput.current.value = "";
      }
      setScanResult(null);

      setDuplicateMatches([]);

      setReviewedDuplicates(null);

      load(Boolean(proofToUpload && !proofAttached));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  function edit(payment: Payment) {
    setEditing(payment);

    setRecordClient({
      id: payment.client,
      batch: payment.batch,
      batch_number: "",
      full_name: payment.client_name ?? "Selected client",
      unit_model: "",
    });

    setForm({
      client: String(payment.client),
      amount: payment.amount,
      payment_date: payment.payment_date,
      method: payment.method,
      reference_no: payment.reference_no,
      receipt_time: payment.receipt_time ?? "",
      receipt_name: payment.receipt_name ?? "",
      receipt_phone: payment.receipt_phone ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function scanReceipt() {
    if (!receiptImage) {
      setError("Choose a receipt image first.");

      return;
    }
    const requestVersion = ++scanVersion.current;

    const image = receiptImage;

    const template = receiptType;

    setScanning(true);

    setError(null);

    setScanResult(null);

    try {
      const result = await scanPaymentReceipt(image, template);

      if (requestVersion !== scanVersion.current) {
        return;
      }
      setScanResult(result);

      setForm((current) => {
        return {
          ...current,
          amount: result.amount ?? current.amount,
          payment_date: result.paymentDate ?? "",
          method: result.template,
          reference_no: result.referenceNumber ?? current.reference_no,
          receipt_time: result.receiptTime ?? "",
          receipt_name: result.receiptName ?? "",
          receipt_phone: result.receiptPhone ?? "",
        };
      });
    } catch (e) {
      if (requestVersion !== scanVersion.current) {
        return;
      }
      setError(
        e instanceof Error ? e.message : "Receipt could not be scanned.",
      );
    } finally {
      if (requestVersion === scanVersion.current) {
        setScanning(false);
      }
    }
  }

  async function viewProof(id: string | number) {
    setError(null);

    try {
      const { url } = await getProofUrl(id);

      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open proof.");
    }
  }

  function openFinanceReview(
    payment: Payment,
    decision: ReviewDecision | null = null,
  ) {
    setError(null);

    setReviewError(null);

    setReviewDecision(decision);

    setReviewPayment(payment);
  }

  async function decide() {
    if (!reviewPayment || !reviewDecision || reviewSaving) {
      return;
    }
    const paymentId = String(reviewPayment.id);

    const reviewNote = reviewNotes[paymentId]?.trim() ?? "";

    if (reviewNote.length < 2) {
      setReviewError("Add a Finance review note before deciding.");

      financeNoteInput.current?.focus();

      return;
    }
    setReviewError(null);

    setReviewSaving(true);

    try {
      await decidePayment(
        reviewPayment.id,
        reviewDecision,
        reviewPayment.version,
        reviewNote,
      );

      flash(`Payment ${reviewDecision.replace("_", " ")}.`);

      setReviewNotes((current) => {
        const next = { ...current };

        delete next[paymentId];

        return next;
      });

      financeDialog.current?.close();

      load();
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setReviewSaving(false);
    }
  }

  async function lookupBalance() {
    if (!balanceClient) {
      setError("Search for and select a client first.");

      return;
    }
    setError(null);

    setBalance(null);

    try {
      setBalance(await getBalance(balanceClient));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Balance lookup failed.");
    }
  }

  function resetPaymentPage() {
    paymentLoadVersion.current += 1;

    setPaymentPage(1);
  }

  function changePaymentPage(next: number) {
    paymentLoadVersion.current += 1;

    setPaymentPage(next);
  }

  const paymentExportFilters = {
    ...(filter ? { status: filter } : {}),
    ...(appliedPaymentQuery ? { q: appliedPaymentQuery } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  return {
    recordPaymentFormProps: {
      onRecord,
      editing,
      scanning,
      receiptType,
      scanVersion,
      setScanning,
      clearExtractedCandidates,
      setScanResult,
      setReceiptType,
      setReceiptDragging,
      selectReceipt,
      receiptDragging,
      receiptInput,
      receiptPreview,
      receiptDialog,
      receiptImage,
      scanReceipt,
      scanResult,
      recordClient,
      setRecordClient,
      setForm,
      form,
      duplicateChecking,
      duplicateCheckError,
      duplicateMatches,
      reviewedDuplicates,
      duplicateReviewKey,
      setReviewedDuplicates,
      saving,
      setEditing,
    },
    receiptViewerDialogProps: {
      receiptDialog,
      receiptImage,
      receiptPreview,
      recordClient,
      form,
    },
    financeReviewDialogProps: {
      financeDialog,
      setReviewPayment,
      setReviewDecision,
      setReviewError,
      reviewSaving,
      reviewPayment,
      decide,
      financeNoteInput,
      reviewNotes,
      setReviewNotes,
      reviewDecision,
      reviewError,
    },
    paymentDetailsDialogProps: {
      detailsDialog,
      setDetailsPayment,
      detailsPayment,
      viewProof,
    },
    paymentListPanelProps: {
      focusedPayment,
      setFocusedPayment,
      setFilter,
      resetPaymentPage,
      paymentQuery,
      appliedPaymentQuery,
      paymentPage,
      load,
      setAppliedPaymentQuery,
      setPaymentQuery,
      dateFrom,
      dateTo,
      setDateFrom,
      setDateTo,
      filter,
      me,
      paymentExportFilters,
      setError,
      loading,
      paymentCount,
      payments,
      setDetailsPayment,
      canVerify,
      setAdjustmentPayment,
      viewProof,
      openFinanceReview,
      canRecord,
      edit,
      changePaymentPage,
      paymentPageSize,
      paymentHasNext,
    },
    me,
    canRead,
    openLocation,
    canRecord,
    canVerify,
    adjustmentPayment,
    setAdjustmentPayment,
    load,
    setDetailsPayment,
    setBalance,
    setPayments,
    flash,
    error,
    notice,
    setError,
    setNotice,
    balanceClientChoice,
    setBalanceClientChoice,
    setBalanceClient,
    lookupBalance,
    balanceClient,
    balance,
  };
}
