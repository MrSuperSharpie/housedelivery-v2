import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { LuxuryHero } from "@/components/luxury-hero";

test("homepage hero serves its architectural image and core navigation before video eligibility is known", () => {
  const markup = renderToStaticMarkup(
    <LuxuryHero image="/hero-fallback.jpg" customHomeCount={18} />,
  );

  assert.match(markup, /src="\/_next\/image\?url=%2Fhero-fallback\.jpg&amp;w=\d+&amp;q=\d+"/);
  assert.match(markup, /srcSet="/);
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

test("homepage statistics reflect the supplied custom catalogue count without a delivery deadline", () => {
  for (const count of [18, 19]) {
    const markup = renderToStaticMarkup(<LuxuryHero image="/hero-fallback.jpg" customHomeCount={count} />);
    assert.ok(markup.includes(`>${count}</p>`));
    assert.match(markup, /Custom home designs/);
    assert.match(markup, /Integrated/);
    assert.match(markup, /Design to construction/);
    assert.doesNotMatch(markup, /~120|Days to delivery|>Architectural homes<\/p>/);
  }
});
