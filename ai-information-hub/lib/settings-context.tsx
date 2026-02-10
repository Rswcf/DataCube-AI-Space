"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { translations, type Language, type TranslationKey } from "./translations";
import { getLanguageFromPathname, toLocalizedPath } from "./i18n";

type Theme = "dark" | "light";

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Provides theme (dark/light) and language (de/en) settings to the app.
 *
 * Wraps the entire app in layout.tsx. Persists preferences to localStorage.
 * Default: dark theme, German language.
 *
 * @example
 * // In layout.tsx (already configured)
 * <SettingsProvider>
 *   {children}
 * </SettingsProvider>
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>("dark");
  const [language, setLanguageState] = useState<Language>("de");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for saved preferences
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedLanguage = localStorage.getItem("language") as Language | null;

    if (savedTheme) {
      setThemeState(savedTheme);
    }
    if (savedLanguage) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    const pathLanguage = getLanguageFromPathname(pathname || "");
    if (pathLanguage && pathLanguage !== language) {
      setLanguageState(pathLanguage);
    }
  }, [pathname, language]);

  useEffect(() => {
    if (!mounted) return;

    // Apply theme to document
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }, [language, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);

    const currentPath = pathname || "/";
    const isLocalizablePath =
      currentPath === "/" ||
      currentPath === "/de" ||
      currentPath === "/en" ||
      currentPath.startsWith("/week/") ||
      currentPath.startsWith("/de/week/") ||
      currentPath.startsWith("/en/week/");

    if (!isLocalizablePath) return;

    const targetPath = toLocalizedPath(currentPath, newLanguage);
    const queryString = typeof window !== "undefined"
      ? window.location.search.replace(/^\?/, "")
      : "";
    const nextUrl = queryString ? `${targetPath}?${queryString}` : targetPath;
    const currentUrl = queryString ? `${currentPath}?${queryString}` : currentPath;

    if (nextUrl !== currentUrl) {
      router.push(nextUrl);
    }
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Access theme, language, and translation function from any component.
 *
 * @returns {SettingsContextType} Settings context with theme, language, and t() function
 * @throws Error if used outside SettingsProvider
 *
 * @example
 * const { language, t } = useSettings();
 * return <h1>{t("aiTechProgress")}</h1>; // Returns German or English string
 *
 * @example
 * const { theme, setTheme } = useSettings();
 * <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
 *   Toggle theme
 * </button>
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
