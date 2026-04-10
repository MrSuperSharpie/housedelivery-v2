import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Allow query strings (e.g. ?v=2) on local /public assets.
    // Without this entry Next.js <Image> throws a runtime error when a src
    // like "/vero-logo-light.png?v=2" is used for cache-busting.
    localPatterns: [
      {
        pathname: '/**',
        search: '*',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
