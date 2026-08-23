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

  assert.match(markup, /data-look-book-cultural-summary="true"/);
  assert.match(markup, /data-look-book-print-page="true"/);
  assert.match(markup, /Solace-Coastal\.png/);
  assert.match(markup, /Design Direction/);
  assert.match(markup, /Contemporary \+ Indigenous Inspiration/);
  assert.match(markup, /Indigenous Influence Notice/);
  assert.doesNotMatch(markup, /Coastal Inspiration/);
  assert.match(
    markup,
    /Cultural and place-based influence and artistry are identified for project review/,
  );
  assert.match(
    markup,
    /Final scope, artist collaboration, product integration, additional cost and timeline are to be confirmed separately/,
  );
  assert.match(markup, /object-contain/);
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
    assert.doesNotMatch(markup, /Indigenous Influence Notice/);
  }
});
