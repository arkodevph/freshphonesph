import { formatPeso } from "@/lib/currency";
import { monthlyAmountScale } from "@/lib/monthly-amount-chart";
import { CeoPlaceholder } from "./CeoLoading";
import styles from "./monthly-amount-chart.module.css";

type Amount = { label: string; value: string | undefined; tone: string };

const compact = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function MonthlyAmountChart({
  amounts,
  loading,
}: {
  amounts: readonly Amount[];
  loading: boolean;
}) {
  const scale = monthlyAmountScale(
    amounts.map(({ value }) => {
      return Number(value ?? 0);
    }),
  );

  return (
    <div className={styles.chart}>
      <dl className={styles.rows}>
        {amounts.map(({ label, value, tone }) => {
          const amount = Number(value ?? 0);

          const bar = scale.bar(amount);

          return (
            <div key={label} className={styles.row}>
              <dt>
                <i data-tone={tone} aria-hidden="true" />
                {label}
              </dt>
              <dd>
                {loading ? (
                  <CeoPlaceholder width="8ch" />
                ) : (
                  formatPeso(value ?? "0")
                )}
              </dd>
              <div
                className={styles.track}
                aria-hidden="true"
                data-loading={loading || undefined}
              >
                <i className={styles.zero} style={{ left: `${scale.zero}%` }} />
                <span
                  className={styles.bar}
                  data-tone={tone}
                  data-negative={amount < 0 || undefined}
                  style={{
                    left: `${bar.left}%`,
                    width: `${loading ? 0 : bar.width}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </dl>
      <div className={styles.axis} aria-hidden="true">
        {loading ? (
          <CeoPlaceholder width="14ch" />
        ) : (
          scale.ticks.map((tick, index) => {
            return (
              <span
                key={index}
                style={{
                  left: `${scale.max === scale.min ? 0 : ((tick - scale.min) / (scale.max - scale.min)) * 100}%`,
                }}
              >
                {compact.format(tick)}
              </span>
            );
          })
        )}
      </div>
      <p className={styles.caption}>PHP · amounts share the same scale</p>
    </div>
  );
}
