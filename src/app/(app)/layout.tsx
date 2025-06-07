
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppData } from '@/context/app-data-context'; // This now consumes the context from root
import React, { useEffect } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { AppLogo } from '@/components/shared/app-logo';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, TrendingUp, TrendingDown, Sparkles, Users, FileSpreadsheet, PanelLeft, LogOut, Loader2 } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/hr', label: 'HR & Employees', icon: Users },
  { href: '/invoicing', label: 'Invoicing', icon: FileSpreadsheet },
  { href: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
];

function AppLayoutContent({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { state: sidebarState, isMobile, setOpenMobile } = useSidebar();
  const { isAuthenticated, logout, currentUser, authLoading } = useAppData(); // Consumes context
  const router = useRouter();

  useEffect(() => {
    // If auth is still loading, don't do anything yet.
    if (authLoading) {
      return;
    }
    // If auth has loaded and user is not authenticated, redirect to login.
    // Also, ensure we are not already on a public-facing page to avoid redirect loops if login page itself is under (app)
    if (!isAuthenticated && pathname !== '/login') { 
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router, pathname]);


  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = () => {
    logout();
    // router.push will be called by the useEffect hook due to isAuthenticated changing
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading application...</p>
      </div>
    );
  }

  // If not authenticated and no longer loading, content is handled by redirection in useEffect.
  // However, to prevent a flash of content or errors, ensure we don't render main layout.
  if (!isAuthenticated && !authLoading) {
     // The useEffect should handle the primary redirection.
     // Returning null or a minimal loader here can be a fallback.
     // Removed direct router.push from here as it caused render-time state updates.
     return null;
  }


  const collapsed = !isMobile && sidebarState === 'collapsed';

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader className="p-0">
          <AppLogo collapsed={collapsed} />
        </SidebarHeader>
        <SidebarContent asChild>
          <ScrollArea className="h-full">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                    tooltip={item.label}
                    onClick={handleMenuClick}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          {currentUser && (
            <div className="px-2 py-1 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              Logged in as: {currentUser.mobileNumber}
            </div>
          )}
          <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm md:hidden">
          <SidebarTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
               <PanelLeft className="h-5 w-5 text-primary" />
               <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SidebarTrigger>
          <AppLogo /> 
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // AppDataProvider is no longer here; it's in the root layout (src/app/layout.tsx)
  return (
    <SidebarProvider defaultOpen> 
      <AppLayoutContent pathname={pathname}>
        {children}
      </AppLayoutContent>
    </SidebarProvider>
  );
}
