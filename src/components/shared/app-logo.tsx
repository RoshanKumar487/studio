
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
        "flex items-center gap-2 p-2 font-headline", // Common base classes
        isSmall 
          ? "font-semibold text-base text-muted-foreground" // Grouped classes for small size
          : "font-semibold text-xl text-sidebar-primary"   // Grouped classes for default size
      )}
    >
      <BriefcaseBusiness
        className={cn(
          "shrink-0", // Apply shrink-0 unconditionally as a separate argument
          isSmall ? "h-4 w-4" : "h-7 w-7" // Apply size conditionally as a separate argument
        )}
      />
      {!collapsed && (
        <span className={cn(
            "duration-200 transition-opacity ease-linear", 
            // This condition means: if this logo is NOT small AND the sidebar is in icon mode, then make the span transparent.
            // If the logo IS small (size === 'sm'), this opacity rule does not apply.
            size !== 'sm' && "group-data-[collapsible=icon]:opacity-0"
          )}
        >
          BizView
        </span>
      )}
    </div>
  );
}
