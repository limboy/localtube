import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebar } from "./ui/sidebar";
import { ArrowUpCircle, Loader2 } from "lucide-react";

export function UpdateIndicator() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  useEffect(() => {
    const unlisten = window.electron.onUpdateReady((info: { version: string }) => {
      setUpdateVersion(info.version);
    });

    if (import.meta.env.DEV) {
      (window as any).__triggerUpdatePreview = (version = "1.2.3") => {
        setUpdateVersion(version);
      };
    }

    return unlisten;

  }, []);

  if (!updateVersion) return null;

  const handleApply = async () => {
    setIsInstalling(true);
    try {
      await window.electron.updater.install();
    } catch (error) {
      console.error("Update installation failed:", error);
      setIsInstalling(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "h-8 text-xs shrink-0 rounded-md border-amber-600/50 text-amber-600 transition-all hover:bg-amber-600/10 hover:text-amber-600 hover:border-amber-600",
              isCollapsed ? "w-8 p-0" : "w-full px-3 justify-start gap-2",
              isInstalling && "opacity-50 cursor-default"
            )}
            disabled={isInstalling}
            onClick={handleApply}
          >
            {isInstalling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-4 w-4" />
            )}
            {!isCollapsed && (
              <span>{isInstalling ? "Restarting..." : "Update Available"}</span>
            )}
          </Button>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  );
}

