import {
  faGamepad,
  faSlidersH,
  faUser,
  faUserAlt,
  faBarsProgress,
  faTv
} from '@fortawesome/free-solid-svg-icons'
import { useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'

import ContextProvider from 'frontend/state/ContextProvider'
import QuitButton from '../QuitButton'
import SidebarItem from '../SidebarItem'

import LogsIcon from 'frontend/assets/logs.svg?react'

export default function SidebarLinks() {
  const { t } = useTranslation()
  const location = useLocation()

  const {
    amazon,
    epic,
    gog,
    zoom,
    refreshLibrary
  } = useContext(ContextProvider)

  const loggedIn =
    epic.username || gog.username || amazon.user_id || zoom.username

  async function handleRefresh() {
    localStorage.setItem('scrollPosition', '0')

    const shouldRefresh =
      (epic.username && !epic.library.length) ||
      (gog.username && !gog.library.length) ||
      (amazon.user_id && !amazon.library.length) ||
      (zoom.username && !zoom.library.length)
    if (shouldRefresh) {
      return refreshLibrary({ runInBackground: true })
    }
    return
  }

  return (
    <div className="SidebarLinks Sidebar__section" data-tour="sidebar-menu">
      {!loggedIn && (
        <SidebarItem
          icon={faUser}
          label={t('button.login', 'Login')}
          url="/login"
          dataTour="sidebar-login"
        />
      )}
      <SidebarItem
        isActiveFallback={location.pathname.includes('gamepage')}
        url="/"
        icon={faGamepad}
        label={t('Library')}
        onClick={async () => handleRefresh()}
        dataTour="sidebar-library"
      />

      <SidebarItem
        url="/download-manager"
        icon={faBarsProgress}
        label={t('download-manager.link', 'Downloads')}
        dataTour="sidebar-downloads"
      />

      {loggedIn && (
        <SidebarItem
          url="/login"
          icon={faUserAlt}
          label={t('userselector.manageaccounts', 'Manage Accounts')}
          dataTour="sidebar-manage-accounts"
        />
      )}

      <div className="divider" />
      <SidebarItem
        icon={faSlidersH}
        label={t('Settings', 'Settings')}
        url="/settings/general"
        dataTour="sidebar-settings"
      />
      <SidebarItem
        customIcon={<LogsIcon />}
        label={t('settings.navbar.log', 'Log')}
        url="/settings/log"
        dataTour="sidebar-log"
      />

      <div className="divider" />

      <SidebarItem
        url="/console"
        icon={faTv}
        label={t('sidebar.console', 'Console Mode')}
        dataTour="sidebar-console"
      />

      <div data-tour="sidebar-community">
      </div>

      <QuitButton dataTour="sidebar-quit" />
    </div>
  )
}
