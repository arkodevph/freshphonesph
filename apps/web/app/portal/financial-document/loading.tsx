import DocumentSheetSkeleton from "./DocumentSheetSkeleton";
import styles from "./financial-document.module.css";

export default function Loading() {
  return <main className={styles.page}>
    <header className={styles.documentHeader}><div className={styles.documentHeading}><p>Fresh Phones PH</p><h1>Account document</h1></div></header>
    <DocumentSheetSkeleton />
  </main>;
}
