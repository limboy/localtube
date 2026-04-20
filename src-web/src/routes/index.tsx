import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import Nav from "@/components/nav";
import { UpdateIndicator } from "@/components/update-indicator";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    // We let AppSidebar handle the initial navigation to the first collection.
    // If no collections exist, it will stay here or we can handle fallback in AppSidebar.
  }, [navigate]);

  return (
    <div className={cn("flex flex-col h-screen items-center")}>
      <Nav>
        <div />
        <div className="flex items-center">
          <UpdateIndicator />
        </div>
      </Nav>

      <div className="flex-1 flex flex-col gap-2 items-center justify-center">
        <h1 className="text-4xl font-semibold text-primary">LocalTube</h1>
        <p className="opacity-50 text-xl">A YouTube Playlist & Channel Player</p>
      </div>
    </div>
  );
}
