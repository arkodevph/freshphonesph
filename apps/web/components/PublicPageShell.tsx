import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { landingV2Font } from "./font";
import typography from "./typography.module.css";
import styles from "./PublicPageShell.module.css";
import "./landing-v2.css";

export default function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-landing-version="2"
      data-v2-public="true"
      className={`${landingV2Font.variable} ${typography.root} ${styles.shell}`}
    >
      <Navbar />
      <div className={styles.content}>{children}</div>
      <Footer />
    </div>
  );
}
