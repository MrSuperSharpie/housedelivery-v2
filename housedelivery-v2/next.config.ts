import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
