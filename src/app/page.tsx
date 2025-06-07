
"use client"; // Required for using hooks like useRouter and useAppData

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/context/app-data-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, authLoading } = useAppData();

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, authLoading, router]);

  // Display a loading indicator while auth status is being determined
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg text-muted-foreground">Initializing...</p>
    </div>
  );
}
