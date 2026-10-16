"use client";

import { catalogPrice } from "@/lib/catalog";
import { catalogPlanLabels, type CatalogInput } from "@freshphones/contracts";
import type { Dispatch, SetStateAction } from "react";
import styles from "./catalog.module.css";

type Props = {
  draft: {
    code: string;
    name: string;
    condition: "PRE_OWNED" | "BRAND_NEW";
    dailyAmount: string | null;
    availability:
      "CONTACT_US" | "AVAILABLE" | "LIMITED" | "SOLD_OUT" | "COMING_SOON";
    description: string;
    published: boolean;
    sortOrder: number;
    imageAsset:
      | "iphone-11"
      | "iphone-12"
      | "iphone-13"
      | "ipad-10th-gen"
      | "ipad-a16"
      | "iphone-13-pro"
      | null;
    installmentPlan: {
      totalAmount: string;
      installmentCount: number;
      cadence: "WEEKLY" | "SEMIMONTHLY" | "MONTHLY";
    } | null;
  };
  setDraft: Dispatch<
    SetStateAction<{
      code: string;
      name: string;
      condition: "PRE_OWNED" | "BRAND_NEW";
      dailyAmount: string | null;
      availability:
        "CONTACT_US" | "AVAILABLE" | "LIMITED" | "SOLD_OUT" | "COMING_SOON";
      description: string;
      published: boolean;
      sortOrder: number;
      imageAsset:
        | "iphone-11"
        | "iphone-12"
        | "iphone-13"
        | "ipad-10th-gen"
        | "ipad-a16"
        | "iphone-13-pro"
        | null;
      installmentPlan: {
        totalAmount: string;
        installmentCount: number;
        cadence: "WEEKLY" | "SEMIMONTHLY" | "MONTHLY";
      } | null;
    }>
  >;
  planPreview: {
    totalAmount: string;
    regularAmount: string;
    finalAmount: string;
    durationDays: number;
    installments: { sequenceNo: number; dayOffset: number; amount: string }[];
  } | null;
};

export default function CatalogPaymentTermsForm({
  draft,
  setDraft,
  planPreview,
}: Props) {
  return (
    <section
      className={`${styles.planSection} ${styles.wide}`}
      aria-label="Sample payment terms"
    >
      <h3>Sample payment breakdown</h3>
      <p>
        Enter the full terms for this offer. Customers can preview payments and
        example dates before joining.
      </p>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={draft.installmentPlan !== null}
          onChange={(event) => {
            return setDraft({
              ...draft,
              installmentPlan: event.target.checked
                ? {
                    totalAmount: "",
                    installmentCount: NaN,
                    cadence: "WEEKLY",
                  }
                : null,
            });
          }}
        />
        Show a sample payment plan
      </label>
      {draft.installmentPlan ? (
        <>
          <div className={styles.planFields}>
            <label>
              Total payable for this offer (PHP)
              <input
                required
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                inputMode="decimal"
                value={draft.installmentPlan.totalAmount}
                onChange={(event) => {
                  return setDraft({
                    ...draft,
                    installmentPlan: {
                      ...draft.installmentPlan!,
                      totalAmount: event.target.value,
                    },
                  });
                }}
              />
              <small>
                Enter the complete payable total. The daily advertisement does
                not calculate this amount.
              </small>
            </label>
            <label>
              Number of installments
              <input
                required
                type="number"
                min="1"
                max="600"
                step="1"
                value={
                  Number.isFinite(draft.installmentPlan.installmentCount)
                    ? draft.installmentPlan.installmentCount
                    : ""
                }
                onChange={(event) => {
                  return setDraft({
                    ...draft,
                    installmentPlan: {
                      ...draft.installmentPlan!,
                      installmentCount:
                        event.target.value === ""
                          ? NaN
                          : Number(event.target.value),
                    },
                  });
                }}
              />
            </label>
            <label>
              Payment interval
              <select
                value={draft.installmentPlan.cadence}
                onChange={(event) => {
                  return setDraft({
                    ...draft,
                    installmentPlan: {
                      ...draft.installmentPlan!,
                      cadence: event.target.value as NonNullable<
                        CatalogInput["installmentPlan"]
                      >["cadence"],
                    },
                  });
                }}
              >
                {Object.entries(catalogPlanLabels).map(([value, label]) => {
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <small>
                Fixed day intervals, matching the current records system.
              </small>
            </label>
          </div>
          {planPreview && (
            <p className={styles.planPreview} role="status">
              {draft.installmentPlan.installmentCount === 1
                ? `1 payment of ${catalogPrice(planPreview.totalAmount)}`
                : `${draft.installmentPlan.installmentCount - 1} payment${draft.installmentPlan.installmentCount === 2 ? "" : "s"} of ${catalogPrice(planPreview.regularAmount)}, then ${catalogPrice(planPreview.finalAmount)}`}
              . Total {catalogPrice(planPreview.totalAmount)} over{" "}
              {planPreview.durationDays} days. The first payment falls one
              interval after the example start.
            </p>
          )}
          <p>
            Use a separate listing for a different offer. Saving these terms
            does not issue a customer schedule or change an existing agreement.
          </p>
        </>
      ) : (
        <p>
          Customers will be invited to contact the team for a breakdown. No term
          is inferred from the daily rate.
        </p>
      )}
    </section>
  );
}
