import styles from "./financial-document.module.css";

function Bar({ width, height }: { width: string; height: number }) {
  return <span className={styles.skeletonBar} style={{ width, height }} />;
}

export default function DocumentSheetSkeleton() {
  return <article className={`${styles.sheet} ${styles.documentSkeleton}`} role="status" aria-label="Loading your account document">
    <span className={styles.skeletonSrOnly}>Loading your account document…</span>
    <div aria-hidden="true">
      <div className={styles.skeletonDocumentHeader}><Bar width="145px" height={22} /><Bar width="100px" height={12} /><Bar width="min(340px, 90%)" height={34} /><Bar width="220px" height={12} /></div>
      <div className={styles.skeletonDocumentGrid}>{Array.from({ length: 3 }, (_, index) => <div key={index}><Bar width="65px" height={11} /><Bar width={index === 2 ? "78%" : "62%"} height={18} /></div>)}</div>
      <Bar width="160px" height={21} />
      <div className={styles.skeletonDocumentGrid}>{Array.from({ length: 3 }, (_, index) => <div key={index}><Bar width="90px" height={11} /><Bar width={index === 2 ? "72%" : "58%"} height={18} /></div>)}</div>
      <Bar width="180px" height={21} />
      {Array.from({ length: 3 }, (_, index) => <div className={styles.skeletonDocumentRow} key={index}><Bar width="25%" height={14} /><Bar width="38%" height={14} /><Bar width="20%" height={14} /></div>)}
    </div>
  </article>;
}
