import type { Metadata } from "next";
import Link from "next/link";
import { ChatCircleText, ClockCounterClockwise, MessengerLogo, Phone, ArrowRight, Question } from "@phosphor-icons/react/dist/ssr";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import styles from "./support.module.css";

export const metadata: Metadata = {
  title: "Help & Support · Fresh Phones PH",
  description: "Start a customer support request, follow an existing concern, or contact Fresh Phones PH for help with an offer or portal access.",
};

export default function PublicSupportPage() {
  return <>
    <Navbar />
    <main id="top" className={styles.page}>
      <header className={styles.heading}><p>Fresh Phones PH customer care</p><h1>How can we <span className="holo-text">help you?</span></h1><p>Get help with your account, payments or device. Choose where you’d like to start.</p></header>
      <section className={styles.portal} aria-labelledby="customer-support-title">
        <div className={styles.sectionHeading}><h2 id="customer-support-title">Already a customer?</h2><p>Use the account provided by Fresh Phones PH. If you’re signed out, we’ll ask you to sign in and bring you back to Support.</p></div>
        <div className={styles.cards}>
          <article className={`glass ${styles.card}`}><ChatCircleText className={styles.icon} weight="duotone" aria-hidden="true" /><h3>Start a request</h3><p>Tell Customer Service about a payment, device or account concern. Your request and replies stay together in your portal.</p><Link className={styles.primary} href="/portal/support#new-request" prefetch={false}>Start a support request <ArrowRight aria-hidden="true" /></Link></article>
          <article className={`glass ${styles.card}`}><ClockCounterClockwise className={styles.icon} weight="duotone" aria-hidden="true" /><h3>Follow an existing request</h3><p>Check your request’s status, read the team’s response and send more details in the same conversation.</p><Link className={styles.secondary} href="/portal/support#request-history" prefetch={false}>View my requests <ArrowRight aria-hidden="true" /></Link></article>
        </div>
      </section>
      <section id="contact" className={styles.contact} aria-labelledby="contact-support-title">
        <div><p className={styles.eyebrow}>Talk to the team</p><h2 id="contact-support-title">No portal account, or trouble signing in?</h2><p>Ask about joining, an offer or getting access to your customer account through our existing contact channels.</p></div>
        <div className={styles.contactActions}>
          <a href="https://m.me/FreshPhonesPh" target="_blank" rel="noopener noreferrer"><MessengerLogo weight="fill" aria-hidden="true" /><span>Message Fresh Phones PH<small>Opens Messenger in a new tab</small></span><ArrowRight aria-hidden="true" /></a>
          <a href="tel:+639624791649"><Phone weight="fill" aria-hidden="true" /><span>Call 0962 479 1649<small>Use your phone’s calling app</small></span><ArrowRight aria-hidden="true" /></a>
          <a className={styles.facebook} href="https://web.facebook.com/FreshPhonesPh" target="_blank" rel="noopener noreferrer">Visit our Facebook page <span>(new tab)</span></a>
        </div>
      </section>
      <aside className={styles.faq}><Question weight="duotone" aria-hidden="true" /><div><h2>Looking for a quick answer?</h2><p>Search our FAQs by topic for payment options, devices and delivery.</p></div><Link href="/#faq">Search FAQs <ArrowRight aria-hidden="true" /></Link></aside>
    </main>
    <Footer />
  </>;
}
