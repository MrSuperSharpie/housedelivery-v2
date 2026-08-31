import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultHomeConfiguration,
  getHomeConfiguratorJourneyCategories,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
} from "@/data/home-configurator";
import { getLookBookHomeTitle } from "@/data/home-look-book";
import {
  attachPropertyFeasibility,
  classifyEmailLead,
  LookBookValidationError,
  parseAttribution,
  parseCompletedLookBook,
  parseConfigurationId,
  parseContact,
  parsePropertyFeasibility,
  personalizeStoredConfiguration,
} from "@/lib/lookbook/domain";
import type { StoredLookBook } from "@/lib/lookbook/types";

function completeConfiguration(
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
    } else {
      for (const zone of category.zones) {
        flooringSelections[zone.id] = {
          optionId: zone.options[0]!.id,
          status: "confirmed",
        };
      }
    }
  }

  return {
    ...configuration,
    inclusionSelections,
    flooringSelections,
    reviewStatus: "ready-for-review",
  };
}

test("canonical migrated homes serialize their real home and stable selections", async (context) => {
  const { getHomeConfiguratorRegistration } = await import(
    "@/data/home-configurators"
  );
  for (const homeSlug of ["langley", "solace", "dalton", "maplewood"]) {
    await context.test(homeSlug, () => {
      const definition = getHomeConfiguratorRegistration(
        "custom-home",
        homeSlug,
      )!.definition!;
      const result = parseCompletedLookBook(
        homeSlug,
        completeConfiguration(definition),
      );

      assert.equal(result.definition.homeId, homeSlug);
      assert.equal(result.definition.homeName, definition.homeName);
      assert.ok(result.selections.length >= 7);
      assert.ok(result.selections.every((selection) => selection.optionId));
      assert.ok(result.selections.every((selection) => selection.optionName));
      assert.deepEqual(
        result.selections.map((selection) => selection.categoryId),
        getHomeConfiguratorJourneyCategories(definition).flatMap((category) =>
          category.kind === "flooring"
            ? category.zones.map(() => category.id)
            : [category.id],
        ),
      );
    });
  }
});

test("contact validation requires first name and email while phone remains optional", () => {
  assert.deepEqual(
    parseContact({ firstName: " Sarah ", email: "SARAH@example.com" }),
    { firstName: "Sarah", email: "sarah@example.com" },
  );
  assert.deepEqual(
    parseContact({
      firstName: "Sarah",
      email: "sarah@example.com",
      phone: " 604 555 0100 ",
    }),
    {
      firstName: "Sarah",
      email: "sarah@example.com",
      phone: "604 555 0100",
    },
  );
  assert.throws(
    () => parseContact({ firstName: "", email: "not-an-email" }),
    LookBookValidationError,
  );
});

test("email-only save stays known engaged and explicit assistance qualifies it", () => {
  assert.deepEqual(classifyEmailLead(false), {
    leadState: "known_engaged",
    followUpRequested: false,
  });
  assert.deepEqual(
    classifyEmailLead(true, undefined, "2026-08-29T12:00:00.000Z"),
    {
      leadState: "qualified_inquiry",
      followUpRequested: true,
      followUpRequestedAt: "2026-08-29T12:00:00.000Z",
      followUpSource: "email_assistance_checkbox",
    },
  );
});

test("property feasibility qualifies and updates the same configuration record", async () => {
  const { getHomeConfiguratorRegistration } = await import(
    "@/data/home-configurators"
  );
  const definition = getHomeConfiguratorRegistration(
    "custom-home",
    "langley",
  )!.definition!;
  const parsed = parseCompletedLookBook(
    "langley",
    completeConfiguration(definition),
  );
  const timestamp = "2026-08-29T12:00:00.000Z";
  const contact = parseContact({
    firstName: "Sarah",
    email: "sarah@example.com",
  });
  const record: StoredLookBook = {
    id: "9342f2c1-8db8-4f09-a42a-f791d81b9407",
    homeSlug: "langley",
    homeDisplayName: definition.homeName,
    homeFamily: "custom-home",
    configuratorVersion: definition.configurationVersion,
    configuration: personalizeStoredConfiguration(
      parsed.configuration,
      definition,
      contact,
      timestamp,
    ),
    selections: parsed.selections,
    contact,
    leadState: "known_engaged",
    followUpRequested: false,
    attribution: { anonymousSessionId: recordIdForAttribution },
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: timestamp,
  };
  assert.deepEqual(record.configuration.lookBookPersonalization?.customer, {
    firstName: "Sarah",
  });
  assert.equal(
    getLookBookHomeTitle(
      definition.residenceLabel,
      record.configuration.lookBookPersonalization?.customer,
    ),
    `Sarah’s ${definition.residenceLabel}`,
  );
  const property = parsePropertyFeasibility(
    {
      municipality: "Vancouver",
      province: "BC",
      postalCode: "V6B 1A1",
      propertyStatus: "owned_or_controlled",
      projectType: "one_home",
      timing: "within_6_months",
    },
    timestamp,
  );
  const qualified = attachPropertyFeasibility(record, property, timestamp);

  assert.equal(qualified.id, record.id);
  assert.equal(qualified.contact.email, record.contact.email);
  assert.equal(qualified.leadState, "qualified_inquiry");
  assert.equal(qualified.followUpRequested, true);
  assert.equal(qualified.followUpSource, "property_check");
  assert.equal(qualified.propertyFeasibility?.municipality, "Vancouver");
});

const recordIdForAttribution = "a724c43f-4e62-4e34-badb-323435fb9f71";

test("first-touch attribution is normalized without contact information", () => {
  assert.deepEqual(
    parseAttribution({
      anonymousSessionId: recordIdForAttribution,
      initialReferrer: " https://linkedin.com/feed ",
      landingPath:
        "/homes/langley?utm_source=linkedin&utm_medium=direct-outreach",
      utmSource: "linkedin",
      utmMedium: "direct-outreach",
      utmCampaign: "developers-august",
    }),
    {
      anonymousSessionId: recordIdForAttribution,
      initialReferrer: "https://linkedin.com/feed",
      landingPath:
        "/homes/langley?utm_source=linkedin&utm_medium=direct-outreach",
      utmSource: "linkedin",
      utmMedium: "direct-outreach",
      utmCampaign: "developers-august",
    },
  );
});

test("random or malformed saved configuration IDs fail validation", () => {
  assert.equal(parseConfigurationId("1"), undefined);
  assert.equal(parseConfigurationId("../../etc/passwd"), undefined);
  assert.equal(
    parseConfigurationId("9342F2C1-8DB8-4F09-A42A-F791D81B9407"),
    "9342f2c1-8db8-4f09-a42a-f791d81b9407",
  );
});

test("incomplete configurations cannot be persisted", async () => {
  const { getHomeConfiguratorRegistration } = await import(
    "@/data/home-configurators"
  );
  const definition = getHomeConfiguratorRegistration(
    "custom-home",
    "langley",
  )!.definition!;
  assert.throws(
    () =>
      parseCompletedLookBook(
        "langley",
        createDefaultHomeConfiguration(definition),
      ),
    LookBookValidationError,
  );
});
