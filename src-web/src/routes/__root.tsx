import { createRootRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";

export const Route = createRootRoute({
  component: Layout
});

function disableMenu() {
  if (import.meta.env.PROD) {
    document.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
        return false;
      },
      false
    );

    document.addEventListener(
      "selectstart",
      (e) => {
        e.preventDefault();
        return false;
      },
      { capture: true }
    );
  }
}

function Layout() {
  useEffect(() => {
    disableMenu();
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 bg-background text-foreground overflow-hidden">
          <Outlet />
        </main>
        <Toaster />
      </SidebarProvider>
    </ThemeProvider>
  );
}
