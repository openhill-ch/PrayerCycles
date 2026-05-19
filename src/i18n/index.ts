import { createContext, useContext } from 'react'
import type { Locale, Translations } from './types'
import { en } from './en'
import { ja } from './ja'
import { gsw } from './gsw'
import { mn } from './mn'

export type { Locale, Translations }

export const translations: Record<Locale, Translations> = { en, ja, gsw, mn }

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  gsw: 'Schwiizerdütsch',
  mn: 'Монгол',
}

const STORAGE_KEY = 'prayercycles_locale'

export function getSavedLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && saved in translations) return saved as Locale
  return 'en'
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale)
}

export const I18nContext = createContext<{
  locale: Locale
  t: Translations
  setLocale: (l: Locale) => void
}>({
  locale: 'en',
  t: en,
  setLocale: () => {},
})

export function useT() {
  return useContext(I18nContext)
}
