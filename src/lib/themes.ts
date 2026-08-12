export type ThemeId = 'slate' | 'nuudelchin' | 'adelboden' | 'sakura' | 'newsmyrna'

export type ThemeDef = {
  id: ThemeId
  /** Display name (localized via i18n) */
  labelKey: string
  /** Preview swatch colors: [base, card, accent] */
  swatches: [string, string, string]
}

export const themes: ThemeDef[] = [
  {
    id: 'slate',
    labelKey: 'themeSlate',
    swatches: ['#0f172a', '#1e293b', '#0ea5e9'],
  },
  {
    id: 'nuudelchin',
    labelKey: 'themeNuudelchin',
    swatches: ['#1a1209', '#2a1f11', '#c8902e'],
  },
  {
    id: 'adelboden',
    labelKey: 'themeAdelboden',
    swatches: ['#ffffff', '#dce8f0', '#2a7a9c'],
  },
  {
    id: 'sakura',
    labelKey: 'themeSakura',
    swatches: ['#fdf2f4', '#f8d7dc', '#c03860'],
  },
  {
    id: 'newsmyrna',
    labelKey: 'themeNewSmyrna',
    swatches: ['#c0dce8', '#fdf4c0', '#1898a0'],
  },
]

const STORAGE_KEY = 'prayercycles-theme'

export function getSavedTheme(): ThemeId {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && themes.some((t) => t.id === saved)) return saved as ThemeId
  return 'slate'
}

export function saveTheme(id: ThemeId) {
  localStorage.setItem(STORAGE_KEY, id)
}

export function applyTheme(id: ThemeId) {
  if (id === 'slate') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', id)
  }
  saveTheme(id)
}
