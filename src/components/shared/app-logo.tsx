
import { BriefcaseBusiness } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  collapsed?: boolean;
  size?: 'sm' | 'default';
}

export function AppLogo({ collapsed, size = 'default' }: AppLogoProps) {
  const isSmall = size === 'sm';
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 font-headline font-semibold",
        isSmall ? "text-base text-muted-foreground" : "text-xl text-sidebar-primary" // Adjusted text color for small version
      )}
    >
      <BriefcaseBusiness
        className={cn(
          "shrink-0",
          isSmall ? "h-4 w-4" : "h-7 w-7" // Made icon even smaller for 'sm'
        )}
      />
      {!collapsed && <span className={cn("duration-200 transition-opacity ease-linear", {"group-data-[collapsible=icon]:opacity-0": !isSmall} )}>BizView</span>}
    </div>
  );
}
