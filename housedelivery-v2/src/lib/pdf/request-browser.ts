import "server-only";

import serverlessChromium from "@sparticuz/chromium";
import {
  chromium as playwrightChromium,
  type Browser,
  type Page,
} from "playwright-core";

const LOCAL_CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TRUSTED_OIDC_HEADER = "x-vercel-trusted-oidc-idp-token";
const PREVIEW_OIDC_PASSTHROUGH_HEADER =
  "x-house-delivery-preview-oidc-token";
const FORWARDED_PREVIEW_HEADERS = [
  "authorization",
  "x-vercel-protection-bypass",
  "x-vercel-set-bypass-cookie",
] as const;

type RequestBrowserOptions = {
  imageMaxWidth?: number;
};

function getPrintImageUrl(url: URL, maxWidth?: number) {
  if (
    !maxWidth ||
    !url.pathname.startsWith("/images/") ||
    url.pathname.endsWith(".svg")
  ) {
    return url;
  }

  const optimizedUrl = new URL("/_next/image", url.origin);
  optimizedUrl.searchParams.set("url", `${url.pathname}${url.search}`);
  optimizedUrl.searchParams.set("w", String(maxWidth));
  optimizedUrl.searchParams.set("q", "95");
  return optimizedUrl;
}

function parseRequestCookies(cookieHeader: string | null, origin: string) {
  if (!cookieHeader) return [];

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) return [];
      return [{
        name: part.slice(0, separatorIndex).trim(),
        value: part.slice(separatorIndex + 1),
        url: origin,
      }];
    });
}

async function launchBrowser(): Promise<Browser> {
  const isVercel = process.env.VERCEL === "1";
  return playwrightChromium.launch({
    args: isVercel ? serverlessChromium.args : [],
    executablePath: isVercel
      ? await serverlessChromium.executablePath()
      : process.env.CHROME_EXECUTABLE_PATH?.trim() || LOCAL_CHROME_PATH,
    headless: true,
  });
}

export function carryPreviewShareToken(requestUrl: URL, sourceUrl: URL) {
  const previewShareToken = requestUrl.searchParams.get("_vercel_share");
  if (previewShareToken) {
    sourceUrl.searchParams.set("_vercel_share", previewShareToken);
  }
}

export async function createRequestAuthenticatedPage(
  request: Request,
  options: RequestBrowserOptions = {},
): Promise<{ browser: Browser; page: Page }> {
  const requestUrl = new URL(request.url);
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const requestCookies = parseRequestCookies(
    request.headers.get("cookie"),
    requestUrl.origin,
  );
  if (requestCookies.length > 0) {
    await context.addCookies(requestCookies);
  }
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const routeUrl = new URL(route.request().url());
    if (routeUrl.origin !== requestUrl.origin) {
      await route.continue();
      return;
    }
    const requestHeaders = { ...route.request().headers() };
    for (const headerName of FORWARDED_PREVIEW_HEADERS) {
      const value = request.headers.get(headerName);
      if (value) requestHeaders[headerName] = value;
    }
    const trustedOidcToken =
      request.headers.get(TRUSTED_OIDC_HEADER) ??
      (process.env.VERCEL_ENV === "preview"
        ? request.headers.get(PREVIEW_OIDC_PASSTHROUGH_HEADER)
        : null);
    if (trustedOidcToken) {
      requestHeaders[TRUSTED_OIDC_HEADER] = trustedOidcToken;
    }
    const printUrl = getPrintImageUrl(routeUrl, options.imageMaxWidth);
    await route.continue({
      headers: requestHeaders,
      url: printUrl.href,
    });
  });
  return { browser, page };
}
