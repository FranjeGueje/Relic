import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { ChangelogModal } from '../../../ChangelogModal'
import './index.scss'

type Release = {
  html_url: string
  name: string
  tag_name: string
  published_at: string
  type: 'stable' | 'beta'
  id: number
  body?: string
}

const storage = window.localStorage
const lastVersion = storage.getItem('last_version')?.replaceAll('"', '')

export default React.memo(function RelicVersion() {
  const { t } = useTranslation()
  const [relicVersion, setRelicVersion] = useState('')
  const [newReleases, setNewReleases] = useState<Release[]>()
  const [showChangelogModal, setShowChangelogModal] = useState(true)
  const [showChangelogModalOnClick, setShowChangelogModalOnClick] =
    useState(false)

  const { hideChangelogsOnStartup, lastChangelogShown, setLastChangelogShown } =
    useContext(ContextProvider)

  useEffect(() => {
    void window.api.getRelicVersion().then((version) => {
      if (version !== lastVersion) {
        window.api.logInfo('Updated to a new version, cleaaning up the cache.')
        window.api.clearCache(false, true)
      }
      storage.setItem('last_version', JSON.stringify(version))
      setRelicVersion(version)
    })
  }, [])

  useEffect(() => {
    window.api
      .getLatestReleases()
      .then((releases) => setNewReleases(releases))
      .catch((error) => {
        console.error('Failed to get latest releases:', error)
      })
  }, [])

  const newStable: Release | undefined = newReleases?.filter(
    (r) => r.type === 'stable'
  )[0]
  const newBeta: Release | undefined = newReleases?.filter(
    (r) => r.type === 'beta'
  )[0]
  const shouldShowUpdates = newBeta || newStable

  const version = relicVersion

  return (
    <div className="relicVersionContainer" data-tour="sidebar-version">
      {((showChangelogModal &&
        !hideChangelogsOnStartup &&
        relicVersion !== lastChangelogShown) ||
        showChangelogModalOnClick) && (
        <ChangelogModal
          dimissVersionCheck
          onClose={() => {
            setShowChangelogModal(false)
            setShowChangelogModalOnClick(false)
            setLastChangelogShown(relicVersion)
          }}
        />
      )}
      <div className="relicVersionWrapper">
        <span
          className="relicVersion"
          role="link"
          title={t(
            'info.relic.click-to-see-changelog',
            'Click to see changelog'
          )}
          onClick={() => setShowChangelogModalOnClick((current) => !current)}
        >
          <span className="relicVersion__title">
            <span>{t('info.relic.version', 'Relic Version')}: </span>
          </span>
          <strong>{version}</strong>
        </span>
      </div>
      {shouldShowUpdates && (
        <div className="relicNewReleases">
          <span>{t('info.relic.newReleases', 'Update Available!')}</span>
          {newStable && (
            <a
              title={newStable.tag_name}
              onClick={() => window.api.openExternalUrl(newStable.html_url)}
            >
              {t('info.relic.stable', 'Stable')} ({newStable.tag_name})
            </a>
          )}
          {newBeta && (
            <a
              title={newBeta.tag_name}
              onClick={() => window.api.openExternalUrl(newBeta.html_url)}
            >
              {t('info.relic.beta', 'Beta')} ({newBeta.tag_name})
            </a>
          )}
        </div>
      )}
    </div>
  )
})
