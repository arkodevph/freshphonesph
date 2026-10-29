"use client";

import { type PortalNotification } from "@/lib/api";
import { Compass, Close as X } from "@/components/SolarIcons";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { type MouseEvent } from "react";
import styles from "./portal.module.css";
import { portalNav } from "./portal-view";

type Props = {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  section:
    | "catalog"
    | "overview"
    | "membership"
    | "schedule"
    | "payments"
    | "documents"
    | "release"
    | "notifications"
    | "support"
    | "settings";
  notifications: PortalNotification[];
  startTour: (event?: MouseEvent<HTMLButtonElement>) => void;
};

export default function PortalSidebar({
  menuOpen,
  setMenuOpen,
  section,
  notifications,
  startTour,
}: Props) {
  return (
    <aside
      id="customer-sidebar"
      data-portal-material="sidebar"
      className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
      aria-label="Customer navigation"
    >
      <button
        type="button"
        className={styles.closeMenu}
        aria-label="Close menu"
        onClick={() => {
          return setMenuOpen(false);
        }}
      >
        <X aria-hidden="true" />
      </button>
      <nav className={styles.sidebarNav} aria-label="Customer sections">
        {["Workspace", "Updates", "Account"].map((group) => {
          return (
            <div
              className={styles.navGroup}
              key={group}
              data-customer-tour-desktop={
                group === "Updates" ? "updates" : undefined
              }
            >
              <p className={styles.navLabel}>{group}</p>
              {portalNav
                .filter((item) => {
                  return item.group === group;
                })
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.id}
                      href={
                        item.id === "overview"
                          ? "/portal"
                          : `/portal/${item.id}`
                      }
                      className={`${styles.navLink} ${section === item.id ? styles.navActive : ""}`}
                      data-customer-tour-desktop={item.id}
                      aria-current={section === item.id ? "page" : undefined}
                      onClick={() => {
                        return setMenuOpen(false);
                      }}
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                      {item.id === "notifications" &&
                        notifications.some((notification) => {
                          return !notification.readAt;
                        }) && (
                          <i className={styles.navDot} aria-hidden="true" />
                        )}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>
      <div className={styles.sidebarFooter}>
        <button
          type="button"
          data-customer-tour-replay="desktop"
          className={styles.tourReplay}
          onClick={(event) => {
            setMenuOpen(false);

            startTour(event);
          }}
        >
          <Compass aria-hidden="true" /> Take a quick tour
        </button>
      </div>
    </aside>
  );
}
