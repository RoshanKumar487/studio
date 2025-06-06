
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppDataProvider } from '@/context/app-data-context';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { AppLogo } from '@/components/shared/app-logo';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, CalendarDays, TrendingUp, TrendingDown, Sparkles, Users, FileText, Clock, FileSpreadsheet, PanelLeft } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/hr', label: 'HR & Employees', icon: Users },
  { href: '/timesheets', label: 'Timesheets', icon: Clock },
  { href: '/invoicing', label: 'Invoicing', icon: FileSpreadsheet },
  { href: '/ai-scheduler', label: 'AI Scheduler', icon: Sparkles },
];

function AppLayoutContent({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { state: sidebarState, isMobile } = useSidebar();
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
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm md:hidden">
          <SidebarTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
               <PanelLeft className="h-5 w-5" />
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

  return (
    <AppDataProvider>
      <SidebarProvider defaultOpen> 
        <AppLayoutContent pathname={pathname}>
          {children}
        </AppLayoutContent>
      </SidebarProvider>
    </AppDataProvider>
  );
}
