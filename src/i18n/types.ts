export type Locale = 'en' | 'ja' | 'gsw' | 'mn'

export type Translations = {
  // App-wide
  appName: string
  close: string
  cancel: string
  save: string
  delete: string
  edit: string
  back: string
  add: string
  yes: string
  no: string
  loading: string

  // Bottom nav
  navTapPray: string
  navPrayerLists: string
  navTimebox: string

  // Side menu
  prayerHistory: string
  exportImport: string
  deletedLists: string
  resetPrayerData: string
  languages: string
  devMode: string
  themes: string

  // Timer bar
  praying: string
  todaysPrayers: string
  selectAList: string
  noOtherLists: string
  openMenu: string
  startTimer: string
  pauseTimer: string
  resetTimer: string
  autoToggleOnTooltip: string
  autoToggleOffTooltip: string

  // Tap Pray page
  noPrayersToShow: string
  undoLastCompletion: string

  // Lists page
  searchPrayers: string
  noListsYet: string
  deactivated: string
  surfacedLabel: string
  todaysPrayersDesc: string
  noPrayersSurfaced: string
  expand: string
  noPrayersYet: string
  prayerCount: (count: number) => string

  // List detail page
  backToPrayerLists: string
  descriptionOptional: string
  cycle: string
  daily: string
  weekly: string
  monthly: string
  annually: string
  frequency: string
  wake: string
  passage: string
  season: string
  orbit: string
  wakeTooltip: string
  passageTooltip: string
  seasonTooltip: string
  orbitTooltip: string
  every: string
  day: string
  days: string
  week: string
  weeks: string
  month: string
  months: string
  year: string
  years: string
  lifecycle: string
  indefinite: string
  finite: string
  retiresAfter: string
  completion: string
  completions: string
  active: string
  inactive: string
  activeTapToDeactivate: string
  deactivatedTapToReactivate: string
  deleteConfirm: string
  addPrayersToList: string
  addPrayersPlaceholder: string
  addPrayersExample: string
  sortOriginal: string
  sortAZ: string
  sortZA: string
  sortMostPrayed: string
  sortLeastPrayed: string
  noPrayersInList: string

  // Add modal
  newPrayerList: string
  newPrayer: string
  listName: string
  prayersOnePerLine: string
  prayersPlaceholder: string
  createList: string
  prayerTitle: string
  addPrayer: string
  noListsCreateFirst: string
  addToList: string

  // Prayer card
  prayedTally: (count: number, date: string) => string
  markAsPrayed: (title: string) => string
  time: string
  times: string

  // Prayer detail modal
  prayer: string
  addDescription: string
  deletePrayerConfirm: string

  // Export/Import
  exportImportTitle: string
  exportImportDesc: string
  exportBtn: string
  importBtn: string
  backupDownloaded: string
  exportFailed: string
  dataRestored: string
  importFailed: string

  // Timer page
  nowPraying: string
  selectAPrayerList: string
  noPrayersInThisList: string
  timePerPrayer: string
  totalTimebox: string
  autoAdjust: string
  upNext: string
  moreItems: (count: number) => string
  noPrayersInListYet: string
  pickRandomList: string

  // Trash page
  deletedListsTitle: string
  noDeletedLists: string
  restore: string
  daysUntilDeletion: (days: number) => string
  deletedListsDesc: string

  // History page
  historyComingSoon: string
  prayerListView: string
  noHistoryYet: string
  timePrayedToday: string
  timesPrayedToday: string
  formatDuration: (seconds: number) => string

  // List detail — reorder
  sortCustom: string
  setDefaultOrder: string
  resetOrderConfirm: string

  // Total time prayed
  totalTimePrayed: string
  formatTimePrayed: (totalSeconds: number) => string

  // Lifecycle
  timesInfinite: string
  timesCount: (count: number) => string
  everyUnit: (every: number, singular: string, plural: string) => string

  // Tags
  navPrayerTags: string
  prayerTags: string
  prayerTagsDesc: string
  noTagsYet: string
  tags: string
  tagsPlaceholder: string
  tagUsage: (lists: number, prayers: number) => string
  unscheduled: string
  createTag: string
  newTagPlaceholder: string
  filterByTags: string
  seeMore: string
  seeLess: string

  // Themes
  themeSlate: string
  themeNuudelchin: string
  themeTal: string
  themeKhentii: string
  themeAdelboden: string
  themeFruehling: string
  themeThun: string
  themeGroupMongolian: string
  themeGroupSwiss: string

  // Reset data
  resetAll: string
  resetAllDesc: string
  resetStats: string
  resetStatsDesc: string
  resetHistory: string
  resetHistoryDesc: string
  resetTags: string
  resetTagsDesc: string
  resetConfirmTap: string
  resetSuccess: string

  // Fulfilled
  fulfilled: string
  markAsFulfilled: string
  unfulfill: string
  showFulfilled: string
  fulfilledCount: (count: number) => string
}
