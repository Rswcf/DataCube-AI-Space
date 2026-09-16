"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { translations, type Language, type TranslationKey } from "./translations";
import { getLanguageFromPathname, toBcp47, toLocalizedPath } from "./i18n";

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
 * Provides theme (dark/light) and language (de/en/...) settings to the app.
 *
 * Wraps the entire app in layout.tsx. Persists preferences to localStorage.
 * Default: dark theme. Initial language comes from the URL-derived `initialLanguage`
 * prop (passed by the [lang] root layout from the URL segment), NOT from a hard-coded
 * 'de' default. Previously the strict default caused /en to SSR German content
 * until JS mounted, which search engines indexed as duplicate/wrong-language.
 *
 * @example
 * // In layout.tsx (already configured)
 * <SettingsProvider initialLanguage={rawLang}>
 *   {children}
 * </SettingsProvider>
 */
export function SettingsProvider({
  children,
  initialLanguage = "de",
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>("dark");
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // The chat/report API guard (lib/server/api-guard.ts) requires a `visited`
    // cookie as a cheap must-have-loaded-the-site barrier. The middleware used
    // to set it on every page response, which stamped a Set-Cookie header on
    // otherwise cacheable pages; set it from the client instead so ISR output
    // stays byte-identical for everyone.
    try {
      if (!/(?:^|;\s*)visited=true(?:;|$)/.test(document.cookie)) {
        document.cookie = "visited=true; path=/; max-age=2592000; samesite=lax";
      }
    } catch {
      // Cookies blocked — the guard will answer 401 and the widgets say so.
    }
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedLanguage = localStorage.getItem("language") as Language | null;

    if (savedTheme) {
      setThemeState(savedTheme);
    }
    // Apply saved language ONLY when the URL does not already specify one.
    // URL-based language always wins to prevent /en flickering back to a
    // stored 'de' preference before the pathname effect corrects it.
    const urlLang = getLanguageFromPathname(window.location.pathname);
    if (savedLanguage && !urlLang) {
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
    document.documentElement.lang = toBcp47(language);
  }, [language, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);

    const currentPath = pathname || "/";
    const isLocalizablePath =
      currentPath === "/" ||
      /^\/(de|en|zh|fr|es|pt|ja|ko)$/.test(currentPath) ||
      currentPath.startsWith("/week/") ||
      /^\/(de|en|zh|fr|es|pt|ja|ko)\/week\//.test(currentPath);

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
