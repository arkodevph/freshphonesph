import styles from "./portal.module.css";

type Section = "overview" | "membership" | "schedule" | "payments" | "documents" | "release" | "notifications" | "support" | "settings";

const titles: Record<Section, string> = {
  overview: "Dashboard", membership: "My membership", schedule: "Payment schedule",
  payments: "Verified payments", documents: "My documents", release: "Release status",
  notifications: "Notifications", support: "Support", settings: "Settings",
};

function Bar({ width = "100%", height = 14 }: { width?: string; height?: number }) {
  return <span className={styles.skeletonBar} style={{ width, height }} />;
}

function Card({ rows = 3 }: { rows?: number }) {
  return <div className={`${styles.sectionCard} ${styles.skeletonCard}`}>
    <div className={styles.skeletonHeading}><Bar width="40px" height={40} /><div><Bar width="88px" height={10} /><Bar width="180px" height={20} /></div></div>
    <PortalLoadingRows rows={rows} label="Loading section" quiet />
  </div>;
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
  const showOverview = section === "overview" || section === "membership" || section === "payments";
  return <main className={`${styles.shell} ${styles.skeletonShell} portal-shell`} role="status" aria-label={`Loading ${titles[section]}`}>
    <span className={styles.skeletonSrOnly}>Loading {titles[section]}…</span>
    <aside className={styles.sidebar} aria-hidden="true">
      <div className={styles.sidebarBrand}><Bar width="38px" height={38} /><span className={styles.skeletonBrandText}><Bar width="120px" height={14} /><Bar width="94px" height={10} /></span></div>
      <div className={styles.sidebarNav}>
        <Bar width="84px" height={10} />
        {Array.from({ length: 5 }, (_, index) => <div className={styles.skeletonNavRow} key={index}><Bar width="18px" height={18} /><Bar width={index % 2 ? "104px" : "120px"} height={13} /></div>)}
        <Bar width="72px" height={10} />
        {Array.from({ length: 3 }, (_, index) => <div className={styles.skeletonNavRow} key={index}><Bar width="18px" height={18} /><Bar width="112px" height={13} /></div>)}
      </div>
      <div className={styles.sidebarFooter}><div className={styles.skeletonNavRow}><Bar width="34px" height={34} /><Bar width="124px" height={14} /></div></div>
    </aside>
    <div className={styles.container}>
      <header className={styles.topbar} aria-hidden="true"><Bar width="32px" height={32} /><span className={styles.skeletonTopbarTitle}><Bar width="80px" height={10} /><Bar width="150px" height={18} /></span><Bar width="38px" height={38} /></header>
      <div className={styles.intro} aria-hidden="true"><div className={styles.skeletonIntroText}><Bar width="96px" height={11} /><Bar width="min(260px, 70vw)" height={27} /><Bar width="min(360px, 85vw)" height={13} /></div></div>
      <div aria-hidden="true" className={styles.skeletonContent}>
        {showOverview && <div className={`${styles.overview} ${section === "payments" ? styles.overviewSingle : ""}`}>
          {section !== "payments" && <div className={`${styles.membership} ${styles.skeletonMembership}`}><div className={styles.skeletonCardTop}><Bar width="44px" height={44} /><Bar width="72px" height={28} /></div><div className={styles.skeletonMembershipCopy}><Bar width="110px" height={12} /><Bar width="70%" height={29} /><Bar width="140px" height={27} /></div></div>}
          <div className={`${styles.balance} ${styles.skeletonBalance}`}><div className={styles.skeletonHeading}><Bar width="38px" height={38} /><Bar width="150px" height={12} /></div><Bar width="125px" height={13} /><Bar width="220px" height={34} /><Bar height={8} /><div className={styles.skeletonCardTop}><Bar width="110px" height={26} /><Bar width="110px" height={26} /></div></div>
        </div>}
        {section === "overview" && <><Card rows={2} /><div className={styles.skeletonStrip}><Bar width="46px" height={46} /><div><Bar width="160px" height={18} /><Bar width="75%" height={13} /></div></div><div className={styles.skeletonStrip}><Bar width="46px" height={46} /><div><Bar width="180px" height={18} /><Bar width="65%" height={13} /></div></div><div className={styles.detailsGrid}><Card rows={3} /><Card rows={2} /></div></>}
        {section === "membership" && <Card rows={3} />}
        {section === "schedule" && <><div className={styles.skeletonStrip}><Bar width="46px" height={46} /><div><Bar width="180px" height={18} /><Bar width="65%" height={13} /></div></div><Card rows={5} /></>}
        {section === "payments" && <><Card rows={4} /><Card rows={2} /></>}
        {section === "release" && <><div className={styles.skeletonStrip}><Bar width="46px" height={46} /><div><Bar width="180px" height={18} /><Bar width="72%" height={13} /></div></div><Card rows={3} /></>}
        {(section === "documents" || section === "notifications" || section === "support" || section === "settings") && <Card rows={section === "documents" ? 4 : 3} />}
      </div>
    </div>
    <div className={styles.mobileBottomNav} aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <div className={styles.skeletonMobileNav} key={index}><Bar width="22px" height={22} /><Bar width="38px" height={9} /></div>)}</div>
  </main>;
}
