import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { HomeLookBook } from "@/components/home-look-book";
import {
  getHomeConfiguratorJourneyCategories,
  type HomeConfiguration,
} from "@/data/home-configurator";
import { solaceHomeConfigurator } from "@/data/solace-home-configurator";

const noop = () => {};

function createCompleteSolaceConfiguration(
  culturalExteriorInterest: boolean,
  includeProjectRecord = false,
): HomeConfiguration {
  const inclusionSelections: HomeConfiguration["inclusionSelections"] = {};
  const flooringSelections: HomeConfiguration["flooringSelections"] = {};

  for (const category of getHomeConfiguratorJourneyCategories(
    solaceHomeConfigurator,
  )) {
    if (category.kind === "standard" || category.kind === "room-look") {
      inclusionSelections[category.id] = {
        optionId: category.options[0].id,
        status: "confirmed",
      };
      continue;
    }

    for (const zone of category.zones) {
      flooringSelections[zone.id] = {
        optionId: zone.options[0].id,
        status: "confirmed",
      };
    }
  }

  return {
    schemaVersion: solaceHomeConfigurator.configurationVersion,
    homeId: solaceHomeConfigurator.homeId,
    inclusionSelections,
    flooringSelections,
    reviewStatus: "ready-for-review",
    lookBookPersonalization: {
      projectDesignName: "Solace — Design A",
      ...(includeProjectRecord
        ? {
            project: {
              id: "HDP-TEST",
              name: "WestBank Housing Project",
              designGroupId: "design-a",
              designGroupName: "Solace — Design A",
              assignedQuantity: 2,
              deliveryGroup: "Active / First Build",
              exteriorExpression: culturalExteriorInterest
                ? ("Indigenous Inspiration" as const)
                : ("Contemporary" as const),
              revision: 1,
            },
          }
        : {}),
      preparedAt: "2026-08-23T12:00:00.000Z",
      reference: "SOL-COASTAL-001",
    },
    culturalExteriorInterest,
  };
}

function renderProjectLookBook(culturalExteriorInterest: boolean) {
  return renderToStaticMarkup(
    <HomeLookBook
      definition={solaceHomeConfigurator}
      configuration={createCompleteSolaceConfiguration(
        culturalExteriorInterest,
      )}
      onCreateLookBook={noop}
      onEditCategory={noop}
      onPreviewOption={noop}
      onSubmit={noop}
      plannerContext={{
        designLabel: "Solace — Design A",
        assignedQuantity: 2,
        projectName: "WestBank Housing Project",
        deliveryGroup: "Active / First Build",
        onSaveAndReturn: noop,
      }}
    />,
  );
}

test("Indigenous Inspiration project Look Book and print output use the approved exterior summary", () => {
  const markup = renderProjectLookBook(true);

  assert.match(markup, /house-delivery-logo-tan\.png/);
  assert.doesNotMatch(markup, /House Delivery Blk\.png/);
  assert.match(markup, /data-look-book-cultural-summary="true"/);
  assert.match(markup, /data-look-book-print-page="true"/);
  assert.ok((markup.match(/Solace-Coastal\.png/g) ?? []).length >= 2);
  assert.match(markup, /Design Direction/);
  assert.match(markup, /Exterior Direction \/ Indigenous Inspiration/);
  assert.match(markup, /Artwork &amp; Cultural Elements \/ Additional Cost/);
  assert.doesNotMatch(markup, /Coastal Inspiration/);
  assert.match(
    markup,
    /additional-cost items and are not included in the standard home price/,
  );
  assert.match(
    markup,
    /not final Nation-specific artwork or approved cultural designs/,
  );
  assert.match(markup, /object-contain/);
});

test("saved project Look Books preserve Indigenous Inspiration without live planner context", () => {
  const markup = renderToStaticMarkup(
    <HomeLookBook
      definition={solaceHomeConfigurator}
      configuration={createCompleteSolaceConfiguration(true, true)}
      onCreateLookBook={noop}
      onEditCategory={noop}
      onPreviewOption={noop}
      onSubmit={noop}
      readOnly
      savedView
    />,
  );

  assert.match(markup, /data-look-book-cultural-summary="true"/);
  assert.match(markup, /data-look-book-exterior-direction="indigenous-inspiration"/);
  assert.ok((markup.match(/Solace-Coastal\.png/g) ?? []).length >= 2);
  assert.match(markup, /additional-cost items and are not included in the standard home price/);
});

test("Contemporary-only project and standalone Look Books remain unchanged", () => {
  const projectMarkup = renderProjectLookBook(false);
  const standaloneMarkup = renderToStaticMarkup(
    <HomeLookBook
      definition={solaceHomeConfigurator}
      configuration={createCompleteSolaceConfiguration(true)}
      onCreateLookBook={noop}
      onEditCategory={noop}
      onPreviewOption={noop}
      onSubmit={noop}
    />,
  );

  for (const markup of [projectMarkup, standaloneMarkup]) {
    assert.doesNotMatch(markup, /data-look-book-cultural-summary/);
    assert.doesNotMatch(markup, /Solace-Coastal\.png/);
    assert.doesNotMatch(markup, /Artwork &amp; Cultural Elements/);
  }
});
