// 1080 is a configured Next.js device size and exceeds the A4 CSS page width.
// Keep print derivatives bounded to protect Chromium's shared memory.
export const LOOK_BOOK_PRINT_IMAGE_WIDTH = 1080;

// Runs inside the print browser, so keep this function self-contained.
export async function waitForPrintImages() {
  await document.fonts.ready;
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>("[data-look-book-print-page] img"),
  );
  images.forEach((image) => { image.loading = "eager"; });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all(images.map((image) => image.decode())),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("lookbook_images_timeout")), 45_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  if (images.some((image) => !image.complete || image.naturalWidth === 0)) {
    throw new Error("lookbook_images_incomplete");
  }
}
