"use client";

import { useNavigationUpdates } from "@/lib/useNavigationUpdates";
import Image from "next/image";
import { useWorkspaceMotion } from "@/lib/useWorkspaceMotion";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logout } from "@/components/SolarIcons";
import {
  navigationGroups,
  type SystemNavigationItem,
} from "./system-navigation";
import styles from "./system-sidebar.module.css";

type Props = {
  accountId: string;
  trackUpdates: boolean;
  items: readonly SystemNavigationItem[];
  search: ReactNode;
  pathname: string;
  showAccount: boolean;
  name: string;
  role: string;
  initials: string;
  onLogout: () => Promise<void>;
};

export default function SystemSidebar({
  accountId,
  trackUpdates,
  items,
  search,
  pathname,
  showAccount,
  name,
  role,
  initials,
  onLogout,
}: Props) {
  const motion = useWorkspaceMotion<HTMLElement>();

  const updates = useNavigationUpdates(
    accountId,
    pathname,
    items.map((item) => {
      return item.href;
    }),
    trackUpdates,
  );

  return (
    <aside className={`system-sidebar ${styles.sidebar}`} ref={motion}>
      {showAccount && (
        <div className={styles.header}>
          <Link
            href="/system"
            className={`system-brand ${styles.brand}`}
            aria-label="Fresh Phones PH dashboard"
          >
            <span className="system-brand-mark">
              <Image
                src="/brand/fresh-phones-logo.png"
                alt=""
                width={38}
                height={38}
                className="h-9 w-9 scale-150 object-cover"
              />
            </span>
            <span>
              <strong>Fresh Phones</strong>
              <small>Operations</small>
            </span>
          </Link>
          {search}
        </div>
      )}
      <nav
        className={`system-nav ${styles.navigation}`}
        aria-label="System navigation"
      >
        {navigationGroups.map((group) => {
          const links = items.filter((item) => {
            return item.group === group;
          });

          if (!links.length) {
            return null;
          }

          return (
            <div
              className={styles.group}
              key={group}
              role="group"
              aria-label={group}
            >
              <p className={styles.label}>{group}</p>
              {links.map(({ icon: Icon, label, href }) => {
                const active =
                  href === "/system"
                    ? pathname === href
                    : pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`system-nav-item ${styles.link}${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className={styles.icon} />
                    <span>{label}</span>
                    {updates.has(href) && (
                      <>
                        <span
                          className={styles.updateDot}
                          aria-hidden="true"
                          data-navigation-update={href}
                        />
                        <span className="sr-only">New updates</span>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      {showAccount && (
        <div className={`system-sidebar-footer ${styles.footer}`}>
          <div className="system-profile">
            <span className="system-avatar">{initials}</span>
            <span className={`min-w-0 flex-1 ${styles.account}`}>
              <strong className="block truncate" title={name}>
                {name}
              </strong>
              <small className="block truncate" title={role}>
                {role}
              </small>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className={`system-icon-button ${styles.logout}`}
              aria-label="Log out"
              title="Log out"
            >
              <Logout width={20} height={20} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
