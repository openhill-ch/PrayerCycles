import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { TimerBar } from './components/TimerBar'
import { BottomNav } from './components/BottomNav'
import { SideMenu } from './components/SideMenu'
import { AddModal } from './components/AddModal'
import { ExportImportModal } from './components/ExportImportModal'
import { LanguageModal } from './components/LanguageModal'
import { ThemeModal } from './components/ThemeModal'
import { ResetDataModal } from './components/ResetDataModal'
import { TimerProvider } from './context/TimerContext'
import { checkAndRestoreFromLocalStorage } from './features/backup/local-backup'
import { purgeExpiredLists, ensureUnscheduledList } from './features/cycles/list-operations'
import { I18nContext, translations, getSavedLocale, saveLocale, type Locale } from './i18n'
import { getSavedTheme, applyTheme } from './lib/themes'
import { TapPrayPage } from './routes/TapPrayPage'
import { ListsPage } from './routes/ListsPage'
import { ListDetailPage } from './routes/ListDetailPage'
import { TimerPage } from './routes/TimerPage'
import { HistoryPage } from './routes/HistoryPage'
import { TrashPage } from './routes/TrashPage'
import { TagsPage } from './routes/TagsPage'

function AppContent() {
  const [addOpen, setAddOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    applyTheme(getSavedTheme())
    checkAndRestoreFromLocalStorage().then((restored) => {
      if (restored) {
        window.dispatchEvent(new Event('prayercycles:refresh'))
      }
    })
    purgeExpiredLists()
    ensureUnscheduledList()
  }, [])

  return (
      <TimerProvider>
      <div className="flex min-h-screen flex-col bg-base text-text">
        <TimerBar onMenuOpen={() => setMenuOpen(true)} />
        <SideMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onExportImport={() => setExportOpen(true)}
          onLanguages={() => setLangOpen(true)}
          onThemes={() => setThemeOpen(true)}
          onResetData={() => setResetOpen(true)}
        />
        <Routes>
          <Route path="/" element={<TapPrayPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/lists/:id" element={<ListDetailPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/trash" element={<TrashPage />} />
        </Routes>

        <button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-input-hover text-text shadow-lg hover:bg-input"
          aria-label="Add"
        >
          <Plus size={24} />
        </button>

        <AddModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => window.dispatchEvent(new Event('prayercycles:refresh'))} />
        <ExportImportModal open={exportOpen} onClose={() => setExportOpen(false)} />
        <LanguageModal open={langOpen} onClose={() => setLangOpen(false)} />
        <ThemeModal open={themeOpen} onClose={() => setThemeOpen(false)} />
        <ResetDataModal open={resetOpen} onClose={() => setResetOpen(false)} />
        <BottomNav onNavigate={() => setMenuOpen(false)} />
      </div>
      </TimerProvider>
  )
}

export function App() {
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    saveLocale(l)
  }, [])

  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </I18nContext.Provider>
  )
}

export default App
