import type { CSSProperties } from "react";

export type DoodleName =
  | "application"
  | "package-check"
  | "phone-heart"
  | "join-heart"
  | "lock-heart"
  | "calendar-heart"
  | "chat-heart"
  | "shield-heart"
  | "id-heart"
  | "wallet-heart"
  | "gift";

type Props = {
  name: DoodleName;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export default function DoodleIcon({
  name,
  size = 28,
  className,
  style,
}: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      style={{ flexShrink: 0, color: "var(--doodle-ink, #82678f)", ...style }}
      aria-hidden="true"
      focusable="false"
      data-doodle={name}
    >
      <use href={`/brand/v2/doodles/icons.svg?v=pastel-pink-1#${name}`} />
    </svg>
  );
}
