import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurações do Next.js
  reactStrictMode: true,

  // Resolve warning de múltiplos lockfiles
  turbopack: {
    root: '..',
  },
  
  // Permitir imagens externas (se necessário)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Proxy Rewrites: Conecta o Frontend (HTTPS) ao Backend (HTTP) da AWS
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://100.51.89.148:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
