import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
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
import { initEncryption } from './lib/key-manager'
import { migrateUnencryptedData } from './db/encryption-hooks'
import { db } from './db/db'
import { TapPrayPage } from './routes/TapPrayPage'
import { ListsPage } from './routes/ListsPage'
import { ListDetailPage } from './routes/ListDetailPage'
import { TimerPage } from './routes/TimerPage'
import { HistoryPage } from './routes/HistoryPage'
import { TrashPage } from './routes/TrashPage'
import { TagsPage } from './routes/TagsPage'

/** The bottom-nav destinations, in order, for swipe navigation. */
const NAV_ROUTES = ['/', '/lists', '/timer', '/tags']

function AppContent() {
  const [addOpen, setAddOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  // Swipe left/right between the main pages, in addition to the bottom nav.
  function onPageTouchStart(e: React.TouchEvent) {
    const el = e.target as HTMLElement
    // leave gestures inside the wizard, drag handles and side-scrollers alone
    if (el.closest('[data-step], [data-no-page-swipe], input, textarea, select')) {
      swipeStart.current = null
      return
    }
    const p = e.touches[0]
    swipeStart.current = { x: p.clientX, y: p.clientY }
  }

  function onPageTouchEnd(e: React.TouchEvent) {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const p = e.changedTouches[0]
    const dx = p.clientX - start.x
    const dy = p.clientY - start.y
    // decisive horizontal only, so vertical scrolling is untouched
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return

    const i = NAV_ROUTES.indexOf(location.pathname)
    if (i === -1) return
    const next = dx < 0 ? i + 1 : i - 1
    if (next >= 0 && next < NAV_ROUTES.length) navigate(NAV_ROUTES[next])
  }

  // While a modal is up, hide the bottom nav and the add button: the nav would
  // otherwise ride above the keyboard on top of the modal's own buttons, and
  // navigating away mid-flow would silently discard what you were entering.
  const modalOpen = addOpen || exportOpen || langOpen || themeOpen || resetOpen

  useEffect(() => {
    applyTheme(getSavedTheme())
    initEncryption()
      .then(() => migrateUnencryptedData(db))
      .then(() => checkAndRestoreFromLocalStorage())
      .then(async (restored) => {
        if (restored) {
          window.dispatchEvent(new Event('prayercycles:refresh'))
        }
        await purgeExpiredLists()
        await ensureUnscheduledList()
        setReady(true)
      })
      .catch((err) => {
        console.error('Encryption init failed:', err)
        setReady(true)
      })
  }, [])

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-base text-text" />
  }

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
        <div
          className="flex flex-1 flex-col"
          onTouchStart={onPageTouchStart}
          onTouchEnd={onPageTouchEnd}
        >
          <Routes>
            <Route path="/" element={<TapPrayPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/lists/:id" element={<ListDetailPage />} />
            <Route path="/timer" element={<TimerPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/trash" element={<TrashPage />} />
          </Routes>
        </div>

        {!modalOpen && (
          <button
            onClick={() => setAddOpen(true)}
            className="fixed right-4 z-40 flex h-20 w-20 items-center justify-center rounded-full bg-input-hover text-text shadow-lg transition-colors hover:bg-input"
            style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom))' }}
            aria-label="Add"
          >
            <Plus size={36} />
          </button>
        )}

        <AddModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => window.dispatchEvent(new Event('prayercycles:refresh'))} />
        <ExportImportModal open={exportOpen} onClose={() => setExportOpen(false)} />
        <LanguageModal open={langOpen} onClose={() => setLangOpen(false)} />
        <ThemeModal open={themeOpen} onClose={() => setThemeOpen(false)} />
        <ResetDataModal open={resetOpen} onClose={() => setResetOpen(false)} />
        {!modalOpen && <BottomNav onNavigate={() => setMenuOpen(false)} />}
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
