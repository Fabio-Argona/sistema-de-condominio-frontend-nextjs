'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoading } from '@/components/ui/LoadingSpinner';

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        switch (user.role) {
          case 'SINDICO':
            router.push('/dashboard/sindico');
            break;
          case 'MORADOR':
            router.push('/dashboard/morador');
            break;
          case 'PORTEIRO':
            router.push('/dashboard/porteiro');
            break;
        }
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  return <PageLoading />;
}
