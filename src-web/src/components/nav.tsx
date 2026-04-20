import { cn } from "@/lib/utils";
import { useSidebar } from "./ui/sidebar";
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
        "border-b pl-2 pr-2 h-11 shrink-0 flex items-center sticky top-0 z-10 w-full border-sidebar-border text-foreground bg-background gap-1",
        className ? className : ""
      )}
    >
      {state === "collapsed" && (
        <div className="w-26 shrink-0" />
      )}
      <div className="flex flex-1 items-center justify-between min-w-0 mx-2">
        {children}
      </div>
      <UpdateIndicator />
    </nav>
  );
}

