"use client";

import { useId } from "react";
import Image, { getImageProps } from "next/image";
import {
  Check,
  CheckCircle,
  Clock,
  Package,
  Truck,
} from "@phosphor-icons/react";
import styles from "./release-status-card.module.css";

const releaseStatuses = [
  { status: "not ready", label: "Not ready", icon: Clock },
  { status: "processing", label: "Processing", icon: Package },
  { status: "ready", label: "Ready", icon: Truck },
  { status: "released", label: "Released", icon: CheckCircle },
] as const;

const headlines: Record<string, string> = {
  "not ready": "Your release journey starts here.",
  processing: "Getting your unit ready.",
  ready: "Your unit is ready for collection.",
  released: "Your unit has been released.",
};

const truckLogoSrc = getImageProps({
  src: "/brand/fresh-phones-logo.png",
  alt: "",
  width: 300,
  height: 300,
}).props.src;

function TruckIllustration({
  complete,
  ready,
  preparing,
}: {
  complete: boolean;
  ready: boolean;
  preparing: boolean;
}) {
  const id = useId().replaceAll(":", "");

  return (
    <div className={styles.illustration} aria-hidden="true">
      <svg viewBox="0 0 440 280" fill="none" focusable="false">
        <defs>
          <linearGradient
            id={`${id}-body`}
            x1="115"
            y1="65"
            x2="274"
            y2="202"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#dfeaff" />
            <stop offset="1" stopColor="#93b5ea" />
          </linearGradient>
          <linearGradient
            id={`${id}-side`}
            x1="93"
            y1="95"
            x2="242"
            y2="209"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#b9d2f8" />
            <stop offset="1" stopColor="#7498d1" />
          </linearGradient>
          <linearGradient
            id={`${id}-cab`}
            x1="245"
            y1="109"
            x2="336"
            y2="212"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ffebf6" />
            <stop offset="1" stopColor="#e9b8d8" />
          </linearGradient>
          <linearGradient
            id={`${id}-window`}
            x1="272"
            y1="118"
            x2="316"
            y2="159"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#607baa" />
            <stop offset="1" stopColor="#2b426e" />
          </linearGradient>
        </defs>
        <ellipse
          className={styles.artHalo}
          cx="229"
          cy="138"
          rx="157"
          ry="118"
        />
        <path
          className={styles.artRoute}
          d="M44 219C66 196 60 167 91 153M327 81C374 79 389 110 369 126"
          strokeWidth="2"
          strokeDasharray="5 8"
          strokeLinecap="round"
        />
        <path
          className={styles.artCloud}
          d="M62 98C44 98 44 78 58 74C57 56 82 48 93 66C111 57 128 84 111 96C106 100 80 99 62 98Z"
        />
        <path
          className={styles.artCloud}
          d="M348 191C332 191 334 174 345 172C343 159 363 149 374 163C388 157 404 178 389 188C382 193 365 191 348 191Z"
        />
        <path
          className={styles.artSpark}
          d="M111 35V49M104 42H118M354 144V158M347 151H361"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse
          cx="223"
          cy="233"
          rx="141"
          ry="16"
          fill="#172c55"
          opacity=".12"
        />
        <g className={styles.truck}>
          <path d="M89 90L126 72H263L229 91H89Z" fill="#edf3ff" />
          <path d="M89 90H229V201H89V90Z" fill={`url(#${id}-side)`} />
          <path d="M229 91L263 72V182L229 201V91Z" fill={`url(#${id}-body)`} />
          <path d="M89 91H229V113H89V91Z" fill="white" opacity=".14" />
          <path
            d="M101 98H218"
            stroke="white"
            strokeOpacity=".55"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="106"
            y="117"
            width="106"
            height="70"
            rx="10"
            fill="#e9f2ff"
          />
          <svg
            x="109"
            y="120"
            width="100"
            height="64"
            viewBox="230 390 1150 760"
            preserveAspectRatio="xMidYMid meet"
          >
            <image href={truckLogoSrc} x="0" y="0" width="1600" height="1600" />
          </svg>
          <path
            d="M249 108H282C293 108 297 115 303 124L324 157V207H249V108Z"
            fill={`url(#${id}-cab)`}
          />
          <path
            d="M249 108L266 99H291C301 100 306 111 311 118L337 152V198L324 207V157L303 124C297 115 293 108 282 108H249Z"
            fill="#f9e0f0"
          />
          <path
            d="M263 119H281C286 119 289 123 293 129L309 152H263V119Z"
            fill={`url(#${id}-window)`}
          />
          <path
            d="M271 123L283 148"
            stroke="#e0edff"
            strokeOpacity=".4"
            strokeWidth="5"
          />
          <path d="M316 133L328 151H320L309 133H316Z" fill="#526c97" />
          <rect x="263" y="161" width="13" height="4" rx="2" fill="#a77c9c" />
          <path d="M83 199H328V211H83V199Z" fill="#5e7da9" />
          <path d="M326 179L338 175V190L326 194V179Z" fill="#fff0cd" />
          <rect x="81" y="178" width="5" height="15" rx="2" fill="#f5bbd8" />
          <rect x="316" y="202" width="24" height="10" rx="4" fill="#809dc5" />
          <circle cx="123" cy="210" r="23" fill="#263b5d" />
          <circle cx="123" cy="210" r="13" fill="#b5c9e6" />
          <circle cx="123" cy="210" r="6" fill="#7490b6" />
          <circle cx="291" cy="210" r="23" fill="#263b5d" />
          <circle cx="291" cy="210" r="13" fill="#b5c9e6" />
          <circle cx="291" cy="210" r="6" fill="#7490b6" />
          <path
            d="M115 200C118 197 123 196 128 198M283 200C286 197 291 196 296 198"
            stroke="#e4edfb"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        {preparing && (
          <g transform="rotate(-10 333 64)">
            <rect
              x="311"
              y="43"
              width="44"
              height="44"
              rx="12"
              fill="#f9e2f0"
            />
            <path
              d="M323 57H343V73H323V57ZM333 57V63M323 57L328 53H339L343 57"
              stroke="#8c6184"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>
        )}
        {(ready || complete) && (
          <g>
            <circle cx="340" cy="65" r="28" fill="#f9d7ed" />
            <path
              d="M328 65L337 74L353 56"
              stroke="#37578e"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
        {complete && (
          <path
            d="M68 141H84M52 160H78M62 180H80"
            stroke="#b8cdee"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

type Props = {
  releaseStatus: string;
  status: "loading" | "ready" | "error";
  description: string;
  unitName?: string;
  updatedAt?: string;
  onRetry: () => void;
};

export default function ReleaseStatusCard({
  releaseStatus,
  status,
  description,
  unitName,
  updatedAt,
  onRetry,
}: Props) {
  const current =
    status === "ready"
      ? releaseStatuses.findIndex((item) => {
          return item.status === releaseStatus;
        })
      : -1;

  const label =
    status === "loading"
      ? "Checking status"
      : status === "error" || current < 0
        ? "Status unavailable"
        : releaseStatuses[current].label;

  const headline =
    status === "loading"
      ? "Checking your unit’s progress…"
      : status === "error" || current < 0
        ? "Your release status is unavailable."
        : headlines[releaseStatus];

  return (
    <section
      className={styles.card}
      aria-labelledby="release-title"
      aria-busy={status === "loading"}
    >
      <div className={styles.summary}>
        <div className={styles.decorations} aria-hidden="true">
          <Image
            src="/brand/doodles/cloud-soft.png"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 600px) 200px, 250px"
            className={`${styles.extraCloud} ${styles.extraCloudOne}`}
          />
          <Image
            src="/brand/doodles/cloud-round.png"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 600px) 160px, 230px"
            className={`${styles.extraCloud} ${styles.extraCloudTwo}`}
          />
          <Image
            src="/about/glossy-heart.webp"
            alt=""
            width={1248}
            height={1248}
            sizes="(max-width: 600px) 30px, 56px"
            className={styles.decorativeHeart}
          />
          <Image
            src="/about/glass-bubble.webp"
            alt=""
            width={1248}
            height={1248}
            sizes="(max-width: 600px) 22px, 34px"
            className={styles.decorativeBubble}
          />
          <Image
            src="/brand/doodles/bird-flight.png"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 600px) 42px, 68px"
            className={styles.decorativeBird}
          />
        </div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Release &amp; fulfillment</p>
          <span className={styles.badge}>
            <span aria-hidden="true">
              {current === 3 ? (
                <CheckCircle weight="fill" />
              ) : current === 2 ? (
                <Truck weight="duotone" />
              ) : (
                <Clock weight="duotone" />
              )}
            </span>
            {label}
          </span>
          <h2 id="release-title">{headline}</h2>
          <p className={styles.description}>{description}</p>
          {status === "ready" && unitName && (
            <p className={styles.unit}>
              <Package weight="duotone" aria-hidden="true" />
              {unitName}
            </p>
          )}
          {status === "ready" && updatedAt && (
            <p className={styles.updated}>
              Last staff update{" "}
              <time dateTime={updatedAt}>
                {new Date(updatedAt).toLocaleString("en-PH")}
              </time>
            </p>
          )}
          {status === "error" && (
            <button type="button" className={styles.retry} onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
        <div className={styles.artwork} aria-hidden="true">
          <Image
            src="/brand/doodles/cloud-soft.png"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 600px) 260px, 380px"
            className={`${styles.backgroundCloud} ${styles.cloudOne}`}
          />
          <Image
            src="/brand/doodles/cloud-round.png"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 600px) 230px, 300px"
            className={`${styles.backgroundCloud} ${styles.cloudTwo}`}
          />
          <TruckIllustration
            complete={current === 3}
            ready={current === 2}
            preparing={current === 1}
          />
        </div>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressHeading}>
          <h3>Release stages</h3>
          {current >= 0 && (
            <span>
              Stage {current + 1} of {releaseStatuses.length}
            </span>
          )}
        </div>
        <ol className={styles.stages} aria-label="Release stages">
          {releaseStatuses.map((item, index) => {
            const Icon = item.icon;

            const completed = current >= 0 && index < current;

            const active = index === current;

            return (
              <li
                key={item.status}
                className={`${styles.stage}${completed ? ` ${styles.completed}` : ""}${active ? ` ${styles.active}` : ""}`}
                aria-current={active ? "step" : undefined}
              >
                <span className={styles.stageIcon} aria-hidden="true">
                  {completed ? (
                    <Check weight="bold" />
                  ) : (
                    <Icon weight="duotone" />
                  )}
                </span>
                <strong>{item.label}</strong>
                <span className={styles.stageCaption}>
                  {active ? "Current stage" : completed ? "Earlier stage" : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
