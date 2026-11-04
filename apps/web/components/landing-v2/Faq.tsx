"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CaretLeft, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import { faqs, faqTopics, filterFaqs, type FaqTopic } from "@/lib/faq";
import DoodleIcon, { type DoodleName } from "./DoodleIcon";
import styles from "./Faq.module.css";

const topicDetails: Record<FaqTopic, { summary: string; icon: DoodleName }> = {
  "getting-started": {
    summary: "Get to know Fresh Phones PH before you join.",
    icon: "application",
  },
  payments: {
    summary: "Understand your schedule and payment options.",
    icon: "wallet-heart",
  },
  devices: {
    summary: "Find out more about our iPhone and iPad units.",
    icon: "phone-heart",
  },
  delivery: {
    summary: "Know what comes next when your unit is ready.",
    icon: "package-check",
  },
};

export default function Faq() {
  const search = useRef<HTMLInputElement>(null);

  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const [enhanced, setEnhanced] = useState(false);

  const [query, setQuery] = useState("");

  const [topic, setTopic] = useState<FaqTopic>("getting-started");

  const [questionId, setQuestionId] = useState(faqs[0].id);

  const results = filterFaqs(query);

  useEffect(() => {
    setEnhanced(true);
  }, []);

  function selectTopic(next: FaqTopic) {
    setTopic(next);

    setQuestionId(filterFaqs(query, next)[0]?.id ?? "");
  }

  function updateSearch(value: string) {
    setQuery(value);

    const first = filterFaqs(value)[0];

    if (first) {
      setTopic(first.topic);

      setQuestionId(first.id);
    }
  }

  function clearSearch() {
    updateSearch("");

    search.current?.focus({ preventScroll: true });
  }

  function navigateTopics(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next: number;

    switch (event.key) {
      case "ArrowDown":
        next = (index + 1) % faqTopics.length;

        break;
      case "ArrowUp":
        next = (index + faqTopics.length - 1) % faqTopics.length;

        break;
      case "Home":
        next = 0;

        break;
      case "End":
        next = faqTopics.length - 1;

        break;
      default:
        return;
    }

    event.preventDefault();

    selectTopic(faqTopics[next].id);

    tabs.current[next]?.focus();
  }

  return (
    <section
      id="faq"
      className={`landing-content-section ${styles.section}`}
      aria-labelledby="faq-heading"
    >
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>Frequently asked questions</p>
          <h2 id="faq-heading">
            Got questions?
            <br />
            We&apos;ve got answers.
          </h2>
        </div>
        <div className={styles.aside}>
          <span className={styles.introIcon}>
            <DoodleIcon name="chat-heart" size={44} />
          </span>
          <p>
            Get to know our units, payment schedules and how to get started.
          </p>
        </div>
      </header>

      <div className={styles.layout} hidden={!enhanced}>
        <div
          className={styles.topics}
          role="tablist"
          aria-label="FAQ topics"
          aria-orientation="vertical"
        >
          {faqTopics.map((option, index) => {
            const selected = topic === option.id;

            const detail = topicDetails[option.id];

            return (
              <button
                key={option.id}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                id={`faq-topic-${option.id}`}
                type="button"
                role="tab"
                aria-label={option.label}
                aria-selected={selected}
                aria-controls={`faq-panel-${option.id}`}
                tabIndex={selected ? 0 : -1}
                className={styles.topic}
                onClick={() => {
                  selectTopic(option.id);
                }}
                onKeyDown={(event) => {
                  navigateTopics(event, index);
                }}
              >
                <span className={styles.topicIcon}>
                  <DoodleIcon name={detail.icon} size={40} />
                </span>
                <span>
                  <span className={styles.topicTitle}>{option.label}</span>
                  <span className={styles.topicSummary}>{detail.summary}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div id="faq-panels" className={styles.panels}>
          {faqTopics.map((option, index) => {
            const entries = filterFaqs(query, option.id);

            const entry =
              entries.find((item) => {
                return item.id === questionId;
              }) ?? entries[0];

            const questionIndex = entries.indexOf(entry);

            return (
              <div
                key={option.id}
                id={`faq-panel-${option.id}`}
                role="tabpanel"
                aria-labelledby={`faq-topic-${option.id}`}
                tabIndex={0}
                hidden={topic !== option.id}
                className={styles.panel}
              >
                <p className={styles.category}>
                  {String(index + 1).padStart(2, "0")} / {option.label}
                </p>
                {entry ? (
                  <>
                    <div
                      key={entry.id}
                      className={styles.answerCopy}
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <h3>{entry.question}</h3>
                      <p>{entry.answer}</p>
                    </div>
                    {entries.length > 1 && (
                      <div className={styles.questionNav}>
                        <p>
                          Question {questionIndex + 1} of {entries.length}
                        </p>
                        <div>
                          <button
                            type="button"
                            aria-label="Previous question"
                            disabled={questionIndex === 0}
                            onClick={() => {
                              setQuestionId(entries[questionIndex - 1].id);
                            }}
                          >
                            <CaretLeft size={20} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label="Next question"
                            disabled={questionIndex === entries.length - 1}
                            onClick={() => {
                              setQuestionId(entries[questionIndex + 1].id);
                            }}
                          >
                            <CaretRight size={20} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.empty}>
                    <h3>No matching questions</h3>
                    <p>
                      {results.length > 0
                        ? "Try another topic to see the matching answers, or clear your search."
                        : "Try another phrase or clear your search to see every question."}
                    </p>
                    <button type="button" onClick={clearSearch}>
                      Show all questions
                    </button>
                  </div>
                )}
                <div className={styles.panelFooter}>
                  <p>
                    Real people. Clear answers.
                    <br />
                    From application to release.
                  </p>
                  <a href="/support" className={styles.contact}>
                    <DoodleIcon name="chat-heart" size={24} />
                    Let&apos;s talk
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.utilities} hidden={!enhanced}>
        <a href="/support" className={styles.helpIntro}>
          <span className={styles.helpIcon}>
            <DoodleIcon name="chat-heart" size={32} />
          </span>
          <span>
            <strong>Prefer a conversation?</strong>
            <span>Our team can help you get started.</span>
          </span>
        </a>
        <div className={styles.search} hidden={!enhanced} role="search">
          <label htmlFor="faq-search">Search FAQs</label>
          <div className={styles.searchField}>
            <MagnifyingGlass size={20} aria-hidden="true" />
            <input
              id="faq-search"
              ref={search}
              type="search"
              maxLength={100}
              value={query}
              placeholder="Try GCash, brand new or delivery"
              aria-describedby="faq-search-status"
              aria-controls="faq-panels"
              onChange={(event) => {
                updateSearch(event.target.value);
              }}
            />
            {query && (
              <button type="button" onClick={clearSearch}>
                Clear
              </button>
            )}
          </div>
          <p id="faq-search-status" role="status" aria-live="polite">
            {query
              ? `${results.length} matching ${results.length === 1 ? "answer" : "answers"} across all topics`
              : `${faqs.length} questions. Choose a topic or search.`}
          </p>
        </div>
      </div>

      <div className={styles.fallback} hidden={enhanced}>
        {faqs.map((entry) => {
          return (
            <details key={entry.id}>
              <summary>{entry.question}</summary>
              <p>{entry.answer}</p>
            </details>
          );
        })}
        <p>
          Still need help? <a href="/support">Visit Help &amp; Support</a>.
        </p>
      </div>
    </section>
  );
}
