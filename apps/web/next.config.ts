import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@starterkit/shared', 'devextreme', 'devextreme-react'],
  // Firebase signInWithPopup requires the opener to communicate with the OAuth
  // popup window. The default COOP "same-origin" blocks window.closed checks;
  // "same-origin-allow-popups" keeps cross-origin isolation while permitting
  // popups opened by this page to postMessage back.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  images: {
    // In local dev, Next.js 15+ blocks server-side image optimisation for private/loopback IPs
    // (localhost:10000 = Azurite). Setting unoptimized skips the /_next/image proxy entirely so
    // next/image renders a plain <img> and the browser fetches directly from Azurite.
    // In production, images come from Azure Blob Storage over HTTPS so optimisation works fine.
    unoptimized: process.env.NODE_ENV === 'development',
    // Preset badge images are immutable (new images get new URLs). Cache optimised variants in the
    // browser for 1 year so repeat visits serve them instantly from disk without a network round-trip.
    minimumCacheTTL: 31_536_000,
    remotePatterns: [
      // Azure Blob Storage (deployed environments)
      { protocol: 'https', hostname: '*.blob.core.windows.net' },
    ],
  },
};

export default nextConfig;
