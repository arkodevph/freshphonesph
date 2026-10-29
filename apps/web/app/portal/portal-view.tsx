"use client";

import { pesoFormat as currency } from "@/lib/currency";
import {
  Bell,
  Calendar as CalendarBlank,
  ChatRoundDots as ChatCircleText,
  FileText,
  Settings as GearSix,
  HomeAngle as House,
  Box as Package,
  Smartphone as DeviceMobile,
  Delivery as Truck,
  Wallet,
} from "@/components/SolarIcons";
import Image from "next/image";
import { useState } from "react";
import styles from "./portal.module.css";

export const date = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const SUPPORT_PAGE_SIZE = 3;

export const portalNav = [
  { id: "overview", label: "Overview", icon: House, group: "Workspace" },
  {
    id: "catalog",
    label: "Phones & plans",
    icon: DeviceMobile,
    group: "Workspace",
  },
  {
    id: "membership",
    label: "My membership",
    icon: Package,
    group: "Workspace",
  },
  {
    id: "schedule",
    label: "Payment schedule",
    icon: CalendarBlank,
    group: "Workspace",
  },
  {
    id: "payments",
    label: "Verified payments",
    icon: Wallet,
    group: "Workspace",
  },
  {
    id: "documents",
    label: "My documents",
    icon: FileText,
    group: "Workspace",
    typescriptOnly: true,
  },
  { id: "release", label: "Release status", icon: Truck, group: "Updates" },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    group: "Updates",
    typescriptOnly: true,
  },
  { id: "support", label: "Support", icon: ChatCircleText, group: "Updates" },
  { id: "settings", label: "Settings", icon: GearSix, group: "Account" },
] as const;

export const mobileNav = [
  { id: "overview", label: "Home", icon: House },
  { id: "membership", label: "Unit", icon: Package },
  { id: "schedule", label: "Plan", icon: CalendarBlank },
  { id: "payments", label: "Payments", icon: Wallet },
] as const;

export type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

export type PortalSection = (typeof portalNav)[number]["id"];

export const moreToolDetails: Partial<Record<PortalSection, string>> = {
  catalog: "Browse models, availability, and sample payments",
  documents: "Upload requirements",
  release: "Track your unit",
  notifications: "Recent account updates",
  support: "Get help with a concern",
  settings: "Profile, appearance, and security",
};

export const sectionCopy: Record<
  Exclude<PortalSection, "overview">,
  { eyebrow: string; title: string; description: string }
> = {
  catalog: {
    eyebrow: "Explore",
    title: "Phones & plans",
    description:
      "Find your next device and explore sample installments before joining a batch.",
  },
  membership: {
    eyebrow: "Workspace",
    title: "My membership",
    description:
      "Your enrollment record, requirements, and collection updates.",
  },
  schedule: {
    eyebrow: "Workspace",
    title: "Payment schedule",
    description: "See your installment dates and expected amounts.",
  },
  payments: {
    eyebrow: "Workspace",
    title: "Verified payments",
    description: "Payments appear here after Finance verifies them.",
  },
  documents: {
    eyebrow: "Workspace",
    title: "My documents",
    description: "Upload and track the documents needed for your account.",
  },
  release: {
    eyebrow: "Updates",
    title: "Release status",
    description: "Follow the preparation and release of your unit.",
  },
  notifications: {
    eyebrow: "Updates",
    title: "Notifications",
    description: "Your latest payment, release, and support updates.",
  },
  support: {
    eyebrow: "Updates",
    title: "Support",
    description: "Send a concern and follow its status here.",
  },
  settings: {
    eyebrow: "Account",
    title: "Settings",
    description:
      "View your profile, choose an appearance, and manage your password.",
  },
};

export function formatMoney(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return "—";
  }

  const amount = Number(String(value).replaceAll(",", ""));

  return Number.isFinite(amount) ? currency.format(amount) : "—";
}

export function formatDate(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);

  return Number.isNaN(parsed.getTime()) ? value : date.format(parsed);
}

export function displayModelName(model: string) {
  return model
    .replaceAll(" · ", "\u00a0· ")
    .replace(/(\d+) (GB|TB)\b/gi, "$1\u00a0$2");
}

export function orderDeviceImage(model: string): string | null {
  const name = model.toLowerCase().trim();

  if (/\bipad\b.*\ba16\b/.test(name)) {
    return "/products/ipad-a16-overlap-transparent.png";
  }

  if (/\bipad\s*10th\s*gen(?:eration)?\b/.test(name)) {
    return "/products/ipad-10th-gen-overlap-transparent.png";
  }

  const phone = name.match(
    /\biphone\s*(11|12|13|14|15|16|17)\b(?:\s*(pro\s*max|pro|plus|max|e))?/,
  );

  if (!phone) {
    return null;
  }

  const variant = phone[2]?.replace(/\s+/g, "-") ?? "";

  if (variant && variant !== "pro" && variant !== "pro-max") {
    return null;
  }

  return `/products/iphone-${phone[1]}${variant ? `-${variant}` : ""}-overlap-transparent.png`;
}

export function ProfileAvatar({
  className,
  name,
  image,
}: {
  className: string;
  name: string;
  image?: string | null;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);

  return (
    <span className={className}>
      {name.charAt(0) || "C"}
      {image && image !== failedImage && (
        <Image
          src={image}
          alt=""
          width={42}
          height={42}
          unoptimized
          className={styles.profilePhoto}
          onError={() => {
            return setFailedImage(image);
          }}
        />
      )}
    </span>
  );
}

export { pesoFormat as currency } from "@/lib/currency";
