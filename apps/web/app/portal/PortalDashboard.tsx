"use client";

import { usePortalWorkspace } from "./usePortalWorkspace";
import {
  Bell,
  Info,
  Moon,
  SquaresFour,
  Sun,
  Truck,
} from "@phosphor-icons/react";
import Link from "next/link";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import DashboardNextSteps from "./DashboardNextSteps";
import PaymentOverview from "./PaymentOverview";
import ReleaseStatusCard from "./ReleaseStatusCard";
import PaymentScheduleWorkspace from "./PaymentScheduleWorkspace";
import styles from "./portal.module.css";
import PortalSkeleton, { PortalLoadingRows } from "./PortalSkeleton";
import MembershipDatesPanel from "./MembershipDatesPanel";
import MembershipOverview from "./MembershipOverview";
import {
  formatDate,
  formatMoney,
  mobileNav,
  PortalSection,
  ProfileAvatar,
  sectionCopy,
} from "./portal-view";
import PortalMoreSheet from "./PortalMoreSheet";
import PortalNotificationsWorkspace from "./PortalNotificationsWorkspace";
import PortalSettingsWorkspace from "./PortalSettingsWorkspace";
import PortalSidebar from "./PortalSidebar";
import PortalSupportWorkspace from "./PortalSupportWorkspace";
import PortalTopbar from "./PortalTopbar";
import VerifiedPaymentsWorkspace from "./VerifiedPaymentsWorkspace";
import MembershipSelector from "./MembershipSelector";

export type { PortalSection } from "./portal-view";

export default function PortalDashboard({
  section,
}: {
  section: PortalSection;
}) {
  const {
    portalTopbarProps,
    portalSidebarProps,
    membershipOverviewProps,
    membershipDatesPanelProps,
    portalNotificationsWorkspaceProps,
    portalSupportWorkspaceProps,
    portalSettingsWorkspaceProps,
    portalMoreSheetProps,
    me,
    recordsStatus,
    menuOpen,
    moreOpen,
    setMenuOpen,
    setMoreOpen,
    setNotificationsOpen,
    toggleTheme,
    theme,
    notificationsOpen,
    unreadNotifications,
    notificationPanel,
    profileName,
    summary,
    mobileNotificationsRef,
    mobileNotificationButtonRef,
    error,
    notice,
    showMembershipWorkspace,
    attentionItems,
    attentionStatus,
    trackedCases,
    releaseStatusLabel,
    releaseStatusDescription,
    releaseDetails,
    releaseStatus,
    releaseUpdates,
    featuredInstallment,
    schedule,
    refresh,
    payments,
    morePayments,
    loadRecords,
    releaseUpdatesStatus,
    loadReleaseUpdates,
    paymentPagination,
    paymentsLoading,
    pendingPayments,
    pendingStatus,
    setPaymentsLoading,
    setPaymentPage,
    loadPending,
    moreTriggerRef,
    customerTourOverlay,
  } = usePortalWorkspace({ section });

  if (me?.account_type !== "customer" || recordsStatus === "loading") {
    return <PortalSkeleton section={section} />;
  }

  return (
    <main className={`${styles.shell} portal-shell`}>
      {(menuOpen || moreOpen) && (
        <button
          type="button"
          className={styles.menuBackdrop}
          aria-label="Close navigation"
          onClick={() => {
            setMenuOpen(false);

            setMoreOpen(false);
          }}
        />
      )}
      <PortalTopbar {...portalTopbarProps} />
      <PortalSidebar {...portalSidebarProps} />
      <div
        className={`${styles.container} ${section === "membership" || section === "payments" ? styles.membershipWorkspace : ""}`}
      >
        <MembershipSelector
          selectedId={me?.client_id == null ? null : String(me.client_id)}
        />
        <div className={styles.intro}>
          <div className={styles.introCopy}>
            {section === "overview" ? (
              <>
                <nav className={styles.eyebrow} aria-label="Breadcrumb">
                  <span aria-current="page">Dashboard</span>
                </nav>
                <h1>
                  Hi, {summary?.full_name?.split(" ")[0] ?? "there"}{" "}
                  <span aria-hidden="true">✦</span>
                </h1>
              </>
            ) : (
              <>
                <p className={styles.eyebrow}>{sectionCopy[section].eyebrow}</p>
                <h1>{sectionCopy[section].title}</h1>
                <p>{sectionCopy[section].description}</p>
              </>
            )}
          </div>
          {section === "overview" && (
            <span className={styles.liveLabel}>
              <span aria-hidden="true" /> Your records
            </span>
          )}
          <div className={styles.mobileTopActions}>
            <button
              type="button"
              className={`${styles.mobileTopAction} ${styles.themeToggle}`}
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun key="sun" aria-hidden="true" />
              ) : (
                <Moon key="moon" aria-hidden="true" />
              )}
            </button>
            <div
              className={`${styles.notificationWrap} ${styles.mobileNotificationWrap}`}
              ref={mobileNotificationsRef}
            >
              <button
                ref={mobileNotificationButtonRef}
                type="button"
                className={`${styles.mobileTopAction} ${section === "notifications" ? styles.mobileTopActionActive : ""}`}
                aria-label="Preview notifications"
                aria-expanded={notificationsOpen}
                aria-controls="customer-mobile-notification-preview"
                onClick={() => {
                  return setNotificationsOpen((open) => {
                    return !open;
                  });
                }}
              >
                <Bell
                  weight={section === "notifications" ? "fill" : "regular"}
                  aria-hidden="true"
                />
                {unreadNotifications > 0 && (
                  <span className={styles.mobileUnreadDot} />
                )}
              </button>
              {notificationPanel("customer-mobile-notification-preview")}
            </div>
            <button
              type="button"
              className={styles.mobileTopAction}
              aria-label="Open customer menu"
              aria-controls="customer-sidebar"
              aria-expanded={menuOpen}
              onClick={() => {
                return setMenuOpen(true);
              }}
            >
              <ProfileAvatar
                className={styles.mobileAvatar}
                name={profileName}
                image={me?.image}
              />
            </button>
          </div>
        </div>

        {(error || notice) && (
          <div
            className={`${styles.message} ${error ? styles.messageError : styles.messageSuccess}`}
            role={error ? "alert" : "status"}
          >
            {error ?? notice}
          </div>
        )}

        <div
          className={
            showMembershipWorkspace ? styles.dashboardLayout : undefined
          }
        >
          <div
            className={
              showMembershipWorkspace ? styles.dashboardMain : undefined
            }
          >
            {showMembershipWorkspace && (
              <MembershipOverview {...membershipOverviewProps} />
            )}

            {section === "overview" && (
              <DashboardNextSteps
                items={attentionItems}
                attentionStatus={attentionStatus}
                recordsStatus={recordsStatus}
                support={{
                  count: trackedCases.length,
                  href: trackedCases.length
                    ? `/portal/support#case-${trackedCases[0].id}`
                    : "/portal/support",
                }}
                release={{
                  status: releaseStatusLabel,
                  description:
                    releaseStatusDescription ??
                    releaseDetails[releaseStatus] ??
                    "Your unit status will appear here when updated.",
                  updatedAt: releaseUpdates[0]
                    ? new Date(releaseUpdates[0].updated_at).toLocaleString(
                        "en-PH",
                      )
                    : undefined,
                }}
                installment={{
                  amount:
                    recordsStatus === "ready" && featuredInstallment
                      ? formatMoney(
                          Math.max(
                            0,
                            Number(featuredInstallment.expected_amount) -
                              Number(featuredInstallment.paid_applied || 0),
                          ),
                        )
                      : "—",
                  description:
                    recordsStatus === "error"
                      ? "Installment plan unavailable"
                      : featuredInstallment
                        ? `Installment ${featuredInstallment.sequence_no} · ${formatDate(featuredInstallment.due_date)}`
                        : schedule.length
                          ? "All installments marked paid"
                          : "No schedule issued yet",
                }}
                onRetry={refresh}
              />
            )}
            {section === "membership" && summary && (
              <MembershipDatesPanel
                {...membershipDatesPanelProps}
                summary={summary}
              />
            )}
          </div>
          {showMembershipWorkspace && (
            <PaymentOverview
              summary={summary}
              schedule={schedule}
              payments={payments}
              hasMorePayments={morePayments}
              status={recordsStatus}
              onRetry={loadRecords}
            />
          )}
        </div>

        {section === "release" && (
          <ReleaseStatusCard
            releaseStatus={releaseStatus}
            status={recordsStatus}
            description={
              releaseStatusDescription ??
              releaseDetails[releaseStatus] ??
              "Your unit status will appear here when updated."
            }
            unitName={summary?.unit_model}
            updatedAt={
              releaseUpdatesStatus === "ready"
                ? releaseUpdates[0]?.updated_at
                : undefined
            }
            onRetry={loadRecords}
          />
        )}
        {section === "release" && (
          <section
            className={`${styles.sectionCard} ${styles.releaseUpdatesSection}`}
            aria-labelledby="release-updates-title"
          >
            <div className={styles.sectionHeading}>
              <span className={`${styles.sectionIcon} ${styles.scheduleIcon}`}>
                <Truck weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <p className={styles.eyebrow}>Staff updates</p>
                <h2 id="release-updates-title">Release updates</h2>
              </div>
            </div>
            {releaseUpdatesStatus === "loading" ? (
              <PortalLoadingRows rows={3} label="Checking release updates" />
            ) : releaseUpdatesStatus === "error" ? (
              <div className={styles.attentionState} role="alert">
                <p>Could not load release updates.</p>
                <button type="button" onClick={loadReleaseUpdates}>
                  Try again
                </button>
              </div>
            ) : releaseUpdates.length === 0 ? (
              <p className={styles.emptyText}>
                No release milestones have been posted yet. The current status
                is shown above; Fresh Phones PH will share collection details
                when available.
              </p>
            ) : (
              <ol className={styles.releaseTimeline}>
                {releaseUpdates.map((update, index) => {
                  return (
                    <li id={`release-update-${update.id}`} key={update.id}>
                      <div>
                        <strong>{update.status}</strong>
                        <small>
                          {new Date(update.updated_at).toLocaleString("en-PH")}
                        </small>
                      </div>
                      {update.note && <p>{update.note}</p>}
                      {update.collection_date && (
                        <p>
                          <strong>
                            {index === 0
                              ? "Collection date"
                              : "Earlier collection date"}
                            : {formatDate(update.collection_date)}
                          </strong>
                          {index === 0
                            ? " · Coordinate collection details with Fresh Phones PH."
                            : " · Check the latest update for current instructions."}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}

        {section === "schedule" && (
          <PaymentScheduleWorkspace
            schedule={schedule}
            status={recordsStatus}
            onRetry={loadRecords}
          />
        )}

        {section === "payments" && (
          <VerifiedPaymentsWorkspace
            membershipId={me?.client_id == null ? null : String(me.client_id)}
            summary={summary}
            payments={payments}
            pagination={paymentPagination}
            loading={paymentsLoading}
            status={recordsStatus}
            pendingPayments={pendingPayments}
            pendingStatus={pendingStatus}
            onPageChange={(page) => {
              setPaymentsLoading(true);

              setPaymentPage(page);
            }}
            onRetry={loadRecords}
            onRetryPending={loadPending}
          />
        )}

        {section === "documents" && (
          <section
            className={`${styles.sectionCard} ${styles.support}`}
            aria-label="Documents"
          >
            <DocumentChecklist />
          </section>
        )}

        {section === "notifications" && (
          <PortalNotificationsWorkspace
            {...portalNotificationsWorkspaceProps}
          />
        )}

        {section === "support" && (
          <PortalSupportWorkspace {...portalSupportWorkspaceProps} />
        )}

        {section === "settings" && (
          <PortalSettingsWorkspace {...portalSettingsWorkspaceProps} />
        )}

        {(section === "overview" ||
          section === "schedule" ||
          section === "payments") && (
          <p className={styles.note}>
            <Info weight="fill" aria-hidden="true" /> Payments are coordinated
            in Messenger. This portal shows Finance-verified records and your
            derived balance.
          </p>
        )}
      </div>
      <nav
        className={styles.mobileBottomNav}
        aria-label="Mobile customer navigation"
      >
        {mobileNav.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.id === "overview" ? "/portal" : `/portal/${item.id}`}
              className={`${styles.mobileNavItem} ${section === item.id ? styles.mobileNavActive : ""}`}
              data-customer-tour-mobile={item.id}
              aria-current={section === item.id ? "page" : undefined}
            >
              <Icon
                weight={section === item.id ? "fill" : "regular"}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          ref={moreTriggerRef}
          type="button"
          className={`${styles.mobileNavItem} ${
            !mobileNav.some((item) => {
              return item.id === section;
            })
              ? styles.mobileNavActive
              : ""
          }`}
          data-customer-tour-mobile="more"
          aria-label="More customer pages"
          aria-controls="customer-more-sheet"
          aria-expanded={moreOpen}
          onClick={() => {
            return setMoreOpen(true);
          }}
        >
          <SquaresFour
            weight={
              !mobileNav.some((item) => {
                return item.id === section;
              })
                ? "fill"
                : "regular"
            }
            aria-hidden="true"
          />
          <span>More</span>
        </button>
      </nav>
      {moreOpen && <PortalMoreSheet {...portalMoreSheetProps} />}
      {customerTourOverlay}
    </main>
  );
}
