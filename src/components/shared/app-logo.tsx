
import { BriefcaseBusiness } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  collapsed?: boolean;
  size?: 'sm' | 'default';
}

export function AppLogo({ collapsed, size = 'default' }: AppLogoProps) {
  const isSmall = size === 'sm';

  const baseDivClasses = "flex items-center gap-2 p-2 font-headline";
  const conditionalDivClasses = isSmall
    ? "text-base font-semibold text-muted-foreground" // For 'sm' size
    : "text-xl font-semibold text-sidebar-primary"; // For 'default' size

  const iconSizeClass = isSmall ? "h-4 w-4" : "h-7 w-7";

  return (
    <div className={cn(baseDivClasses, conditionalDivClasses)}>
      <BriefcaseBusiness
        className={cn(
          "shrink-0", 
          iconSizeClass
        )}
      />
      {!collapsed && (
        <span className={cn(
            "duration-200 transition-opacity ease-linear",
            size !== 'sm' && "group-data-[collapsible=icon]:opacity-0"
          )}
        >
          FlowHQ
        </span>
      )}
    </div>
  );
}
