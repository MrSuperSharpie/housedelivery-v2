import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { LuxuryHero } from "@/components/luxury-hero";

test("homepage hero uses the non-interactive Vimeo background over its fallback image", () => {
  const markup = renderToStaticMarkup(
    <LuxuryHero image="/hero-fallback.jpg" />,
  );

  assert.match(markup, /src="\/hero-fallback\.jpg"/);
  assert.match(markup, /player\.vimeo\.com\/video\/1137960442/);
  assert.match(
    markup,
    /autoplay=1&amp;muted=1&amp;loop=1&amp;background=1&amp;autopause=0&amp;playsinline=1/,
  );
  assert.match(markup, /tabindex="-1"/);
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /allow="autoplay"/);
  assert.match(markup, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(markup, /pointer-events-none/);
  assert.match(markup, /opacity-0/);
  assert.doesNotMatch(markup, /hero-video\.mp4|<video/);
});
