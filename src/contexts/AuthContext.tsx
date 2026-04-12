'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import api from '@/lib/api';

import { User, UserRole, DecodedToken, LoginRequest } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  updateAuth: (jwt: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const decodeAndSetUser = useCallback((jwt: string) => {
    try {
      const decoded = jwtDecode<DecodedToken>(jwt);
      
      // Verifica expiração
      if (decoded.exp * 1000 < Date.now()) {
        Cookies.remove('token');
        setUser(null);
        setToken(null);
        return false;
      }

      setUser({
        id: decoded.userId,
        nome: decoded.nome,
        email: decoded.sub,
        role: decoded.role,
        primeiroAcesso: decoded.primeiroAcesso,
      });
      setToken(jwt);
      return true;
    } catch {
      Cookies.remove('token');
      setUser(null);
      setToken(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = Cookies.get('token');
      if (savedToken) {
        decodeAndSetUser(savedToken);
      }
      setIsLoading(false);
    };
    
    initializeAuth();
  }, [decodeAndSetUser]);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token: jwt, user: userData } = response.data;

      // Em produção use secure: true, em localhost deixamos false para o middleware ler no HTTP
      Cookies.set('token', jwt, { expires: 7, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      setToken(jwt);
      setUser(userData);

      // Redireciona com base no role
      if (userData.role === 'MORADOR' && userData.primeiroAcesso) {
        router.push('/dashboard/morador/perfil');
        return;
      }
      switch (userData.role) {
        case 'SINDICO':
          router.push('/dashboard/sindico');
          break;
        case 'MORADOR':
          router.push('/dashboard/morador');
          break;
        case 'PORTEIRO':
          router.push('/dashboard/porteiro');
          break;
        default:
          router.push('/dashboard');
      }
    } catch (error) {
      throw error;
    }
  };

  const updateAuth = useCallback((jwt: string) => {
    Cookies.set('token', jwt, { expires: 7, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    setToken(jwt);
    decodeAndSetUser(jwt);
  }, [decodeAndSetUser]);

  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  const hasRole = (role: UserRole | UserRole[]) => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        hasRole,
        updateAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
  
}
