import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { SavedLookBook } from "@/components/saved-lookbook";
import {
  createDefaultHomeConfiguration,
  getHomeConfiguratorJourneyCategories,
  type HomeConfiguration,
} from "@/data/home-configurator";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";

test("saved Look Book restores selections as a read-only downloadable view", () => {
  const definition = getHomeConfiguratorRegistration(
    "custom-home",
    "langley",
  )!.definition!;
  const configuration = createDefaultHomeConfiguration(definition);
  const inclusionSelections: HomeConfiguration["inclusionSelections"] = {};
  const flooringSelections: HomeConfiguration["flooringSelections"] = {};

  for (const category of getHomeConfiguratorJourneyCategories(definition)) {
    if (category.kind === "standard" || category.kind === "room-look") {
      inclusionSelections[category.id] = {
        optionId: category.options[0]!.id,
        status: "confirmed",
      };
    } else {
      for (const zone of category.zones) {
        flooringSelections[zone.id] = {
          optionId: zone.options[0]!.id,
          status: "confirmed",
        };
      }
    }
  }

  const savedConfiguration: HomeConfiguration = {
    ...configuration,
    inclusionSelections,
    flooringSelections,
    reviewStatus: "ready-for-review",
    lookBookPersonalization: {
      customer: { firstName: "Sarah" },
      preparedAt: "2026-08-29T12:00:00.000Z",
      reference: "LAN-20260829-ABCD",
    },
  };
  const markup = renderToStaticMarkup(
    <SavedLookBook
      definition={definition}
      configuration={savedConfiguration}
      configurationId="9342f2c1-8db8-4f09-a42a-f791d81b9407"
    />,
  );

  assert.match(markup, /Prepared for Sarah/);
  assert.match(markup, /Sarah’s Langley House/);
  assert.match(markup, /Download My Look Book/);
  assert.match(markup, /Check My Property/);
  assert.match(markup, /data-look-book-option=/);
  assert.doesNotMatch(markup, />Edit</);
  assert.doesNotMatch(markup, /sarah@example\.com/i);
});
