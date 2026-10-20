import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import WarrantyPage from "@/app/warranty/page";
import { SiteFooter } from "@/components/site-footer";

test("warranty page publishes the approved support scope and destinations", () => {
  const markup = renderToStaticMarkup(<WarrantyPage />);

  assert.match(markup, /Warranty &amp;<br\/><span[^>]*>After-Sales Support\.<\/span>/);
  assert.match(markup, /Confidence after delivery/);
  assert.match(markup, /You should not have to chase multiple factories/);
  assert.match(markup, /If we supplied it/);
  assert.match(markup, /mailto:hello@housedelivery\.ca/);
  assert.match(markup, /Planning a new project\?/);
  assert.match(markup, /href="\/#models"/);
  assert.match(markup, /Local construction and installation warranties/);
});

test("warranty page does not publish unconfirmed or blanket coverage claims", () => {
  const markup = renderToStaticMarkup(<WarrantyPage />);

  assert.doesNotMatch(markup, /DeepBlue/i);
  assert.doesNotMatch(markup, /(?:10|15)[ -]year/i);
  assert.doesNotMatch(markup, /guarantee every issue/i);
  assert.doesNotMatch(markup, /general contractor/i);
});

test("site footer links to Warranty & Support without changing primary navigation", () => {
  const markup = renderToStaticMarkup(<SiteFooter />);

  assert.match(markup, /href="\/warranty"/);
  assert.match(markup, /Warranty &amp; Support/);
});
