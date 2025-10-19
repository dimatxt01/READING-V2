import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker deployment configuration
  output: 'standalone',

  // Performance optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'supabase.dev.coolifyai.com',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Compression
  compress: true,

  // Bundle optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-button',
      '@radix-ui/react-card',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-select',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
    ],
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=60',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },

  // Turbopack configuration
  // Turbopack handles optimization automatically, so we don't need webpack configs
  // Your app is using --turbopack flag in package.json, so webpack config is not needed
  
  // Note: Webpack configuration removed to eliminate warning
  // Turbopack provides automatic optimizations including:
  // - Code splitting
  // - Tree shaking
  // - Minification
  // - Bundle optimization
  // No manual configuration needed!

  // Redirects for SEO
  async redirects() {
    return [];
  },
};

export default nextConfig;
