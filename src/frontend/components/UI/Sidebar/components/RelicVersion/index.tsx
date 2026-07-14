import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './index.scss'

const storage = window.localStorage
const lastVersion = storage.getItem('last_version')?.replaceAll('"', '')

export default React.memo(function RelicVersion() {
  const { t } = useTranslation()
  const [relicVersion, setRelicVersion] = useState('')

  useEffect(() => {
    void window.api.getRelicVersion().then((version) => {
      if (version !== lastVersion) {
        window.api.logInfo('Updated to a new version, cleaning up the cache.')
        window.api.clearCache(false, true)
      }
      storage.setItem('last_version', JSON.stringify(version))
      setRelicVersion(version)
    })
  }, [])

  const version = relicVersion

  return (
    <div className="relicVersionContainer">
      <div className="relicVersionWrapper">
        <span className="relicVersion__title">
          <span>{t('info.relic.version', 'Relic Version')}: </span>
        </span>
        <strong>{version}</strong>
      </div>
    </div>
  )
})
