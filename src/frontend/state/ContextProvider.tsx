import React from 'react'

import { ContextType } from 'frontend/types'

const initialContext: ContextType = {
  epic: {
    library: [],
    login: async () => Promise.resolve(''),
    logout: async () => Promise.resolve()
  },
  gog: {
    library: [],
    login: async () => Promise.resolve(''),
    logout: async () => Promise.resolve()
  },
  amazon: {
    library: [],
    getLoginData: async () =>
      Promise.resolve({
        client_id: '',
        code_verifier: '',
        serial: '',
        url: ''
      }),
    login: async () => Promise.resolve(''),
    logout: async () => Promise.resolve()
  },
  zoom: {
    library: [],
    login: async () => Promise.resolve(''),
    logout: async () => Promise.resolve()
  },
  installingEpicGame: false,
  sideloadedLibrary: [],
  error: false,
  gameUpdates: [],
  libraryStatus: [],
  platform: 'unknown',
  refresh: async () => Promise.resolve(),
  refreshLibrary: async () => Promise.resolve(),
  refreshing: false,
  refreshingInTheBackground: true,
  isRTL: false,
  isFullscreen: false,
  isFrameless: false,
  language: 'en',
  setLanguage: () => null,
  hiddenGames: {
    list: [],
    add: () => null,
    remove: () => null
  },
  currentCustomCategories: [],
  setCurrentCustomCategories: () => null,
  favouriteGames: {
    list: [],
    add: () => null,
    remove: () => null
  },
  customCategories: {
    list: {},
    listCategories: () => [],
    addToGame: () => null,
    removeFromGame: () => null,
    addCategory: () => null,
    removeCategory: () => null,
    renameCategory: () => null
  },
  theme: 'midnightMirage',
  setTheme: () => null,
  allTilesInColor: false,
  setAllTilesInColor: () => null,
  titlesAlwaysVisible: false,
  setTitlesAlwaysVisible: () => null,
  sidebarCollapsed: false,
  setSideBarCollapsed: () => null,
  activeController: '',
  connectivity: { status: 'online', retryIn: 0 },
  dialogModalOptions: { showDialog: false },
  showDialogModal: () => null,
  showResetDialog: () => null,
  externalLinkDialogOptions: { showDialog: false },
  handleExternalLinkDialog: () => null,
  lastChangelogShown: null,
  setLastChangelogShown: () => null,
  help: {
    items: {},
    addHelpItem: () => null,
    removeHelpItem: () => null
  },
  experimentalFeatures: {
    enableHelp: false,
    cometSupport: true
  },
  handleExperimentalFeatures: () => null,
  disableDialogBackdropClose: false,
  setDisableDialogBackdropClose: () => null,
}

export default React.createContext(initialContext)
