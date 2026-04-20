import * as React from "react";
import { useSidebar } from "./ui/sidebar";

type SidebarContext = ReturnType<typeof useSidebar>;

const LeftSidebarContext = React.createContext<SidebarContext | null>(null);

export function LeftSidebarProvider({ children }: { children: React.ReactNode }) {
  const sidebar = useSidebar();
  return (
    <LeftSidebarContext.Provider value={sidebar}>
      {children}
    </LeftSidebarContext.Provider>
  );
}

export function useLeftSidebar() {
  const context = React.useContext(LeftSidebarContext);
  if (!context) {
    // Fallback to regular useSidebar if not within LeftSidebarProvider
    // This makes it work even if we forget to wrap it, though it might be shadowed.
    return useSidebar();
  }
  return context;
}
