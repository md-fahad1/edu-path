import type { NextConfig } from 'next';

const API_URL = process.env.API_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // Browser same-origin /api/v1 call kore -> API-te proxy hoy. Tai CORS/cookie jhamela nei.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
