import Link from "@/components/PublicNavigationLink";
import Image from "next/image";
import type { LegalDocument } from "@freshphones/contracts";
import { publicSiteHref, type PublicSiteBase } from "@/lib/public-site-links";
import { systemHref } from "@/lib/site-links";
import styles from "./legal-document.module.css";
import workspaceStyles from "./workspace-legal-document.module.css";
import portal from "@/app/portal/portal.module.css";
import glass from "@/app/portal/portal-glass.module.css";

export function LegalDocumentPage({
  document,
  siteBasePath = "",
  appearance = "public",
}: {
  document: LegalDocument;
  siteBasePath?: PublicSiteBase;
  appearance?: "public" | "workspace";
}) {
  const workspace = appearance === "workspace";

  const workspaceHref = workspace ? systemHref("/system") : null;

  const ui = workspace ? workspaceStyles : styles;

  const Root = workspace ? "div" : "main";

  const Content = workspace ? "main" : "div";

  return (
    <Root
      className={
        workspace
          ? `${portal.shell} ${portal.macDashboard} ${glass.material} ${glass.interactions} ${ui.page}`
          : ui.page
      }
      data-glass-portal={workspace ? "" : undefined}
      data-workspace-notice={workspace ? "" : undefined}
    >
      {workspace && (
        <header className={ui.topbar} data-portal-material="toolbar">
          <div className={ui.topbarInner}>
            <Link className={ui.brand} href={publicSiteHref("/", siteBasePath)}>
              <Image
                src="/brand/fresh-phones-logo.png"
                alt=""
                width={40}
                height={40}
              />
              <span>
                <strong>Fresh Phones</strong>
                <small>Privacy and terms</small>
              </span>
            </Link>
            <div className={ui.topbarActions}>
              {workspaceHref && (
                <Link
                  className={`${ui.back} ${ui.workspaceLink}`}
                  href={workspaceHref}
                  prefetch={false}
                >
                  Return to workspace
                </Link>
              )}
              <Link
                className={ui.back}
                href={publicSiteHref("/privacy", siteBasePath)}
              >
                Privacy and terms
              </Link>
            </div>
          </div>
        </header>
      )}
      <Content className={ui.shell}>
        {!workspace && (
          <Link
            className={ui.back}
            href={publicSiteHref("/privacy", siteBasePath)}
          >
            ← Privacy and terms
          </Link>
        )}
        <header
          className={ui.header}
          data-portal-material={workspace ? "card" : undefined}
        >
          <div className={workspace ? ui.headerCopy : undefined}>
            <span className={ui.eyebrow}>
              Fresh Phones PH · {document.audience}
            </span>
            <h1>{document.title}</h1>
            <p>
              Version {document.version}
              {document.status === "PUBLISHED" && document.publishedAt
                ? ` · Effective ${new Date(document.publishedAt).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}`
                : ""}
            </p>
          </div>
          {workspace && (
            <div className={ui.mascot} aria-hidden="true">
              <Image
                src="/brand/mascot/cloud-boy-guidance-v1.png"
                alt=""
                width={1254}
                height={1254}
                sizes="(max-width: 600px) 160px, (max-width: 900px) 220px, 280px"
                priority
              />
            </div>
          )}
        </header>
        {document.status === "DRAFT" && (
          <section className={ui.draft} aria-label="Unapproved draft">
            <strong>Draft for business and legal review</strong>
            <p>
              This wording has not been approved by Fresh Phones PH. It is shown
              so the business can review the proposed notice. No acceptance is
              requested for this draft.
            </p>
          </section>
        )}
        <div className={workspace ? ui.body : undefined}>
          {workspace && (
            <nav
              className={ui.contents}
              aria-label="Notice sections"
              data-portal-material="card"
            >
              <p>On this page</p>
              <ol>
                {document.sections.map((section, index) => {
                  return (
                    <li key={section.heading}>
                      <a href={`#notice-section-${index + 1}`}>
                        {section.heading}
                      </a>
                    </li>
                  );
                })}
                {document.status === "DRAFT" && (
                  <li>
                    <a href="#notice-review">Business decisions needed</a>
                  </li>
                )}
              </ol>
            </nav>
          )}
          <div className={workspace ? ui.reading : undefined}>
            <div className={ui.sections}>
              {document.sections.map((section, index) => {
                return (
                  <section
                    key={section.heading}
                    id={workspace ? `notice-section-${index + 1}` : undefined}
                    tabIndex={workspace ? -1 : undefined}
                    data-portal-material={workspace ? "card" : undefined}
                  >
                    <h2>{section.heading}</h2>
                    {section.paragraphs.map((paragraph) => {
                      return <p key={paragraph}>{paragraph}</p>;
                    })}
                  </section>
                );
              })}
            </div>
            {document.status === "DRAFT" && (
              <section
                className={ui.review}
                aria-label="Business decisions needed"
                id={workspace ? "notice-review" : undefined}
                tabIndex={workspace ? -1 : undefined}
              >
                <h2>Business decisions needed before publication</h2>
                <ul>
                  {document.reviewItems.map((item) => {
                    return <li key={item}>{item}</li>;
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
        <footer className={ui.footer}>
          <Link href={publicSiteHref("/privacy", siteBasePath)}>
            All notices
          </Link>
          <Link href={publicSiteHref("/support", siteBasePath)}>
            Contact Fresh Phones PH
          </Link>
        </footer>
      </Content>
    </Root>
  );
}
