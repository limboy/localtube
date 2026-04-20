import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function UpdateIndicator() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

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
              "h-7 px-3 text-xs shrink-0 rounded-full border-amber-600 text-amber-600 transition-all hover:bg-amber-600/10 hover:text-amber-600",
              isInstalling && "opacity-50 cursor-default"
            )}
            disabled={isInstalling}
            onClick={handleApply}
          >
            <span>{isInstalling ? "Restarting..." : "Update Available"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to restart and update to v{updateVersion}.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
