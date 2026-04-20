import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full h-5 w-10 relative cursor-pointer select-none hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors [app-region:no-drag] [-webkit-app-region:no-drag]"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <div
        className={cn(
          "absolute top-0.5 bottom-0.5 w-4 h-4 bg-white dark:bg-zinc-950 rounded-full shadow-sm transition-all duration-300 ease-in-out [app-region:no-drag] [-webkit-app-region:no-drag]",
          theme === "light" ? "left-0.5" : "left-5.5"
        )}
      />
      <div className="flex-1 flex items-center justify-center z-10">
        <Sun
          className={cn(
            "h-3 w-3 transition-all duration-300",
            theme === "light" ? "text-zinc-900 scale-110" : "text-zinc-500"
          )}
        />
      </div>
      <div className="flex-1 flex items-center justify-center z-10">
        <Moon
          className={cn(
            "h-3 w-3 transition-all duration-300",
            theme === "dark" ? "text-zinc-200 scale-110" : "text-zinc-500"
          )}
        />
      </div>
    </div>
  );
}
