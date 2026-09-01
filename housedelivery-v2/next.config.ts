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
