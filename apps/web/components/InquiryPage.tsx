import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ChatCircleDots,
  Phone,
} from "@phosphor-icons/react/dist/ssr";
import InquiryForm from "./InquiryForm";
import styles from "./InquiryPage.module.css";

export default function InquiryPage({ deviceName }: { deviceName?: string }) {
  return (
    <main className={styles.page}>
      <aside className={styles.intro} aria-label="Talk to Fresh Phones PH">
        <Link href="/" className={styles.brand}>
          <Image
            src="/brand/fresh-phones-logo.png"
            alt=""
            width={48}
            height={48}
          />
          <span>
            Fresh Phones <b>PH</b>
          </span>
        </Link>
        <div className={styles.introBody}>
          <span className={styles.eyebrow}>YOUR NEXT DEVICE STARTS HERE</span>
          <h2>
            A fresh phone.
            <br />A friendly hello.
          </h2>
          <p>
            Have a device in mind? Let’s talk about the details, the payment
            plan, and what comes next.
          </p>
          <div className={styles.contacts}>
            <a
              href="https://m.me/FreshPhonesPh"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ChatCircleDots size={24} aria-hidden />
              <span>
                <strong>Message our page</strong>
                <small>Fresh Phones PH on Messenger</small>
              </span>
              <ArrowUpRight size={20} aria-hidden />
            </a>
            <a href="tel:+639624791649">
              <Phone size={24} aria-hidden />
              <span>
                <strong>Give us a call</strong>
                <small>0962 479 1649</small>
              </span>
              <ArrowUpRight size={20} aria-hidden />
            </a>
          </div>
        </div>
        <div className={styles.introFooter}>
          <span>Already a customer?</span>
          <Link href="/support">
            Get help with your account <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
      </aside>
      <section className={styles.content} aria-labelledby="inquiry-page-title">
        <Link className={styles.back} href="/#units">
          <ArrowLeft size={18} aria-hidden /> Back to devices
        </Link>
        <div className={styles.formArea}>
          <p className={styles.formEyebrow}>LET’S FIND YOUR NEXT DEVICE</p>
          <h1 id="inquiry-page-title">
            Tell us what
            <br className={styles.desktopBreak} /> you have in mind.
          </h1>
          <p className={styles.subtitle}>
            Leave your details and our team will help you explore your options.
          </p>
          <InquiryForm deviceName={deviceName} fullPage />
        </div>
        <p className={styles.footer}>
          Fresh Phones PH <span>·</span> A real team, ready to help.
        </p>
      </section>
    </main>
  );
}
