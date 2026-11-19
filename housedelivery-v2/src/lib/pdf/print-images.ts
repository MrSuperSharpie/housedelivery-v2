// 1080 is a configured Next.js device size and exceeds the A4 CSS page width.
// Keep print derivatives bounded to protect Chromium's shared memory.
export const LOOK_BOOK_PRINT_IMAGE_WIDTH = 1080;

// Next.js appends dpl to static assets for deployment skew protection. It is
// request metadata, not part of the source image's identity: nesting it inside
// the optimizer's url parameter causes Vercel to reject the image with 400.
export function getPrintImageUrl(url: URL, maxWidth?: number) {
  if (
    !maxWidth ||
    !url.pathname.startsWith("/images/") ||
    url.pathname.endsWith(".svg")
  ) {
    return url;
  }

  const source = new URL(url);
  const deploymentId = source.searchParams.get("dpl");
  source.searchParams.delete("dpl");
  const optimizedUrl = new URL("/_next/image", url.origin);
  optimizedUrl.searchParams.set("url", `${source.pathname}${source.search}`);
  optimizedUrl.searchParams.set("w", String(maxWidth));
  optimizedUrl.searchParams.set("q", "95");
  if (deploymentId) optimizedUrl.searchParams.set("dpl", deploymentId);
  return optimizedUrl;
}

// Runs inside the print browser, so keep this function self-contained.
export async function waitForPrintImages(
  selector?: string | void,
  retryFailedImages = false,
) {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>(
      selector ?? "[data-look-book-print-page] img",
    ),
  );
  for (const image of images) {
    if (retryFailedImages && image.complete && image.naturalWidth === 0) {
      // Start a fresh request for a failed image without discarding the Look Book.
      const source = image.getAttribute("src");
      if (source) image.setAttribute("src", source);
    }
    image.loading = "eager";
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all([document.fonts.ready, ...images.map((image) => image.decode())]),
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
