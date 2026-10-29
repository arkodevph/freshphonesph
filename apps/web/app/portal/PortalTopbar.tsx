"use client";

import type { Me } from "@/lib/api";
import { type PortalSummary } from "@/lib/api";
import {
  Bell,
  AltArrowDown as CaretDown,
  Settings as GearSix,
  HamburgerMenu as List,
  Magnifier as MagnifyingGlass,
  Moon,
  Logout as SignOut,
  Sun,
} from "@/components/SolarIcons";
import Image from "next/image";
import Link from "next/link";
import type * as React from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { type MouseEvent } from "react";
import styles from "./portal.module.css";
import { portalNav, ProfileAvatar } from "./portal-view";

type Props = {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  topbarActionsRef: RefObject<HTMLDivElement | null>;
  searchOpen: boolean;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  setProfileOpen: Dispatch<SetStateAction<boolean>>;
  setNotificationsOpen: Dispatch<SetStateAction<boolean>>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  pageQuery: string;
  setPageQuery: Dispatch<SetStateAction<string>>;
  toggleTheme: (event: MouseEvent<HTMLButtonElement>) => void;
  theme: "light" | "dark";
  desktopNotificationsRef: RefObject<HTMLDivElement | null>;
  desktopNotificationButtonRef: RefObject<HTMLButtonElement | null>;
  notificationsOpen: boolean;
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
  unreadNotifications: number;
  notificationPanel: (id: string) => React.ReactNode;
  profileOpen: boolean;
  profileName: string;
  me: Me | null;
  summary: PortalSummary | null;
  logout: () => Promise<void>;
};

export default function PortalTopbar({
  menuOpen,
  setMenuOpen,
  topbarActionsRef,
  searchOpen,
  setSearchOpen,
  setProfileOpen,
  setNotificationsOpen,
  searchInputRef,
  pageQuery,
  setPageQuery,
  toggleTheme,
  theme,
  desktopNotificationsRef,
  desktopNotificationButtonRef,
  notificationsOpen,
  section,
  unreadNotifications,
  notificationPanel,
  profileOpen,
  profileName,
  me,
  summary,
  logout,
}: Props) {
  return (
    <header className={styles.topbar} data-portal-material="toolbar">
      <button
        type="button"
        className={styles.menuButton}
        data-customer-tour-tablet="menu"
        aria-label="Open navigation"
        aria-controls="customer-sidebar"
        aria-expanded={menuOpen}
        onClick={() => {
          return setMenuOpen(true);
        }}
      >
        <List aria-hidden="true" />
      </button>
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <Image
            src="/brand/fresh-phones-logo.png"
            alt=""
            width={44}
            height={44}
          />
        </span>
        <span>
          <strong>Fresh Phones</strong>
          <small>Customer portal</small>
        </span>
      </div>
      <div className={styles.topbarActions} ref={topbarActionsRef}>
        <div className={styles.searchWrap}>
          <button
            type="button"
            className={styles.searchTrigger}
            data-customer-tour-tablet="search"
            aria-expanded={searchOpen}
            aria-controls="customer-page-search"
            onClick={() => {
              setSearchOpen((open) => {
                return !open;
              });

              setProfileOpen(false);

              setNotificationsOpen(false);
            }}
          >
            <MagnifyingGlass aria-hidden="true" />
            <span>Search pages</span>
            <kbd>⌘ K</kbd>
          </button>
          {searchOpen && (
            <div id="customer-page-search" className={styles.searchMenu}>
              <label>
                <MagnifyingGlass aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  value={pageQuery}
                  onChange={(event) => {
                    return setPageQuery(event.target.value);
                  }}
                  placeholder="Find a customer page"
                  aria-label="Find a customer page"
                />
              </label>
              <div>
                {portalNav
                  .filter((item) => {
                    return item.label
                      .toLowerCase()
                      .includes(pageQuery.trim().toLowerCase());
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
                        onClick={() => {
                          return setSearchOpen(false);
                        }}
                      >
                        <Icon aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`${styles.topbarIcon} ${styles.themeToggle}`}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun key="sun" aria-hidden="true" />
          ) : (
            <Moon key="moon" aria-hidden="true" />
          )}
        </button>
        <div className={styles.notificationWrap} ref={desktopNotificationsRef}>
          <button
            ref={desktopNotificationButtonRef}
            type="button"
            className={styles.topbarIcon}
            data-customer-tour-tablet="notifications"
            aria-label="Preview notifications"
            aria-expanded={notificationsOpen}
            aria-controls="customer-notification-preview"
            onClick={() => {
              setNotificationsOpen((open) => {
                return !open;
              });

              setSearchOpen(false);

              setProfileOpen(false);
            }}
          >
            <Bell aria-hidden="true" />
            {unreadNotifications > 0 && <span className={styles.topbarDot} />}
          </button>
          {notificationPanel("customer-notification-preview")}
        </div>
        <div className={styles.profileWrap}>
          <button
            type="button"
            className={styles.profileButton}
            data-customer-tour-tablet="account"
            aria-expanded={profileOpen}
            aria-controls="customer-profile-menu"
            onClick={() => {
              setProfileOpen((open) => {
                return !open;
              });

              setSearchOpen(false);

              setNotificationsOpen(false);
            }}
          >
            <ProfileAvatar
              className={styles.accountAvatar}
              name={profileName}
              image={me?.image}
            />
            <span>
              <strong>{profileName}</strong>
              <small>Customer</small>
            </span>
            <CaretDown aria-hidden="true" />
          </button>
          {profileOpen && (
            <div id="customer-profile-menu" className={styles.profileMenu}>
              <p>
                <strong>
                  {summary?.full_name ?? me?.full_name ?? "Customer"}
                </strong>
                <small>{me?.email}</small>
              </p>
              <Link
                href="/portal/settings"
                onClick={() => {
                  return setProfileOpen(false);
                }}
              >
                <GearSix aria-hidden="true" /> Settings
              </Link>
              <button type="button" onClick={logout}>
                <SignOut aria-hidden="true" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
