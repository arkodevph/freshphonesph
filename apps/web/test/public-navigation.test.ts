import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPageNavigation,
  publicNavigationKind,
} from "../lib/public-navigation";

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
