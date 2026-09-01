import assert from "node:assert/strict";
import test from "node:test";

import {
  getLookBookPdfRevision,
  LookBookPdfArtifactCoordinator,
} from "@/lib/lookbook/pdf-artifact";
import type { StoredLookBook } from "@/lib/lookbook/types";

function storedLookBook(
  overrides: Partial<StoredLookBook> = {},
): StoredLookBook {
  return {
    id: "9342f2c1-8db8-4f09-a42a-f791d81b9407",
    homeSlug: "langley",
    homeDisplayName: "The Langley",
    homeFamily: "custom-home",
    configuratorVersion: 1,
    configuration: {
      schemaVersion: 1,
      homeId: "langley",
      inclusionSelections: {
        kitchen: { optionId: "langley-kitchen-premium-1", status: "confirmed" },
      },
      flooringSelections: {},
      reviewStatus: "ready-for-review",
      lookBookPersonalization: {
        customer: { firstName: "Edgar" },
        preparedAt: "2026-08-29T12:00:00.000Z",
        reference: "HD-LAN-260829",
      },
    },
    selections: [],
    contact: { firstName: "Edgar", email: "edgar@example.com" },
    leadState: "known_engaged",
    followUpRequested: false,
    attribution: {
      anonymousSessionId: "7ded1a37-f702-4251-9aac-732db90cc2ec",
    },
    createdAt: "2026-08-29T12:00:00.000Z",
    updatedAt: "2026-08-29T12:00:00.000Z",
    completedAt: "2026-08-29T12:00:00.000Z",
    ...overrides,
  };
}

test("PDF revisions change only when rendered Look Book input changes", () => {
  const original = storedLookBook();
  const retry = storedLookBook({
    updatedAt: "2026-08-30T12:00:00.000Z",
    emailRequestedAt: "2026-08-30T12:00:00.000Z",
    contact: {
      firstName: "Edgar",
      email: "different-delivery-address@example.com",
    },
  });
  const revised = storedLookBook({
    configuration: {
      ...original.configuration,
      inclusionSelections: {
        kitchen: {
          optionId: "langley-kitchen-signature-2",
          status: "confirmed",
        },
      },
    },
  });

  assert.equal(getLookBookPdfRevision(retry), getLookBookPdfRevision(original));
  assert.notEqual(
    getLookBookPdfRevision(revised),
    getLookBookPdfRevision(original),
  );
});

test("PDF revisions are stable across object key insertion order", () => {
  const original = storedLookBook();
  const reordered = storedLookBook({
    configuration: {
      ...original.configuration,
      inclusionSelections: Object.fromEntries(
        Object.entries(original.configuration.inclusionSelections).reverse(),
      ),
    },
  });

  assert.equal(
    getLookBookPdfRevision(reordered),
    getLookBookPdfRevision(original),
  );
});

test("same-revision concurrent requests share one render and retain its bytes", async () => {
  const coordinator = new LookBookPdfArtifactCoordinator();
  let renderCount = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const render = async () => {
    renderCount += 1;
    await gate;
    return new Uint8Array([1, 2, 3]);
  };

  const first = coordinator.getOrRender("langley:r1", render);
  const second = coordinator.getOrRender("langley:r1", render);
  await Promise.resolve();
  assert.equal(renderCount, 1);
  release();

  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.source, "generated");
  assert.equal(secondResult.source, "single-flight");
  assert.strictEqual(firstResult.bytes, secondResult.bytes);

  const retained = await coordinator.getOrRender("langley:r1", async () => {
    throw new Error("retained artifacts must not render again");
  });
  assert.equal(retained.source, "memory");
  assert.strictEqual(retained.bytes, firstResult.bytes);
  assert.equal(renderCount, 1);
});

test("different revisions render one at a time in a warm Function instance", async () => {
  const coordinator = new LookBookPdfArtifactCoordinator();
  const started: string[] = [];
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = coordinator.getOrRender("langley:r1", async () => {
    started.push("langley:r1");
    await firstGate;
    return new Uint8Array([1]);
  });
  const second = coordinator.getOrRender("solace:r1", async () => {
    started.push("solace:r1");
    return new Uint8Array([2]);
  });

  await Promise.resolve();
  assert.deepEqual(started, ["langley:r1"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(started, ["langley:r1", "solace:r1"]);
});

test("a failed render is neither retained nor allowed to block the queue", async () => {
  const coordinator = new LookBookPdfArtifactCoordinator();
  await assert.rejects(
    coordinator.getOrRender("boreal:r1", async () => {
      throw new Error("chromium failed");
    }),
    /chromium failed/,
  );

  const retry = await coordinator.getOrRender("boreal:r1", async () =>
    new Uint8Array([7, 8, 9]),
  );
  assert.equal(retry.source, "generated");
  assert.deepEqual([...retry.bytes], [7, 8, 9]);
});
