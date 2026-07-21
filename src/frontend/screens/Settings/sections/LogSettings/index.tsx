import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UpdateComponent } from 'frontend/components/UI'
import './index.css'

import classNames from 'classnames'

import type { GetLogFileArgs } from 'backend/logger/paths'

interface LogBoxProps {
  logFileContent: string
}

const LogBox: React.FC<LogBoxProps> = ({ logFileContent }) => {
  const { t } = useTranslation()
  const maxLines = 1000
  let sliced = false
  let lines = logFileContent.split('\n')
  if (lines.length > maxLines) {
    lines = ['...', ...lines.slice(-maxLines)]
    sliced = true
  }

  return (
    <>
      {sliced && (
        <span className="setting long-log-hint">
          {t(
            'settings.log.long-log-hint',
            'Log truncated, last 1000 lines are shown!'
          )}
        </span>
      )}
      <span className="setting log-box">
        {lines.map((line, key) => {
          if (line.toLowerCase().includes(' err')) {
            return (
              <p key={key} className="log-error">
                {line}
              </p>
            )
          } else if (line.toLowerCase().includes(' warn')) {
            return (
              <p key={key} className="log-warning">
                {line}
              </p>
            )
          } else {
            return (
              <p key={key} className="log-info">
                {line}
              </p>
            )
          }
        })}
      </span>
    </>
  )
}

export default function LogSettings() {
  const { t } = useTranslation()

  const [logFileContent, setLogFileContent] = useState<string>('')
  const [showLogOf, setShowLogOf] = useState<GetLogFileArgs>({})
  const [refreshing, setRefreshing] = useState<boolean>(true)

  const logFilesToShow: { title: string; args: GetLogFileArgs }[] = [
    { title: 'Relic', args: {} },
    { title: 'Epic/Legendary', args: { runner: 'legendary' } },
    { title: 'GOG', args: { runner: 'gog' } },
    { title: 'Amazon/Nile', args: { runner: 'nile' } },
    { title: 'Zoom', args: { runner: 'zoom' } }
  ]

  const getLogContent = () => {
    void window.api.getLogContent(showLogOf).then((content: string) => {
      if (!content) {
        setLogFileContent(t('setting.log.no-file', 'No log file found.'))
        return setRefreshing(false)
      }
      setLogFileContent(content)
      setRefreshing(false)
    })
  }

  useEffect(() => {
    getLogContent()
    const interval = setInterval(() => {
      getLogContent()
    }, 1000)
    return () => clearInterval(interval)
  }, [showLogOf])

  return (
    <>
      <h3>{t('setting.log.instructions_title', 'How to report a problem?')}</h3>
      <p className="report-problem-instructions">
        {t(
          'setting.log.instructions',
          'Share these logs and any relevant information about your problem.'
        )}
      </p>
      <div className="logs-wrapper">
        <span className="log-buttongroup">
          {logFilesToShow.map(({ title, args }, i) => {
            const isSelected =
              args.appName === showLogOf.appName &&
              args.runner === showLogOf.runner
            return (
              <a
                key={i}
                className={`log-buttons ${isSelected ? 'log-choosen' : ''}`}
                onClick={() => {
                  setRefreshing(true)
                  setShowLogOf(args)
                }}
                title={title}
              >
                {title}
              </a>
            )
          })}
        </span>

        {refreshing ? (
          <span className="setting log-box">
            <UpdateComponent />
          </span>
        ) : (
          <LogBox logFileContent={logFileContent} />
        )}
      </div>
    </>
  )
}
