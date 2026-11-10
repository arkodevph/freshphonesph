"use client";

import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  ArrowClockwise,
  Clock,
  MagnifyingGlass,
  MapPin,
  X,
} from "@phosphor-icons/react";
import DoodleIcon from "@/components/DoodleIcon";
import Link from "@/components/PublicNavigationLink";
import { publicSiteHref, type PublicSiteBase } from "@/lib/public-site-links";
import { useCareersBoard } from "./useCareersBoard";
import CareersPreparation from "./CareersPreparation";
import styles from "./CareersBoard.module.css";

export default function CareersBoard({
  siteBasePath = "",
}: {
  siteBasePath?: PublicSiteBase;
}) {
  const board = useCareersBoard();

  return (
    <div className={styles.boardPage} data-careers-page>
      <div className={styles.boardShell}>
        <header className={styles.boardHeader}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>
              <DoodleIcon name="id-heart" /> CAREERS AT FRESH PHONES PH
            </p>
            <h1>
              Your next chapter,
              <br />
              <span>a little fresher.</span>
            </h1>
            <p className={styles.intro}>
              Help make iPhone and iPad ownership more manageable. Find your
              place on the Fresh Phones team.
            </p>
            <div className={styles.heroActions}>
              <Link href="#open-roles" className={styles.primaryAction}>
                Browse open roles <ArrowDown weight="bold" aria-hidden="true" />
              </Link>
              <Link
                href={publicSiteHref("/about", siteBasePath)}
                className={styles.textAction}
              >
                Get to know us <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.artHalo} />
            <Image
              src="/brand/mascot/cloud-boy-meet-team-v1.png"
              alt=""
              width={1280}
              height={1254}
              sizes="(max-width: 700px) 200px, (max-width: 1000px) 320px, 440px"
              priority
              className={styles.mascot}
            />
            <span className={styles.artNote}>
              <DoodleIcon name="heart" size={24} /> Fresh faces welcome.
            </span>
          </div>
        </header>

        <div className={styles.reviewNote}>
          <DoodleIcon name="shield-heart" size={32} />
          <p>
            <strong>A person behind every application.</strong>
            <span>Our recruitment team reviews your experience.</span>
          </p>
        </div>

        <section
          id="open-roles"
          tabIndex={-1}
          className={styles.openings}
          aria-labelledby="openings-heading"
        >
          <div className={styles.openingsHeading}>
            <div>
              <p className={styles.sectionLabel}>
                <DoodleIcon name="application" size={25} /> FIND YOUR FIT
              </p>
              <h2 id="openings-heading">A fresh opportunity.</h2>
              <p>Explore our current openings.</p>
            </div>
            {board.loadState === "ready" && board.jobs.length > 0 && (
              <span className={styles.roleCount}>
                {board.jobs.length} open{" "}
                {board.jobs.length === 1 ? "role" : "roles"}
              </span>
            )}
          </div>

          {board.loadState === "ready" && board.jobs.length > 0 && (
            <div
              className={styles.filters}
              role="search"
              aria-label="Filter open roles"
            >
              <label className={styles.searchField}>
                <span>Search roles</span>
                <span className={styles.inputWrap}>
                  <MagnifyingGlass aria-hidden="true" />
                  <input
                    type="search"
                    value={board.query}
                    onChange={(event) => {
                      return board.setQuery(event.target.value);
                    }}
                    placeholder="Role or keyword"
                    aria-controls="careers-results"
                  />
                </span>
              </label>
              <label>
                <span>Employment type</span>
                <select
                  value={board.type}
                  onChange={(event) => {
                    return board.setType(event.target.value);
                  }}
                  aria-controls="careers-results"
                >
                  <option value="all">All types</option>
                  {board.types.map((item) => {
                    return (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                <span>Location</span>
                <select
                  value={board.location}
                  onChange={(event) => {
                    return board.setLocation(event.target.value);
                  }}
                  aria-controls="careers-results"
                >
                  <option value="all">All locations</option>
                  {board.locations.map((item) => {
                    return (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          )}

          <div className={styles.resultsBar}>
            <p role="status" aria-live="polite" aria-atomic="true">
              {board.status}
            </p>
            {board.hasFilters && (
              <button type="button" onClick={board.clearFilters}>
                Clear filters <X aria-hidden="true" />
              </button>
            )}
          </div>

          <div id="careers-results" aria-busy={board.loadState === "loading"}>
            {board.loadState === "loading" && (
              <div className={styles.loadingGrid} aria-hidden="true">
                {[0, 1].map((item) => {
                  return (
                    <div key={item}>
                      <span />
                      <span />
                      <span />
                    </div>
                  );
                })}
              </div>
            )}

            {board.loadState === "error" && (
              <div className={styles.stateMessage} role="alert">
                <DoodleIcon name="chat-heart" size={56} />
                <h3>A small bump in the road.</h3>
                <p>
                  We couldn’t load the openings. Check your connection and give
                  it another try.
                </p>
                <button
                  className={styles.secondaryAction}
                  type="button"
                  onClick={board.loadJobs}
                >
                  <ArrowClockwise aria-hidden="true" /> Try again
                </button>
              </div>
            )}

            {board.loadState === "ready" && board.jobs.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyArt} aria-hidden="true">
                  <DoodleIcon name="calendar-heart" size={84} />
                  <span>GOOD THINGS TAKE A LITTLE TIME</span>
                </div>
                <div>
                  <h3>
                    Our next opening
                    <br />
                    is still on the way.
                  </h3>
                  <p>
                    There are no open roles right now. Check back here for new
                    opportunities — we’d love for you to find your fit.
                  </p>
                  <Link
                    href={publicSiteHref("/about", siteBasePath)}
                    className={styles.secondaryAction}
                  >
                    Meet Fresh Phones <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}

            {board.loadState === "ready" &&
              board.jobs.length > 0 &&
              board.filteredJobs.length === 0 && (
                <div className={styles.stateMessage}>
                  <MagnifyingGlass size={40} aria-hidden="true" />
                  <h3>Let’s widen the search.</h3>
                  <p>
                    No roles match these filters. Try another keyword or clear
                    your filters to see all openings.
                  </p>
                  <button
                    className={styles.secondaryAction}
                    type="button"
                    onClick={board.clearFilters}
                  >
                    Show all roles <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              )}

            {board.loadState === "ready" && board.filteredJobs.length > 0 && (
              <div className={styles.jobGrid}>
                {board.filteredJobs.map((job) => {
                  return (
                    <article key={job.id} className={styles.jobCard}>
                      <div className={styles.companyLine}>
                        <DoodleIcon name="id-heart" size={36} />
                        <span>Fresh Phones PH</span>
                        <span className={styles.openBadge}>Open role</span>
                      </div>
                      <h3>{job.title}</h3>
                      <div className={styles.meta}>
                        {job.employment_type && (
                          <span>
                            <Clock aria-hidden="true" />
                            {job.employment_type}
                          </span>
                        )}
                        {job.location && (
                          <span>
                            <MapPin aria-hidden="true" />
                            {job.location}
                          </span>
                        )}
                      </div>
                      {job.description && (
                        <p className={styles.description}>{job.description}</p>
                      )}
                      <Link
                        className={styles.jobApply}
                        href={publicSiteHref(
                          `/careers/apply?job=${encodeURIComponent(String(job.id))}`,
                          siteBasePath,
                        )}
                        aria-label={`Apply for ${job.title}`}
                      >
                        <span>Explore &amp; apply</span>{" "}
                        <ArrowRight weight="bold" aria-hidden="true" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <noscript>
            <div className={styles.stateMessage}>
              <h3>Let’s get you connected.</h3>
              <p>
                Enable JavaScript to see current roles, or contact the team for
                help.
              </p>
              <Link
                href={publicSiteHref("/support#contact", siteBasePath)}
                className={styles.secondaryAction}
              >
                Talk to the team
              </Link>
            </div>
          </noscript>
        </section>

        <section
          className={styles.preparation}
          aria-labelledby="prepare-heading"
        >
          <div className={styles.preparationHeading}>
            <p className={styles.sectionLabel}>ONE STEP AT A TIME</p>
            <h2 id="prepare-heading">From hello to what’s next.</h2>
            <p>Here’s how to get started when a role catches your eye.</p>
          </div>
          <CareersPreparation />
        </section>
        <div className={styles.contactNote}>
          <p>A question before you apply?</p>
          <Link
            href={publicSiteHref("/support#contact", siteBasePath)}
            className={styles.contactPill}
          >
            <DoodleIcon name="chat-heart" size={24} />
            <span>Talk to the team</span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
