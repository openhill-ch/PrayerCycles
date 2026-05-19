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
  upNext: string
  moreItems: (count: number) => string
  noPrayersInListYet: string
  pickRandomList: string

  // Trash page
  deletedListsTitle: string
  noDeletedLists: string

  // History page
  historyComingSoon: string

  // Lifecycle
  timesInfinite: string
  timesCount: (count: number) => string
  everyUnit: (every: number, singular: string, plural: string) => string
}
