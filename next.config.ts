import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 1. Core Optimizations & Strictness
  reactStrictMode: true,
  poweredByHeader: false, // Prevents exposing X-Powered-By: Next.js for security
  compress: true, // Enables gzip/brotli compression for rendered responses

  // 2. Output & Build Hygiene
  // Note: Set output to 'standalone' if deploying with Docker
  // output: 'standalone',

  // 3. Image Optimization Security
  images: {
    formats: ['image/avif', 'image/webp'], // Serve modern optimized formats
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all hostnames for flexibility; restrict in production if needed
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  // 4. Production Security Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  // 5. Compiler Settings for Production Cleanup
  compiler: {
    // Automatically strip console.log in production, but keep console.error/warn
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;
