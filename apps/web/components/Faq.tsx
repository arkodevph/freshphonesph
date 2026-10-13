"use client";

import { useRef, useState } from "react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { faqs, faqTopics, filterFaqs, type FaqTopicFilter } from "@/lib/faq";
import SectionHeading from "./SectionHeading";
import styles from "./Faq.module.css";

export default function Faq() {
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<FaqTopicFilter>("all");
  const [open, setOpen] = useState<string | null>(faqs[0].id);
  const results = filterFaqs(query, topic);
  const filtered = query.length > 0 || topic !== "all";
  function clearFilters() {
    setQuery(""); setTopic("all"); setOpen(null);
    search.current?.focus({ preventScroll: true });
  }

  return <section id="faq" className="relative scroll-mt-24 px-4 py-20">
    <SectionHeading title={<>Frequently asked <span className="holo-text">questions</span></>}
      subtitle="Choose a topic or search for an answer before you join." />

    <div className={styles.content}>
      <div className={styles.searchRow} role="search" aria-label="Frequently asked questions">
        <label className={styles.searchLabel}>Search FAQs
          <span className={styles.searchField}><MagnifyingGlass aria-hidden="true" />
            <input ref={search} type="search" maxLength={100} value={query} placeholder="Try GCash, brand new or delivery"
              aria-describedby="faq-search-help" aria-controls="faq-results"
              onChange={event => { setQuery(event.target.value); setOpen(null); }} />
          </span>
        </label>
        <button type="button" className={styles.clear} disabled={!filtered} onClick={clearFilters}>Clear filters</button>
      </div>
      <p id="faq-search-help" className={styles.help}>Search questions, answers and topics.</p>
      <div className={styles.topics} role="group" aria-label="FAQ topics">
        {[{ id: "all" as const, label: "All topics" }, ...faqTopics].map(option => <button key={option.id} type="button"
          aria-pressed={topic === option.id} aria-controls="faq-results"
          onClick={() => { setTopic(option.id); setOpen(null); }}>{option.label}</button>)}
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className={styles.count}>{results.length} of {faqs.length} questions{topic !== "all" ? ` · ${faqTopics.find(option => option.id === topic)!.label}` : ""}</p>

      <div id="faq-results" className={styles.results}>
        {results.map(entry => {
          const isOpen = open === entry.id;
          const questionId = `faq-question-${entry.id}`, answerId = `faq-answer-${entry.id}`;
          return <article key={entry.id} className={`glass ${styles.card}`}>
            <h3><button id={questionId} type="button" aria-expanded={isOpen} aria-controls={answerId}
              onClick={() => setOpen(isOpen ? null : entry.id)} className={styles.question}>
              <span className="font-display">{entry.question}</span>
              <span aria-hidden="true" className={`${styles.plus} chrome ${isOpen ? styles.expanded : ""}`}><Plus weight="bold" /></span>
            </button></h3>
            <div id={answerId} role="region" aria-labelledby={questionId} hidden={!isOpen} className={styles.answer}>
              <p>{entry.answer}</p>
            </div>
          </article>;
        })}
        {results.length === 0 && <div className={`glass ${styles.empty}`}>
          <h3>No matching questions</h3>
          <p>Try another phrase or clear the filters to see every topic.</p>
          <button type="button" onClick={clearFilters}>Show all questions</button>
        </div>}
      </div>
      <p className={styles.contact}>Still need help? <a href="/support">Visit Help & Support</a>.</p>
    </div>
  </section>;
}
