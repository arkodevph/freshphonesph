"use client";

import type { Me } from "@/lib/api";
import { Compass, SignOut, X } from "@phosphor-icons/react";
import Link from "next/link";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { type MouseEvent } from "react";
import styles from "./portal.module.css";
import { moreToolDetails, portalNav, ProfileAvatar } from "./portal-view";

type Props = {
  moreSheetRef: RefObject<HTMLElement | null>;
  moreCloseRef: RefObject<HTMLButtonElement | null>;
  setMoreOpen: Dispatch<SetStateAction<boolean>>;
  profileName: string;
  me: Me | null;
  startTour: (event?: MouseEvent<HTMLButtonElement>) => void;
  logout: () => Promise<void>;
};

export default function PortalMoreSheet({
  moreSheetRef,
  moreCloseRef,
  setMoreOpen,
  profileName,
  me,
  startTour,
  logout,
}: Props) {
  return (
    <section
      ref={moreSheetRef}
      id="customer-more-sheet"
      className={styles.moreSheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-more-title"
    >
      <div className={styles.moreSheetHeader}>
        <div>
          <p>Fresh Phones PH</p>
          <h2 id="customer-more-title">More tools</h2>
        </div>
        <button
          ref={moreCloseRef}
          type="button"
          aria-label="Close more tools"
          onClick={() => {
            return setMoreOpen(false);
          }}
        >
          <X weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className={styles.moreAccount}>
        <ProfileAvatar
          className={styles.moreAccountAvatar}
          name={profileName}
          image={me?.image}
        />
        <div>
          <strong>{profileName}</strong>
          <small>{me?.email ?? "Customer account"}</small>
        </div>
      </div>
      <div className={styles.moreTools}>
        {portalNav
          .filter((item) => {
            return moreToolDetails[item.id];
          })
          .map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={`/portal/${item.id}`}
                className={styles.moreTool}
                onClick={() => {
                  return setMoreOpen(false);
                }}
              >
                <span className={styles.moreToolIcon}>
                  <Icon weight="regular" aria-hidden="true" />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{moreToolDetails[item.id]}</small>
                </span>
                <span className={styles.moreToolArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            );
          })}
      </div>
      <button
        type="button"
        className={styles.moreTourReplay}
        onClick={(event) => {
          setMoreOpen(false);

          startTour(event);
        }}
      >
        <Compass aria-hidden="true" />
        <span>Take a quick tour</span>
        <span aria-hidden="true">→</span>
      </button>
      <button type="button" className={styles.moreLogout} onClick={logout}>
        <SignOut weight="regular" aria-hidden="true" />
        <span>Log out</span>
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
