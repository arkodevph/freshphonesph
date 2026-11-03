import { BadRequestException } from "@nestjs/common";
import { previewInstallments, type Cadence } from "@freshphones/contracts";

export function amountInCents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");

  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function centsAsAmount(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

export function generateSchedule(plan: {
  contractPrice: string;
  installmentCount: number;
  cadence: Cadence;
  startDate: Date;
  firstDueDate?: Date | null;
  monthEnd?: boolean;
}) {
  try {
    return previewInstallments({
      ...plan,
      startDate: plan.startDate.toISOString().slice(0, 10),
      firstDueDate: plan.firstDueDate?.toISOString().slice(0, 10),
    }).map((item) => {
      return { ...item, dueDate: new Date(item.dueDate) };
    });
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : "Choose valid installment dates.",
    );
  }
}
