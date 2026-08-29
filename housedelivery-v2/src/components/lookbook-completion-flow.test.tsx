import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { HomeLookBook } from "@/components/home-look-book";
import {
  createDefaultHomeConfiguration,
  getHomeConfiguratorJourneyCategories,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
} from "@/data/home-configurator";
import { homeConfiguratorRegistrations } from "@/data/home-configurators";

const noop = () => {};

function createCompleteConfiguration(
  definition: HomeConfiguratorDefinition,
): HomeConfiguration {
  const configuration = createDefaultHomeConfiguration(definition);
  const inclusionSelections: HomeConfiguration["inclusionSelections"] = {};
  const flooringSelections: HomeConfiguration["flooringSelections"] = {};

  for (const category of getHomeConfiguratorJourneyCategories(definition)) {
    if (category.kind === "standard" || category.kind === "room-look") {
      inclusionSelections[category.id] = {
        optionId: category.options[0]!.id,
        status: "confirmed",
      };
      continue;
    }

    for (const zone of category.zones) {
      flooringSelections[zone.id] = {
        optionId: zone.options[0]!.id,
        status: "confirmed",
      };
    }
  }

  return {
    ...configuration,
    inclusionSelections,
    flooringSelections,
    reviewStatus: "ready-for-review",
    lookBookPersonalization: {
      preparedAt: "2026-08-29T12:00:00.000Z",
      reference: `${definition.homeId.toUpperCase()}-FLOW-001`,
    },
  };
}

function occurrenceCount(value: string, pattern: string) {
  return value.split(pattern).length - 1;
}

test("every migrated home shares the Get My Look Book flow and House Delivery value story", () => {
  const definitions = homeConfiguratorRegistrations.flatMap((registration) =>
    registration.productFamily === "custom-home" && registration.definition
      ? [registration.definition]
      : [],
  );

  assert.ok(definitions.length >= 4, "shared flow covers migrated homes");

  for (const definition of definitions) {
    const markup = renderToStaticMarkup(
      <HomeLookBook
        definition={definition}
        configuration={createCompleteConfiguration(definition)}
        onCreateLookBook={noop}
        onEditCategory={noop}
        onPreviewOption={noop}
        onSubmit={noop}
        directSourceImages
      />,
    );

    const completionIndex = markup.indexOf("data-lookbook-lead-capture");
    const coverIndex = markup.indexOf("id=\"home-look-book-content\"");
    const openingValueIndex = markup.indexOf(
      "data-look-book-value-story=\"precision-quality\"",
    );
    const whyHouseDeliveryIndex = markup.indexOf(
      "data-look-book-value-story=\"why-house-delivery\"",
    );
    const deliveryValueIndex = markup.indexOf(
      "data-look-book-value-story=\"delivery-value\"",
    );
    const finaleIndex = markup.indexOf("data-look-book-next-stage");
    const closingActionsIndex = markup.indexOf("data-lookbook-closing-actions");

    assert.ok(completionIndex >= 0, `${definition.homeName}: completion exists`);
    assert.ok(
      completionIndex < coverIndex && coverIndex < openingValueIndex,
      `${definition.homeName}: completion precedes anonymous viewing and the opening value story`,
    );
    assert.ok(
      openingValueIndex < whyHouseDeliveryIndex &&
        whyHouseDeliveryIndex < deliveryValueIndex &&
        deliveryValueIndex < finaleIndex &&
        finaleIndex < closingActionsIndex,
      `${definition.homeName}: value story is paced through the Look Book before the compact close`,
    );
    assert.match(
      markup,
      new RegExp(`Your ${definition.homeName} is ready\\.`),
    );
    assert.match(markup, /View online without saving/);
    assert.equal(
      occurrenceCount(markup, "Get My Look Book"),
      2,
      `${definition.homeName}: one primary capture action is repeated at the close`,
    );
    assert.equal(
      occurrenceCount(markup, "Download My Look Book"),
      1,
      `${definition.homeName}: anonymous download appears only at the close`,
    );
    assert.doesNotMatch(markup, /Email My Look Book/);
    assert.equal(
      occurrenceCount(markup, "Check My Property"),
      2,
      `${definition.homeName}: property check is primary and repeated once`,
    );
    assert.equal(
      occurrenceCount(markup, "data-look-book-section="),
      7,
      `${definition.homeName}: all seven selected chapters remain`,
    );
    assert.match(markup, /Factory precision\./);
    assert.match(markup, /Why House/);
    assert.match(markup, /Precision/);
    assert.match(markup, /Quality/);
    assert.match(markup, /Speed/);
    assert.match(markup, /Value/);
    assert.match(markup, /Could this home cost materially less to deliver\?/);
    assert.match(
      markup,
      /Final savings depend on site conditions, specification and local construction costs\./,
    );
    assert.doesNotMatch(markup, /data-look-book-validated-savings/);
    assert.doesNotMatch(markup, /(?:20|30)%/);
    assert.doesNotMatch(
      markup,
      /data-save-look-book=\"top\"/,
      `${definition.homeName}: disconnected standalone save bar is removed`,
    );
  }
});
