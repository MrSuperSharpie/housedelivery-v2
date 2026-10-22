import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import sharp from "sharp";
import boardManifest from "../../public/images/lookbook/windows-patio-doors/boards/manifest.json";
import {
  createDefaultHomeConfiguration,
  getHomeConfiguratorJourneyCategories,
} from "@/data/home-configurator";
import { getLookBookSelectionSections } from "@/data/home-look-book";
import { getHomeConfiguratorRegistrationsByFamily } from "@/data/home-configurator-registry";
import { parseCompletedLookBook } from "@/lib/lookbook/domain";

test("upgraded windows boards retain their full source canvas and exact decoded pixels", async () => {
  assert.equal(boardManifest.length, 144);
  assert.equal(new Set(boardManifest.map((board) => `${board.home}:${board.tier}:${board.option}`)).size, 144);
  assert.deepEqual(
    boardManifest.filter((board) => !("encoding" in board))
      .map((board) => `${board.home}:${board.tier}:${board.option}`).sort(),
    [
      ...["premium", "signature"].flatMap((tier) =>
        [1, 2, 3, 4].map((option) => `salt-spring:${tier}:${option}`),
      ),
      "solace:signature:2",
    ].sort(),
    "Only the explicitly retained Salt Spring and damaged Solace slots use prior artwork",
  );

  for (const board of boardManifest) {
    if (!("encoding" in board)) continue;
    assert.equal(board.encoding, "lossless-webp");
    assert.match(board.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(board.sourceZip.startsWith("*"));
    const file = join(process.cwd(), "public/images/lookbook/windows-patio-doors/boards", board.image);
    const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, board.width);
    assert.equal(info.height, board.height);
    assert.equal(createHash("sha256").update(data).digest("hex"), board.decodedPixelSha256, board.image);
  }
});

test("all custom homes carry a selectable Canadian windows and patio doors chapter into the saved Look Book", () => {
  const homes = getHomeConfiguratorRegistrationsByFamily("custom-home");
  assert.equal(homes.length, 18);

  for (const home of homes) {
    const definition = home.definition;
    assert.ok(definition, home.homeId);
    const category = definition.categories.find((item) => item.id === "windows-patio-doors");
    assert.ok(category?.kind === "room-look", home.homeId);
    assert.equal(category.options.length, 8);
    assert.deepEqual(
      category.options.map((option) => `${option.level}:${option.optionNumber}`).sort(),
      ["premium:1", "premium:2", "premium:3", "premium:4", "signature:1", "signature:2", "signature:3", "signature:4"],
    );
    assert.match(category.technicalNote ?? "", /NAFS\/CSA A440S1/);
    assert.match(category.options.map((option) => option.name).join(" "), /Slider|Sliding/);
    assert.match(category.options.map((option) => option.name).join(" "), /Folding/);
    assert.match(category.options.map((option) => option.name).join(" "), /Pocketing/);
    for (const option of category.options) {
      assert.ok(existsSync(join(process.cwd(), "public", option.image.src)), `${home.homeId}: ${option.image.src}`);
      assert.equal(option.image.role, "design-board");
      assert.equal(option.image.fit, "contain");
      const board = boardManifest.find((item) => item.home === home.homeId && item.tier === option.level && item.option === option.optionNumber);
      assert.ok(board);
      assert.equal(option.image.src, `/images/lookbook/windows-patio-doors/boards/${board.image}`);
      const bytes = readFileSync(join(process.cwd(), "public", option.image.src));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), board.sha256);
      assert.equal(bytes.length, board.bytes);
      assert.match(option.description ?? "", option.level === "premium" ? /double-glazed/ : /triple-glazed/);
    }

    const sections = getLookBookSelectionSections(definition.lookBook.sections);
    assert.ok(sections.some((section) => section.items.some((item) => item.categoryId === category.id)));
    const configuration = createDefaultHomeConfiguration(definition);
    for (const chapter of getHomeConfiguratorJourneyCategories(definition)) {
      assert.ok(chapter.kind === "room-look");
      configuration.inclusionSelections[chapter.id] = {
        optionId: chapter.options[0].id,
        status: "confirmed",
      };
    }
    const saved = parseCompletedLookBook(home.homeId, configuration);
    assert.equal(saved.selections.filter((selection) => selection.categoryId === "windows-patio-doors").length, 1);
    delete configuration.inclusionSelections[category.id];
    assert.throws(() => parseCompletedLookBook(home.homeId, configuration), /Every design chapter must be complete/);

    if (home.homeId === "salt-spring") {
      assert.equal(category.residence, "shared");
      assert.ok(category.options.every((option) => option.shared));
      assert.equal(saved.selections.find((selection) => selection.categoryId === category.id)?.tier, "shared");
    }
  }
});
