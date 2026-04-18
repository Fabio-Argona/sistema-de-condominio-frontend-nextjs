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

export function proxy(request: NextRequest) {
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

  // ...demais regras de proxy/middleware...

  return NextResponse.next();
}
