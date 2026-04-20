import { createContext, useContext, useEffect, useState } from "react";
import { getTheme, setTheme as setStoredTheme } from "@/lib/utils";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const getStoredTheme = async (defaultTheme: Theme): Promise<Theme> => {
  try {
    const storedTheme = (await getTheme()) as Theme;
    return storedTheme || defaultTheme;
  } catch (error) {
    console.warn(
      "Failed to read theme from store:",
      error instanceof Error ? error.message : error
    );
    return defaultTheme;
  }
};

export function ThemeProvider({ children, defaultTheme = "system", ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // Initialize theme from store
  useEffect(() => {
    getStoredTheme(defaultTheme).then(setTheme);
  }, [defaultTheme]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      try {
        setStoredTheme(theme);
      } catch (error) {
        console.warn(
          "Failed to save theme to store:",
          error instanceof Error ? error.message : error
        );
      }
      setTheme(theme);
    }
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
