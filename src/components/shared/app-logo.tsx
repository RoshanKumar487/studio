import { BriefcaseBusiness } from 'lucide-react';

export function AppLogo({ collapsed } : { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 font-headline text-xl font-semibold text-sidebar-primary">
      <BriefcaseBusiness className="h-7 w-7 shrink-0" />
      {!collapsed && <span className="duration-200 transition-opacity ease-linear group-data-[collapsible=icon]:opacity-0">BizView</span>}
    </div>
  );
}
