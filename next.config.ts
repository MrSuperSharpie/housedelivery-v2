import type { NextConfig } from "next";

const deploymentId =
  process.env.VERCEL_DEPLOYMENT_ID ??
  process.env.VERCEL_URL ??
  process.env.VERCEL_GIT_COMMIT_SHA;

const nextConfig: NextConfig = {
  // Keep cached clients on one deployment. Next.js uses this value to
  // cache-bust assets and hard-navigate when route data comes from a newer
  // deployment, avoiding stale-client/new-server version skew.
  deploymentId,
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/lookbook/*/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/playwright-core/browsers.json",
    ],
    "/internal/project-review/*/opportunity-report/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/playwright-core/browsers.json",
    ],
    "/internal/project-review/*/lou/*/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/playwright-core/browsers.json",
    ],
  },
  async headers() {
    return [
      {
        source: "/internal/project-review/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    // Keep every generated derivative in the high-fidelity range. Images that
    // require exact source pixels (logos and Visual Guide boards) opt out of
    // recompression at the component level.
    qualities: [95, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img1.wsimg.com",
        port: "",
        pathname: "/isteam/ip/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
