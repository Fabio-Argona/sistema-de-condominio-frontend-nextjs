import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');

  if (isDashboardRoute && !token) {
    // Se está tentando acessar o dashboard sem token, redireciona para login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Aqui você também pode adicionar logica de role-based access
  // Mas como o JWT precisa ser decodificado e o `jwt-decode` não funciona bem no Edge Runtime às vezes,
  // ou você faz a checagem no layout/client-side, ou usa um parser base64 leve.
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
