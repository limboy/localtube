import { cn } from "@/lib/utils";

export default function Nav({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <nav
      data-tauri-drag-region
      className={cn(
        "border-b px-2 h-11 shrink-0 flex items-center sticky top-0 w-full justify-between border-sidebar-border text-foreground bg-background",
        className ? className : ""
      )}
    >
      {children}
    </nav>
  );
}
