import { useEffect, useState } from "react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowUpCircle, Loader2 } from "lucide-react";

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
    <SidebarMenuItem>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              className={cn(
                "justify-start text-amber-600 hover:bg-amber-600/10 hover:text-amber-600",
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
              <span>{isInstalling ? "Restarting..." : "Update Available"}</span>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Version {updateVersion} is ready to install</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </SidebarMenuItem>
  );
}
