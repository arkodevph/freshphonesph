import styles from "./portal.module.css";
import { DashboardNextStepsSkeleton } from "./DashboardNextSteps";
import { PaymentOverviewSkeleton } from "./PaymentOverview";
import { PaymentScheduleSkeleton } from "./PaymentScheduleWorkspace";
import { VerifiedPaymentsSkeleton } from "./VerifiedPaymentsWorkspace";

type Section = "overview" | "membership" | "schedule" | "payments" | "documents" | "release" | "notifications" | "support" | "settings";

const titles: Record<Section, string> = {
  overview: "Dashboard", membership: "My membership", schedule: "Payment schedule",
  payments: "Verified payments", documents: "My documents", release: "Release status",
  notifications: "Notifications", support: "Support", settings: "Settings",
};

function Bar({ width = "100%", height = 14 }: { width?: string; height?: number }) {
  return <span className={styles.skeletonBar} style={{ width, height }} />;
}

function Card({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return <div className={`${styles.sectionCard} ${styles.skeletonCard} ${className}`}>
    <div className={styles.skeletonHeading}><Bar width="40px" height={40} /><div><Bar width="88px" height={10} /><Bar width="180px" height={20} /></div></div>
    <PortalLoadingRows rows={rows} label="Loading section" quiet />
  </div>;
}

function MembershipPlaceholder() {
  return <div className={`${styles.membership} ${styles.membershipDashboard} ${styles.skeletonMembership}`}><div className={styles.skeletonCardTop}><Bar width="44px" height={44} /><Bar width="72px" height={28} /></div><div className={styles.skeletonMembershipCopy}><Bar width="110px" height={12} /><Bar width="70%" height={29} /><Bar width="140px" height={27} /></div></div>;
}

export function PortalLoadingRows({ rows = 3, label = "Loading records", quiet = false }: { rows?: number; label?: string; quiet?: boolean }) {
  return <div className={styles.skeletonRows} role={quiet ? undefined : "status"} aria-label={quiet ? undefined : label}>
    {!quiet && <span className={styles.skeletonSrOnly}>{label}</span>}
    <div aria-hidden="true">{Array.from({ length: rows }, (_, index) => <div className={styles.skeletonRow} key={index}>
      <Bar width="36px" height={36} />
      <span className={styles.skeletonRowText}><Bar width={index % 2 ? "56%" : "72%"} height={14} /><Bar width={index % 2 ? "78%" : "48%"} height={11} /></span>
      <Bar width="64px" height={22} />
    </div>)}</div>
  </div>;
}

export default function PortalSkeleton({ section = "overview" }: { section?: Section }) {
  const showMembershipWorkspace = section === "overview" || section === "membership";
  return <main className={`${styles.shell} ${styles.skeletonShell} portal-shell`} role="status" aria-label={`Loading ${titles[section]}`}>
    <span className={styles.skeletonSrOnly}>Loading {titles[section]}…</span>
    <header className={styles.topbar} aria-hidden="true"><div className={styles.brand}><Bar width="38px" height={38} /><span className={styles.skeletonBrandText}><Bar width="120px" height={14} /><Bar width="94px" height={10} /></span></div><div className={styles.topbarActions}><Bar width="38px" height={38} /></div></header>
    <aside className={styles.sidebar} aria-hidden="true">
      <div className={styles.sidebarNav}>
        <Bar width="84px" height={10} />
        {Array.from({ length: 5 }, (_, index) => <div className={styles.skeletonNavRow} key={index}><Bar width="18px" height={18} /><Bar width={index % 2 ? "104px" : "120px"} height={13} /></div>)}
        <Bar width="72px" height={10} />
        {Array.from({ length: 3 }, (_, index) => <div className={styles.skeletonNavRow} key={index}><Bar width="18px" height={18} /><Bar width="112px" height={13} /></div>)}
      </div>
      <div className={styles.sidebarFooter}><div className={styles.skeletonNavRow}><Bar width="18px" height={18} /><Bar width="124px" height={14} /></div></div>
    </aside>
    <div className={styles.container}>
      <div className={styles.intro} aria-hidden="true"><div className={`${styles.introCopy} ${styles.skeletonIntroText}`}><Bar width="min(96px, 100%)" height={12} /><Bar width="min(160px, 100%)" height={27} />{section !== "overview" && <Bar width="100%" height={13} />}</div><div className={styles.mobileTopActions}>{Array.from({ length: 3 }, (_, index) => <Bar width="32px" height={36} key={index} />)}</div></div>
      <div aria-hidden="true" className={styles.skeletonContent}>
        {showMembershipWorkspace && <div className={styles.dashboardLayout}><div className={styles.dashboardMain}><MembershipPlaceholder />{section === "overview" ? <DashboardNextStepsSkeleton /> : <Card rows={3} className={styles.membershipDatesCard} />}</div><PaymentOverviewSkeleton /></div>}
        {section === "payments" && <VerifiedPaymentsSkeleton />}
        {section === "schedule" && <PaymentScheduleSkeleton />}
        {section === "release" && <><div className={styles.skeletonStrip}><Bar width="46px" height={46} /><div><Bar width="180px" height={18} /><Bar width="72%" height={13} /></div></div><Card rows={3} /></>}
        {(section === "documents" || section === "notifications" || section === "support" || section === "settings") && <Card rows={section === "documents" ? 4 : 3} />}
      </div>
    </div>
    <div className={styles.mobileBottomNav} aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <div className={styles.skeletonMobileNav} key={index}><Bar width="22px" height={22} /><Bar width="38px" height={9} /></div>)}</div>
  </main>;
}
