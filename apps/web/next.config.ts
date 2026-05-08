import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    PULO_WEB_PORT: process.env.PULO_WEB_PORT ?? '4310',
  },
  // Suppress hydration warnings in dev only
  reactStrictMode: true,
};

export default nextConfig;