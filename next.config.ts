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
};

export default nextConfig;
