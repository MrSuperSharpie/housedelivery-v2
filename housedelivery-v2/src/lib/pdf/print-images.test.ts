import assert from "node:assert/strict";
import test from "node:test";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import config from "../../../next.config";
import { getPrintImageUrl, LOOK_BOOK_PRINT_IMAGE_WIDTH, waitForPrintImages } from "@/lib/pdf/print-images";

test("the PDF renderer requests an allowed bounded Next image derivative", () => {
  const sizes = [...(config.images?.deviceSizes ?? imageConfigDefault.deviceSizes), ...(config.images?.imageSizes ?? imageConfigDefault.imageSizes)];
  assert.ok(sizes.includes(LOOK_BOOK_PRINT_IMAGE_WIDTH));
  assert.ok(LOOK_BOOK_PRINT_IMAGE_WIDTH >= 794 && LOOK_BOOK_PRINT_IMAGE_WIDTH <= 1200);
  assert.ok(config.images?.qualities?.includes(95));
});

test("deployed print images keep the deployment marker outside the optimizer source", () => {
  for (const path of [
    "/images/brand/house-delivery-logo-tan.png",
    "/images/homes/aurora/visual-guide/Aurora_01_Kitchen_Premium-1_Sunward-Oak.png",
    "/images/lookbook/windows-patio-doors/boards/aurora-premium-1-af7ae6eb5bea.webp",
  ]) {
    const source = new URL(`${path}?dpl=dpl_preview`, "https://preview.vercel.app");
    const original = source.href;
    const optimized = getPrintImageUrl(source, LOOK_BOOK_PRINT_IMAGE_WIDTH);
    assert.equal(optimized.origin, source.origin);
    assert.equal(optimized.pathname, "/_next/image");
    assert.equal(optimized.searchParams.get("url"), path);
    assert.equal(optimized.searchParams.get("dpl"), "dpl_preview");
    assert.equal(optimized.searchParams.get("w"), "1080");
    assert.equal(optimized.searchParams.get("q"), "95");
    assert.equal(source.href, original, "must not mutate the original request");
  }
});

test("print optimization retains ordinary source parameters and works without deployment metadata", () => {
  const local = getPrintImageUrl(new URL("http://localhost:3152/images/home.png"), 1080);
  assert.equal(local.searchParams.get("url"), "/images/home.png");
  assert.equal(local.searchParams.has("dpl"), false);
  const versioned = getPrintImageUrl(new URL("https://preview.vercel.app/images/home.png?v=2&dpl=dpl_preview"), 1080);
  assert.equal(versioned.searchParams.get("url"), "/images/home.png?v=2");
  assert.equal(versioned.searchParams.get("dpl"), "dpl_preview");
});

test("print request routing leaves non-image assets, vectors and unbounded consumers unchanged", () => {
  for (const [path, width] of [["/_next/image?url=%2Fimages%2Fhome.png&w=1080&q=95", 1080], ["/images/brand.svg?dpl=dpl_preview", 1080], ["/fonts/brand.woff2?dpl=dpl_preview", 1080], ["/images/home.png?dpl=dpl_preview", undefined]] as const) {
    const source = new URL(path, "https://preview.vercel.app");
    assert.strictEqual(getPrintImageUrl(source, width), source);
  }
});

test("report printing waits for every scoped image to decode", async (t) => {
  const selector = "#planner-opportunity-report img";
  const slowDecode = Promise.withResolvers<void>();
  const fontsReady = Promise.withResolvers<void>();
  const loaded = { loading: "lazy", decode: async () => {}, complete: true, naturalWidth: 980 };
  const delayed = { loading: "lazy", decode: () => slowDecode.promise, complete: false, naturalWidth: 0 };
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      fonts: { ready: fontsReady.promise },
      querySelectorAll: (input: string) => {
        assert.equal(input, selector);
        return [loaded, delayed];
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  });

  let readyToPrint = false;
  const result = waitForPrintImages(selector).then(() => { readyToPrint = true; });
  await Promise.resolve();
  assert.equal(loaded.loading, "eager");
  assert.equal(delayed.loading, "eager");
  assert.equal(readyToPrint, false);

  delayed.complete = true;
  delayed.naturalWidth = 996;
  slowDecode.resolve();
  await new Promise(setImmediate);
  assert.equal(readyToPrint, false, "images alone cannot make the PDF ready");

  fontsReady.resolve();
  await result;
  assert.equal(readyToPrint, true);

  delayed.naturalWidth = 0;
  await assert.rejects(waitForPrintImages(selector), /images_incomplete/);
});

test("a failed design board blocks printing and can be re-requested on retry", async (t) => {
  const source = "/images/homes/boreal/board.png";
  let requests = 0;
  const image = {
    complete: true,
    loading: "lazy",
    naturalWidth: 0,
    getAttribute: () => source,
    setAttribute: (attribute: string, value: string) => {
      assert.equal(attribute, "src");
      assert.equal(value, source);
      requests += 1;
      image.naturalWidth = 1200;
    },
    async decode() {
      if (image.naturalWidth === 0) throw new Error("board failed to load");
    },
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      fonts: { ready: Promise.resolve() },
      querySelectorAll: () => [image],
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  });

  await assert.rejects(waitForPrintImages(), /board failed to load/);
  assert.equal(requests, 0);
  await waitForPrintImages(undefined, true);
  assert.equal(requests, 1);
  await waitForPrintImages(undefined, true);
  assert.equal(requests, 1, "images that decoded successfully should not be re-requested");
});
