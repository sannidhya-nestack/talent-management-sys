import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Add empty turbopack config to silence warning (Turbopack is default in Next.js 16)
  turbopack: {},
  // Webpack configuration (used when --webpack flag is passed)
  webpack: (config, { isServer }) => {
    // Exclude firebase-admin and Node.js modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        'firebase-admin': false,
      };
    }
    return config;
  },
};

export default nextConfig;
