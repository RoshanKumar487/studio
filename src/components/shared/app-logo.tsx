
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
        isSmall ? "text-base text-muted-foreground" : "text-xl text-sidebar-primary"
        // Keeping this structure as font-semibold is static and the other part is a clear conditional swap.
        // The error was more prominent on the SVG.
      )}
    >
      <BriefcaseBusiness
        className={cn(
          // Explicitly combine shrink-0 with size classes into one string for the conditional part
          isSmall ? "shrink-0 h-4 w-4" : "shrink-0 h-7 w-7"
        )}
      />
      {!collapsed && (
        <span className={cn(
            "duration-200 transition-opacity ease-linear", 
            {"group-data-[collapsible=icon]:opacity-0": !isSmall && size !== 'sm'} // Adjusted condition slightly for clarity
            // The original condition for opacity was `!isSmall`.
            // If `size` prop is 'sm', `isSmall` is true, so `!isSmall` is false. Opacity is NOT 0.
            // If `size` prop is 'default', `isSmall` is false, so `!isSmall` is true. Opacity IS 0 if collapsible=icon.
            // This can be simplified to: (state.collapsible === "icon" && !isSmall)
            // The `group-data-[collapsible=icon]:opacity-0` should only apply if NOT small.
            // Let's refine the conditional class for the span slightly for robustness,
            // though the main error was the SVG class order.
            // The existing `{"group-data-[collapsible=icon]:opacity-0": !isSmall}` should be correct
            // as it means "if the sidebar is in icon mode, AND this logo instance is NOT small, then make span opaque".
          )}
        >
          BizView
        </span>
      )}
    </div>
  );
}

