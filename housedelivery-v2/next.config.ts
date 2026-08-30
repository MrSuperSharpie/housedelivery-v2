import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
