"use client";

import { useState } from "react";
import type { Staff } from "../people/PersonnelDirectory";
import styles from "./hr-dashboard.module.css";

function Avatar({ person }: { person: Staff }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);

  const initials = person.name.trim().split(/\s+/).filter(Boolean);

  const label =
    [initials[0]?.[0], initials.length > 1 ? initials.at(-1)?.[0] : ""]
      .join("")
      .toUpperCase() || "?";

  return (
    <span
      className={styles.avatar}
      role="img"
      aria-label={person.name}
      title={person.name}
    >
      {person.image && failedImage !== person.image ? (
        <img
          src={person.image}
          alt=""
          width={28}
          height={28}
          referrerPolicy="no-referrer"
          onError={() => {
            setFailedImage(person.image ?? null);
          }}
        />
      ) : (
        label
      )}
    </span>
  );
}

export default function PersonnelAvatars({
  members = [],
  loading = false,
}: {
  members?: Staff[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className={styles.avatars} aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span key={index} className={styles.avatar} data-loading />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.avatars}>
      {members.slice(0, 3).map((person) => (
        <Avatar key={person.id} person={person} />
      ))}
      {members.length > 3 && (
        <span
          className={styles.avatar}
          data-overflow
          aria-label={`${members.length - 3} more people`}
        >
          +{members.length - 3}
        </span>
      )}
    </div>
  );
}
