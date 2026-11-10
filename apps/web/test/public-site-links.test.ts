import { test } from "node:test";
import assert from "node:assert/strict";
import { publicSiteHref } from "../lib/public-site-links";

test("public links retain the original site by default", () => {
  for (const path of [
    "/",
    "/#units",
    "/careers/apply?job=12",
    "/privacy/customer",
  ]) {
    assert.equal(publicSiteHref(path), path);
  }
});

test("V2 links preserve homepage anchors and prefilled device/job queries", () => {
  assert.equal(publicSiteHref("/", "/v2"), "/v2");

  assert.equal(publicSiteHref("/#units", "/v2"), "/v2#units");

  assert.equal(publicSiteHref("/about#verify", "/v2"), "/v2/about#verify");

  assert.equal(
    publicSiteHref("/inquire?device=iPhone%2013", "/v2"),
    "/v2/inquire?device=iPhone%2013",
  );

  assert.equal(
    publicSiteHref("/careers/apply?job=12", "/v2"),
    "/v2/careers/apply?job=12",
  );
});

test("V2 links can be reused without doubling the prefix", () => {
  for (const path of ["/v2", "/v2#faq", "/v2?preview=1", "/v2/support"]) {
    assert.equal(publicSiteHref(path, "/v2"), path);
  }
});

test("same-page anchors and external contact destinations stay unchanged", () => {
  for (const path of [
    "#contact",
    "tel:+639624791649",
    "https://m.me/FreshPhonesPh",
    "//example.com/page",
  ]) {
    assert.equal(publicSiteHref(path, "/v2"), path);
  }
});
