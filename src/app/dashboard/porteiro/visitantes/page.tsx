'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redireciona para o dashboard do porteiro que já tem o controle de visitantes
export default function VisitantesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/porteiro'); }, [router]);
  return null;
}
