export type ThemeId = 'slate' | 'nuudelchin' | 'tal' | 'khentii' | 'adelboden' | 'fruehling' | 'thun' | 'sakura' | 'kyoto' | 'chikurin' | 'newsmyrna' | 'birch' | 'boulderfield'

export type ThemeGroup = 'default' | 'mongolian' | 'swiss' | 'japanese' | 'american'

export type ThemeDef = {
  id: ThemeId
  /** Display name (localized via i18n) */
  labelKey: string
  /** Preview swatch colors: [base, card, accent] */
  swatches: [string, string, string]
  /** Which group this theme belongs to */
  group: ThemeGroup
}

export const themes: ThemeDef[] = [
  {
    id: 'slate',
    labelKey: 'themeSlate',
    swatches: ['#0f172a', '#1e293b', '#0ea5e9'],
    group: 'default',
  },
  {
    id: 'nuudelchin',
    labelKey: 'themeNuudelchin',
    swatches: ['#1a1209', '#2a1f11', '#c8902e'],
    group: 'mongolian',
  },
  {
    id: 'tal',
    labelKey: 'themeTal',
    swatches: ['#6ea860', '#162118', '#6aad5a'],
    group: 'mongolian',
  },
  {
    id: 'khentii',
    labelKey: 'themeKhentii',
    swatches: ['#4a90c4', '#1a4a80', '#e8c020'],
    group: 'mongolian',
  },
  {
    id: 'adelboden',
    labelKey: 'themeAdelboden',
    swatches: ['#ffffff', '#dce8f0', '#2a7a9c'],
    group: 'swiss',
  },
  {
    id: 'fruehling',
    labelKey: 'themeFruehling',
    swatches: ['#c8e0a0', '#fdf5e6', '#b07c18'],
    group: 'swiss',
  },
  {
    id: 'thun',
    labelKey: 'themeThun',
    swatches: ['#8a8e92', '#4a5668', '#38b0b8'],
    group: 'swiss',
  },
  {
    id: 'sakura',
    labelKey: 'themeSakura',
    swatches: ['#fdf2f4', '#f8d7dc', '#c03860'],
    group: 'japanese',
  },
  {
    id: 'kyoto',
    labelKey: 'themeKyoto',
    swatches: ['#1a1008', '#2c1e10', '#c83028'],
    group: 'japanese',
  },
  {
    id: 'chikurin',
    labelKey: 'themeChikurin',
    swatches: ['#0c1a0e', '#1a2e18', '#c8b040'],
    group: 'japanese',
  },
  {
    id: 'newsmyrna',
    labelKey: 'themeNewSmyrna',
    swatches: ['#c0dce8', '#fdf4c0', '#1898a0'],
    group: 'american',
  },
  {
    id: 'birch',
    labelKey: 'themeBirch',
    swatches: ['#2e6a57', '#f4f2eb', '#c8b860'],
    group: 'american',
  },
  {
    id: 'boulderfield',
    labelKey: 'themeBoulderField',
    swatches: ['#c8843c', '#584838', '#d89030'],
    group: 'american',
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
