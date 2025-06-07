
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg text-muted-foreground">Redirecting...</p>
    </div>
  );
}
