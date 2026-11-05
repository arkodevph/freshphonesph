import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import InquiryForm from "./InquiryForm";
import DoodleIcon from "./DoodleIcon";
import PublicNavigationLink from "./PublicNavigationLink";
import { publicSiteHref, type PublicSiteBase } from "@/lib/public-site-links";
import styles from "./InquiryPage.module.css";

export default function InquiryPage({
  deviceName,
  siteBasePath = "",
}: {
  deviceName?: string;
  siteBasePath?: PublicSiteBase;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.intro} aria-labelledby="inquiry-intro-title">
          <PublicNavigationLink
            className={styles.back}
            href={publicSiteHref("/#units", siteBasePath)}
          >
            <ArrowLeft size={18} aria-hidden /> Back to devices
          </PublicNavigationLink>
          <p className={styles.eyebrow}>
            <DoodleIcon name="chat-heart" size={26} />
            YOUR NEXT DEVICE STARTS HERE
          </p>
          <h2 id="inquiry-intro-title">
            A fresh phone.
            <br />
            <span>A friendly hello.</span>
          </h2>
          <p className={styles.introCopy}>
            Have a device in mind? Let’s talk about the details, the payment
            plan, and what comes next.
          </p>
          <div className={styles.art} aria-hidden="true">
            <Image
              src="/brand/mascot/cloud-boy-guidance-v1.png"
              alt=""
              width={1280}
              height={1280}
              sizes="(min-width: 960px) 416px, 1px"
            />
          </div>
        </aside>
        <section
          className={styles.content}
          aria-labelledby="inquiry-page-title"
        >
          <div className={styles.formArea}>
            <p className={styles.formEyebrow}>LET’S FIND YOUR NEXT DEVICE</p>
            <h1 id="inquiry-page-title">Tell us what you have in mind.</h1>
            <p className={styles.subtitle}>
              Leave your details and our team will help you explore your
              options.
            </p>
            <InquiryForm deviceName={deviceName} fullPage />
          </div>
        </section>
      </div>
      <section
        className={styles.contacts}
        aria-label="Other ways to get in touch"
      >
        <a
          href="https://m.me/FreshPhonesPh"
          target="_blank"
          rel="noopener noreferrer"
        >
          <DoodleIcon name="chat-heart" size={30} />
          <span>
            <strong>Message our page</strong>
            <small>Fresh Phones PH on Messenger</small>
          </span>
          <ArrowUpRight size={20} aria-hidden />
        </a>
        <a href="tel:+639624791649">
          <DoodleIcon name="phone-heart" size={30} />
          <span>
            <strong>Give us a call</strong>
            <small>0962 479 1649</small>
          </span>
          <ArrowUpRight size={20} aria-hidden />
        </a>
        <PublicNavigationLink href={publicSiteHref("/support", siteBasePath)}>
          <DoodleIcon name="id-heart" size={30} />
          <span>
            <strong>Get help with your account</strong>
            <small>Already a customer?</small>
          </span>
          <ArrowUpRight size={20} aria-hidden />
        </PublicNavigationLink>
      </section>
    </main>
  );
}
