import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPageNavigation,
  publicNavigationKind,
  publicPreviewHref,
} from "../lib/public-navigation";

test("Mobile View keeps same-origin routing instead of rewriting internal clicks into reloads", () => {
  for (const mode of [
    "mv-ios-v1",
    "mv-android-v1",
    "mv-ios-tablet-v1",
    "mv-android-tablet-v1",
    "mv-desktop-v1",
  ]) {
    const current = `http://localhost:3001/about?_mvua=${mode}`;

    const href = publicPreviewHref(
      current,
      "/inquire?device=iPhone%2012#details",
    );

    const next = new URL(href!, current);

    assert.equal(next.pathname, "/inquire");

    assert.equal(next.searchParams.get("device"), "iPhone 12");

    assert.equal(next.searchParams.get("_mvua"), mode);

    assert.equal(next.hash, "#details");

    assert.equal(publicPreviewHref(current, href), href);

    assert.equal(publicNavigationKind(current, href!), "page");
  }
});

test("preview routing retains same-page anchors, relative query changes and replaceable device tags", () => {
  const current = "https://fresh.test/inquire?_mvua=mv-android-v1";

  assert.equal(publicPreviewHref(current, "#details"), "#details");

  const same = publicPreviewHref(current, "/inquire#details");

  assert.equal(publicNavigationKind(current, same!), "same-page");

  assert.equal(
    publicPreviewHref("https://fresh.test/?_mvua=mv-android-v1#units", "/#how"),
    "#how",
  );

  const query = new URL(publicPreviewHref(current, "?device=iPad")!, current);

  assert.equal(query.pathname, "/inquire");

  assert.equal(query.searchParams.get("device"), "iPad");

  assert.equal(query.searchParams.get("_mvua"), "mv-android-v1");

  const replaced = new URL(
    publicPreviewHref(current, "/about?_mvua=mv-ios-v1")!,
    current,
  );

  assert.deepEqual(replaced.searchParams.getAll("_mvua"), ["mv-android-v1"]);
});

test("ordinary and external links do not acquire simulator metadata", () => {
  for (const current of [
    "https://fresh.test/about",
    "https://fresh.test/about?_mvua=unknown",
    "not a URL",
  ]) {
    assert.equal(publicPreviewHref(current, "/support"), "/support");
  }

  for (const href of [
    "https://external.test/about?device=phone",
    "mailto:hello@example.test",
    "tel:+639000000000",
    "http://[",
    undefined,
    "",
  ]) {
    assert.equal(
      publicPreviewHref("https://fresh.test/about?_mvua=mv-ios-v1", href),
      href,
    );
  }
});

test("public page and system links begin loading feedback", () => {
  for (const path of [
    "/about",
    "/inquire",
    "/careers",
    "/support",
    "/enroll",
    "/login",
  ]) {
    assert.equal(isPageNavigation("http://localhost:3001/", path), true);
  }

  assert.equal(
    isPageNavigation(
      "http://localhost:3001/about",
      "http://localhost:3000/login",
    ),
    true,
  );
});

test("staying on the current page can cancel feedback without treating contacts as navigation", () => {
  assert.equal(
    publicNavigationKind("https://fresh.test/about", "/about"),
    "same-page",
  );

  assert.equal(
    publicNavigationKind("https://fresh.test/#units", "#how"),
    "same-page",
  );

  assert.equal(
    publicNavigationKind("https://fresh.test/", "mailto:hello@example.test"),
    null,
  );

  assert.equal(publicNavigationKind("https://fresh.test/", "http://["), null);
});

test("hash changes and an already selected page keep the page interactive", () => {
  for (const path of ["/", "/#units", "/#how", "/#top"]) {
    assert.equal(isPageNavigation("http://localhost:3001/#faq", path), false);
  }

  assert.equal(isPageNavigation("https://fresh.test/about", "/about"), false);

  assert.equal(isPageNavigation("https://fresh.test/about", "/#units"), true);
});

test("search changes are page navigation and hash-only query links are not", () => {
  assert.equal(
    isPageNavigation("https://fresh.test/inquire?device=a", "?device=b"),
    true,
  );

  assert.equal(
    isPageNavigation("https://fresh.test/inquire?device=a", "#details"),
    false,
  );
});

test("contact, downloads with non-web protocols and malformed URLs do not start a page loader", () => {
  for (const href of [
    "mailto:hello@example.test",
    "tel:+639000000000",
    "javascript:void(0)",
    "data:text/plain,test",
    "http://[",
  ]) {
    assert.equal(isPageNavigation("https://fresh.test/", href), false);
  }
});
