import assert from "node:assert/strict";
import test from "node:test";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import config from "../../../next.config";
import { LOOK_BOOK_PRINT_IMAGE_WIDTH } from "@/lib/pdf/print-images";

test("the PDF renderer requests an allowed bounded Next image derivative", () => {
  const sizes = [...(config.images?.deviceSizes ?? imageConfigDefault.deviceSizes), ...(config.images?.imageSizes ?? imageConfigDefault.imageSizes)];
  assert.ok(sizes.includes(LOOK_BOOK_PRINT_IMAGE_WIDTH));
  assert.ok(LOOK_BOOK_PRINT_IMAGE_WIDTH >= 794 && LOOK_BOOK_PRINT_IMAGE_WIDTH <= 1200);
  assert.ok(config.images?.qualities?.includes(95));
});
