import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { LuxuryHero } from "@/components/luxury-hero";

test("homepage hero serves a muted inline MP4 with fallback image without playback controls", () => {
  const markup = renderToStaticMarkup(
    <LuxuryHero image="/hero-fallback.jpg" />,
  );

  assert.match(markup, /src="\/hero-fallback\.jpg"/);
  assert.match(markup, /<video[^>]+autoPlay=""[^>]+muted=""[^>]+loop=""[^>]+playsInline=""/);
  assert.match(
    markup,
    /src="\/videos\/house-delivery-hero\.mp4" type="video\/mp4"/,
  );
  assert.match(markup, /tabindex="-1"/);
  assert.match(markup, /aria-hidden="true"/);
  assert.doesNotMatch(markup, /(?:Pause|Play) background video/);
  assert.match(markup, /motion-reduce:hidden/);
  assert.match(markup, /pointer-events-none/);
  assert.match(markup, /opacity-0/);
  assert.doesNotMatch(markup, /player\.vimeo\.com|<iframe/);
});
