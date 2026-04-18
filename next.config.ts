import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurações do Next.js
  reactStrictMode: true,

  // Resolve warning de múltiplos lockfiles
  // turbopack.root removido para evitar conflito com outputFileTracingRoot
  
  // Permitir imagens externas (se necessário)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Proxy Rewrites: Conecta o Frontend (HTTPS) ao Backend
  // Em produção, defina NEXT_PUBLIC_API_URL (ou BACKEND_URL) nas env vars do Vercel
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://100.51.89.148:8080';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
