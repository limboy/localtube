import { MoonStar, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  // Resolve 'system' to actual 'light' or 'dark' for UI purposes
  const resolvedTheme =
    theme === "system"
      ? typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : (theme as "light" | "dark");

  const isLight = resolvedTheme === "light";

  return (
    <div
      className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full h-6 w-12 relative cursor-pointer select-none border border-zinc-200 dark:border-zinc-800 transition-colors [app-region:no-drag] [-webkit-app-region:no-drag]"
      onClick={() => setTheme(isLight ? "dark" : "light")}
    >
      <div
        className={cn(
          "absolute w-6 h-6 rounded-full transition-all duration-300 ease-in-out [app-region:no-drag] [-webkit-app-region:no-drag] -ml-[1px] -mt-[1px]",
          isLight 
            ? "left-0 bg-white border border-zinc-200 shadow-sm" 
            : "left-6 bg-black border border-zinc-800 shadow-none"
        )}
      />
      <div className="flex-1 flex items-center justify-center z-10">
        <Sun
          className={cn(
            "h-3.5 w-3.5 transition-all duration-300",
            isLight ? "text-zinc-900" : "text-zinc-500"
          )}
          strokeWidth={2}
        />
      </div>
      <div className="flex-1 flex items-center justify-center z-10">
        <MoonStar
          className={cn(
            "h-3.5 w-3.5 transition-all duration-300",
            !isLight ? "text-white" : "text-zinc-400"
          )}
          strokeWidth={2}
        />
      </div>
    </div>
  );
}
