import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Função utilitária para decodificar JWT no Edge Runtime (onde jwt-decode não funciona)
function getJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

const dashboardByRole: Record<string, string> = {
  SINDICO: '/dashboard/sindico',
  MORADOR: '/dashboard/usuario',
  PORTEIRO: '/dashboard/porteiro',
  MANTENEDOR: '/dashboard/mantenedor',
};

const profileByRole: Record<string, string> = {
  MORADOR: '/dashboard/usuario/perfil',
  MANTENEDOR: '/dashboard/mantenedor/perfil',
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Se já está logado e tenta ir para o login, redireciona para o dashboard correto
  if (pathname === '/login' && token) {
    const payload = getJwtPayload(token);
    if (payload && (payload.exp * 1000 > Date.now())) {
      const destination = dashboardByRole[payload.role] ?? '/dashboard';
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  // Se não tem token e tenta entrar no Dashboard, manda pro login
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se tem token, valida a role e expiração apenas ao acessar o Dashboard
  if (pathname.startsWith('/dashboard') && token) {
    const payload = getJwtPayload(token);
    
    // Se o token for inválido ou expirado, limpa e manda pro login
    if (!payload || (payload.exp * 1000 < Date.now())) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }

    // Proteção de Roles (Síndico não entra no Morador e vice-versa)
    const role = payload.role;
    const roleRoutes = Object.entries(dashboardByRole);
    for (const [routeRole, routePrefix] of roleRoutes) {
      if (pathname.startsWith(routePrefix) && role !== routeRole) {
        return NextResponse.redirect(new URL(dashboardByRole[role] ?? '/dashboard', request.url));
      }
    }

    const profilePath = profileByRole[role];
    if (payload.primeiroAcesso === true && profilePath && !pathname.startsWith(profilePath)) {
      return NextResponse.redirect(new URL(profilePath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
