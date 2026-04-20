import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent={true}>
        <Tooltip>
          <DropdownMenuTrigger className="focus:outline-none focus-visible:right-0">
            <TooltipTrigger asChild>
              <span className="btn-icon">
                {theme === "light" ? (
                  <Sun size={16} strokeWidth={1.5} />
                ) : theme === "dark" ? (
                  <Moon size={16} strokeWidth={1.5} />
                ) : (
                  <Laptop size={16} strokeWidth={1.5} />
                )}
              </span>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent>
            <p>Appearance</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Laptop className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
