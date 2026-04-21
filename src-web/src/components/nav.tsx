import { cn } from "@/lib/utils";
import { useLeftSidebar } from "./left-sidebar-context";
import { Button } from "./ui/button";
import { PanelLeft } from "lucide-react";

export default function Nav({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { state: leftState, toggleSidebar: toggleLeftSidebar } = useLeftSidebar();

  return (
    <nav
      className={cn(
        "border-b pl-2 pr-2 h-11 shrink-0 flex items-center sticky top-0 z-10 w-full border-sidebar-border text-foreground bg-background gap-1",
        className ? className : ""
      )}
    >
      <div className="flex items-center">
        <div
          className={cn(
            "transition-[width] duration-150 ease-in-out shrink-0 overflow-hidden",
            leftState === "collapsed" ? "w-20" : "w-0"
          )}
        />
        <Button
          data-sidebar="trigger"
          variant="ghost"
          size="icon"
          className="h-7 w-7 [app-region:no-drag] [-webkit-app-region:no-drag] shrink-0"
          onClick={toggleLeftSidebar}
        >
          <PanelLeft size={18} strokeWidth={2} />
          <span className="sr-only">Toggle Left Sidebar</span>
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-between min-w-0">
        {children}
      </div>
    </nav>
  );
}

