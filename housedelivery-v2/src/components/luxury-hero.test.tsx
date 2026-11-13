import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { LuxuryHero } from "@/components/luxury-hero";

test("homepage hero serves its architectural image and core navigation before video eligibility is known", () => {
  const markup = renderToStaticMarkup(
    <LuxuryHero image="/hero-fallback.jpg" />,
  );

  assert.match(markup, /src="\/hero-fallback\.jpg"/);
  assert.match(markup, /loading="eager"/);
  assert.match(markup, /fetchPriority="high"/);
  assert.match(markup, /Architecture\./);
  assert.match(markup, /Delivered\./);
  assert.match(markup, /href="#models"/);
  assert.match(markup, /href="\/plan-a-housing-project"/);
  // Video is enabled after hydration only for eligible desktop motion settings.
  // The initial page and no-JS fallback must not depend on media playback.
  assert.doesNotMatch(markup, /<video|<iframe|player\.vimeo\.com/);
});
