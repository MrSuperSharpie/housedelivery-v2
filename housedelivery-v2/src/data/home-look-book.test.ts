import assert from "node:assert/strict";
import test from "node:test";

import { getLookBookHomeTitle } from "@/data/home-look-book";

test("personalized home titles use My before a name and a dynamic possessive after", () => {
  assert.equal(getLookBookHomeTitle("Cedarview House"), "My Cedarview House");
  assert.equal(
    getLookBookHomeTitle("Cedarview House", { firstName: " Edgar " }),
    "Edgar’s Cedarview House",
  );
  assert.equal(
    getLookBookHomeTitle("Canmore House", { firstName: "James" }),
    "James’ Canmore House",
  );
  assert.doesNotMatch(
    getLookBookHomeTitle("Cedarview House", { firstName: "Edgar" }),
    /House House/,
  );
});
