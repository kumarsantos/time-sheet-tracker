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
      // HTTPS-only, explicit allowlist for auth-provider avatars. Avoids the
      // `**` wildcard, which would let any host be proxied through the optimizer.
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'www.gravatar.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'lisayta-images.s3.amazonaws.com' },
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
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
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

  // 6. Bundle Optimization: tree-shake via subpath imports for large client libs
  experimental: {
    optimizePackageImports: ['date-fns', 'lucide-react'],
  },
};

export default nextConfig;
