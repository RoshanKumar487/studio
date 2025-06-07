import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppDataProvider } from '@/context/app-data-context'; // Import AppDataProvider

export const metadata: Metadata = {
  title: 'BizView',
  description: 'Basic ERP for small businesses by Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AppDataProvider> {/* AppDataProvider now wraps all children at the root level */}
          {children}
          <Toaster />
        </AppDataProvider>
      </body>
    </html>
  );
}
