
import { BriefcaseBusiness } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  collapsed?: boolean;
  size?: 'sm' | 'default';
}

export function AppLogo({ collapsed, size = 'default' }: AppLogoProps) {
  const isSmall = size === 'sm';

  // Construct the full class string for the main div conditionally
  const divClasses = cn(
    isSmall
      ? "flex items-center gap-2 p-2 font-headline text-base font-semibold text-muted-foreground"
      : "flex items-center gap-2 p-2 font-headline text-xl font-semibold text-sidebar-primary"
  );

  // Construct the full class string for the icon conditionally
  const iconClasses = cn(
    isSmall 
      ? "h-4 w-4 shrink-0" 
      : "h-7 w-7 shrink-0"
  );

  return (
    <div className={divClasses}>
      <BriefcaseBusiness className={iconClasses} />
      {!collapsed && (
        <span className={cn(
            "duration-200 transition-opacity ease-linear",
            // This condition for opacity based on sidebar state
            size !== 'sm' && "group-data-[collapsible=icon]:opacity-0"
          )}
        >
          BizView
        </span>
      )}
    </div>
  );
}
