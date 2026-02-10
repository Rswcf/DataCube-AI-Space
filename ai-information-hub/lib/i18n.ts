export const SUPPORTED_LANGUAGES = ['de', 'en'] as const

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage)
}

export function getLanguageFromPathname(pathname: string): AppLanguage | null {
  const match = pathname.match(/^\/(de|en)(?:\/|$)/)
  if (!match) return null
  return match[1] as AppLanguage
}

function stripLanguagePrefix(pathname: string): string {
  const stripped = pathname.replace(/^\/(de|en)(?=\/|$)/, '')
  return stripped || '/'
}

export function toLocalizedPath(pathname: string, language: AppLanguage): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  const basePath = stripLanguagePrefix(normalized)

  if (basePath === '/') return `/${language}`
  return `/${language}${basePath}`
}
