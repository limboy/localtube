import { cn } from "@/lib/utils";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { UpdateIndicator } from "./update-indicator";

export default function Nav({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { state } = useSidebar();
  return (
    <nav
      data-tauri-drag-region
      className={cn(
        "border-b pl-2 pr-2 h-11 shrink-0 flex items-center sticky top-0 w-full border-sidebar-border text-foreground bg-background gap-1",
        className ? className : ""
      )}
    >
      {state === "collapsed" && (
        <div className="w-18 shrink-0" />
      )}
      <SidebarTrigger className="btn-icon text-sidebar-foreground shrink-0" />
      <div className="flex flex-1 items-center justify-between min-w-0">
        {children}
      </div>
      <div className="app-no-drag">
        <UpdateIndicator />
      </div>
    </nav>
  );
}

