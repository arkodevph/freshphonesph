"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  catalogAvailability,
  catalogAvailabilityLabels,
  catalogConditionLabels,
  type PublicCatalogItem,
} from "@freshphones/contracts";
import { getPublicCatalog } from "@/lib/api";
import { catalogPhoto, catalogPrice } from "@/lib/catalog";
import { SAMPLE_CATALOG_MODE, sampleCatalog } from "@/lib/sample-catalog";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import CatalogBreakdown from "./CatalogBreakdown";
import styles from "./Models.module.css";

type Model = {
  name: string;
  condition: "Pre-Owned" | "Brand New";
  daily: string;
  gradient: string;
  image?: string;
  imageAlt?: string;
};

function FlatDevicePreview({
  name,
  gradient,
}: Pick<Model, "name" | "gradient">) {
  const isPad = name.includes("iPad");

  const isPro = name.includes("Pro");

  const cameraCount = isPad ? 1 : isPro ? 3 : 2;

  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      <div
        className={`absolute left-[18%] top-[28%] h-[92%] ${isPad ? "w-[42%] rounded-[18px]" : "w-[34%] rounded-[26px]"} bg-gradient-to-b ${gradient} border border-black/15 shadow-[0_18px_35px_rgba(20,38,107,.22)]`}
      >
        <div
          className={`absolute left-[9%] top-[5%] grid ${cameraCount === 3 ? "grid-cols-2" : "grid-cols-1"} gap-1.5 rounded-xl bg-black/10 p-2`}
        >
          {Array.from({ length: cameraCount }, (_, index) => {
            return (
              <span
                key={index}
                className="h-4 w-4 rounded-full border-[3px] border-[#34415f] bg-[#081226] shadow-inner"
              />
            );
          })}
        </div>
        <span className="absolute left-1/2 top-[54%] -translate-x-1/2 text-sm font-800 text-white/55">
          ●
        </span>
      </div>
      <div
        className={`absolute left-[50%] top-[23%] h-[96%] ${isPad ? "w-[45%] rounded-[19px]" : "w-[35%] rounded-[27px]"} border-[4px] border-[#26324c] bg-[#07101f] p-1 shadow-[0_20px_38px_rgba(20,38,107,.25)]`}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[inherit] bg-[linear-gradient(150deg,#e80066_3%,#ff3154_34%,#f0ded6_58%,#0064b9_82%,#003b88_100%)]">
          {!isPad && (
            <span
              className={`absolute left-1/2 top-0 h-3 -translate-x-1/2 bg-[#07101f] ${isPro ? "w-9 rounded-b-full" : "w-11 rounded-b-xl"}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Models() {
  const [items, setItems] = useState<PublicCatalogItem[]>([]);

  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");

  const [availability, setAvailability] = useState("");

  const [refresh, setRefresh] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = items.find((item) => {
    return item.id === selectedId;
  });

  useEffect(() => {
    if (selectedId && state !== "loading" && !selected?.installmentPlan) {
      setSelectedId(null);
    }
  }, [selectedId, state, selected]);

  const loadedQuery = useRef("");

  useEffect(() => {
    const controller = new AbortController();

    const queryKey = JSON.stringify([page, q.trim(), availability]);

    if (loadedQuery.current !== queryKey) {
      setState("loading");

      setItems([]);
    }

    const timer = setTimeout(() => {
      if (SAMPLE_CATALOG_MODE) {
        const filtered = sampleCatalog.filter((item) => {
          return (
            item.name.toLowerCase().includes(q.trim().toLowerCase()) &&
            (!availability || item.availability === availability)
          );
        });

        loadedQuery.current = queryKey;

        setItems(filtered.slice((page - 1) * 20, page * 20));

        setTotal(filtered.length);

        setState("ready");

        return;
      }

      void getPublicCatalog(
        { page, q: q.trim(), availability },
        controller.signal,
      )
        .then((result) => {
          if (controller.signal.aborted) {
            return;
          }

          if (page > 1 && result.items.length === 0) {
            setPage(1);

            return;
          }

          loadedQuery.current = queryKey;

          setItems(result.items);

          setTotal(result.total);

          setState("ready");
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setItems([]);

            setState("error");
          }
        });
    }, 200);

    return () => {
      clearTimeout(timer);

      controller.abort();
    };
  }, [page, q, availability, refresh]);

  useEffect(() => {
    const refreshCatalog = () => {
      if (!document.hidden) {
        setRefresh((value) => {
          return value + 1;
        });
      }
    };

    const timer = window.setInterval(refreshCatalog, 60000);

    window.addEventListener("focus", refreshCatalog);

    return () => {
      clearInterval(timer);

      window.removeEventListener("focus", refreshCatalog);
    };
  }, []);

  return (
    <section id="units" className={styles.section}>
      <SectionHeading
        eyebrow="Find your device"
        title={
          <>
            Phones for your <span className="holo-text">next chapter</span>
          </>
        }
        subtitle="Browse our units, payment offers, and latest availability before you message us."
      />
      {SAMPLE_CATALOG_MODE && (
        <p className="mx-auto mt-4 max-w-6xl text-center text-sm text-ink-soft">
          Sample catalog · Prices, payment plans, and availability are for
          preview only.
        </p>
      )}

      <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(210px,auto)]">
        <label className="grid min-w-0 gap-1 text-sm font-600 text-blue-ink">
          Search units
          <input
            maxLength={100}
            value={q}
            onChange={(event) => {
              setQ(event.target.value);

              setPage(1);
            }}
            className="min-w-0 w-full rounded-2xl border border-blue/20 bg-white/80 px-4 py-3"
            placeholder="Phone or tablet model"
          />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-600 text-blue-ink">
          Availability
          <select
            value={availability}
            onChange={(event) => {
              setAvailability(event.target.value);

              setPage(1);
            }}
            className="min-w-0 w-full rounded-2xl border border-blue/20 bg-white/80 px-4 py-3"
          >
            <option value="">All availability</option>
            {catalogAvailability.map((value) => {
              return (
                <option key={value} value={value}>
                  {catalogAvailabilityLabels[value]}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      {state === "loading" && (
        <p
          role="status"
          className="mx-auto mt-10 max-w-6xl text-center text-ink-soft"
        >
          Loading current units…
        </p>
      )}
      {state === "error" && (
        <div
          role="alert"
          className="glass mx-auto mt-10 max-w-3xl rounded-3xl p-8 text-center"
        >
          <p>
            We couldn’t load the current catalog. Please try again or contact
            the team.
          </p>
          <button
            type="button"
            className="btn-candy mt-4 rounded-full px-5 py-3"
            onClick={() => {
              return setRefresh((value) => {
                return value + 1;
              });
            }}
          >
            Try again
          </button>
        </div>
      )}
      {state === "ready" && items.length === 0 && (
        <p
          role="status"
          className="mx-auto mt-10 max-w-6xl text-center text-ink-soft"
        >
          {q || availability
            ? "No units match your filters. Try another model or availability."
            : "No units are listed right now. Contact our team for upcoming offers."}
        </p>
      )}
      <div aria-busy={state === "loading"} className={styles.grid}>
        {items.map((item, i) => {
          const image = catalogPhoto(item);

          const m: Model = {
            name: item.name,
            condition: catalogConditionLabels[item.condition],
            daily: catalogPrice(
              item.dailyAmount ?? item.installmentPlan?.totalAmount ?? null,
            ),
            gradient: "from-[#c9a7ff] to-[#8aa2f2]",
            image: image ?? undefined,
            imageAlt: item.name,
          };

          return (
            <Reveal key={item.id} delay={(i % 3) * 90}>
              <article className={`group ${styles.card}`}>
                {/* Real product renders are used when available; other models keep the illustrated fallback. */}
                <div className={styles.image}>
                  {m.image ? (
                    <Image
                      src={m.image}
                      alt={m.imageAlt ?? `${m.name} product view`}
                      fill
                      unoptimized={item.hasImage}
                      sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 33vw"
                      className="object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  ) : (
                    <FlatDevicePreview name={m.name} gradient={m.gradient} />
                  )}
                </div>

                <div className={styles.details}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className="min-w-0 break-words font-display text-xl font-700"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {m.name}
                    </h3>
                    <span className={styles.condition}>{m.condition}</span>
                  </div>
                  <p
                    className="mt-2 text-sm font-600 text-ink-soft"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {item.description || "Contact us for model details."}
                  </p>

                  <div className="mt-4 flex items-end justify-between">
                    <div className="min-w-0">
                      <p
                        className="break-words font-display text-2xl font-800"
                        style={{ overflowWrap: "anywhere" }}
                      >
                        {m.daily}
                        {item.dailyAmount !== null && (
                          <span className="text-sm">/day</span>
                        )}
                      </p>
                      {item.dailyAmount === null && item.installmentPlan && (
                        <p className="text-xs font-600">Total payable</p>
                      )}
                      <p className="text-xs font-600">
                        {catalogAvailabilityLabels[item.availability]}
                      </p>
                    </div>
                    <a
                      href={`/inquire?device=${encodeURIComponent(item.name)}`}
                      className={styles.inquire}
                      aria-label={`Ask about ${m.name}`}
                    >
                      <ArrowUpRight weight="bold" className="h-5 w-5" />
                    </a>
                  </div>
                  {item.installmentPlan ? (
                    <button
                      type="button"
                      className={styles.payments}

                      onClick={() => {
                        return setSelectedId(item.id);
                      }}
                    >
                      View sample payments
                      <span className="sr-only"> for {item.name}</span>
                    </button>
                  ) : (
                    <p className="mt-4 text-xs">
                      Contact the team for a payment breakdown.
                    </p>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      {state === "ready" && total > 20 && (
        <nav
          aria-label="Catalog pages"
          className="mx-auto mt-8 flex max-w-6xl items-center justify-center gap-4 text-sm"
        >
          <button
            type="button"
            disabled={page <= 1}
            className="rounded-full border border-blue/20 px-4 py-2 disabled:opacity-40"
            onClick={() => {
              return setPage((value) => {
                return value - 1;
              });
            }}
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            type="button"
            disabled={page * 20 >= total}
            className="rounded-full border border-blue/20 px-4 py-2 disabled:opacity-40"
            onClick={() => {
              return setPage((value) => {
                return value + 1;
              });
            }}
          >
            Next
          </button>
        </nav>
      )}
      {state === "ready" && selected?.installmentPlan && (
        <CatalogBreakdown
          key={`${selected.id}-${selected.version}`}
          item={selected}
          plan={selected.installmentPlan}
          onClose={() => {
            return setSelectedId(null);
          }}
        />
      )}
      <Reveal className="mt-8 text-center">
        <p className="text-sm font-600 text-ink-soft">
          Looking for a different model or storage?{" "}
          <a
            href="#join"
            className="font-700 text-blue underline-offset-2 hover:underline"
          >
            Message us and we&apos;ll set up a plan for you.
          </a>
        </p>
      </Reveal>
    </section>
  );
}
