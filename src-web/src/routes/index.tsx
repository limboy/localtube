import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import ThemeSwitcher from "@/components/theme-switcher";
import Nav from "@/components/nav";

export const Route = createFileRoute("/")({
  component: Index
});

function Index() {
  return (
    <div className={cn("flex flex-col h-screen items-center")}>
      <Nav>
        <div />
        <ThemeSwitcher />
      </Nav>

      <div className="flex-1 flex flex-col gap-2 items-center justify-center">
        <h1 className="text-4xl font-semibold text-primary">LocalTube</h1>
        <p className="opacity-50 text-xl">A YouTube Playlist & Channel Player</p>
      </div>
    </div>
  );
}
