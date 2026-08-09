import './index.css'
import { useHasProgress } from 'frontend/hooks/useHasProgress'
import { useEffect, useMemo, useState } from 'react'
import { Box, LinearProgress, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DownloadManagerState, Runner } from 'common/types'

interface Point {
  download: number
  disk: number
}

const roundToNearestHundredth = function (val: number | undefined) {
  if (!val) return 0
  return Math.round(val * 100) / 100
}

const CHART_W = 100
const CHART_H = 80

function SpeedChart({ data }: { data: Point[] }) {
  const paths = useMemo(() => {
    const maxVal = Math.max(1, ...data.map((p) => Math.max(p.download, p.disk)))
    const toX = (i: number) => (i / (data.length - 1)) * CHART_W
    const toY = (v: number) => CHART_H - (v / maxVal) * CHART_H
    const dl = data.map((p, i) => `${toX(i)},${toY(p.download)}`).join(' L')
    const disk = data.map((p, i) => `${toX(i)},${toY(p.disk)}`).join(' L')
    return {
      fill: `M0,${CHART_H} L${dl} L${CHART_W},${CHART_H} Z`,
      line: `M${disk}`
    }
  }, [data])

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      style={{ width: '100%', height: '80px', display: 'block' }}
    >
      <path d={paths.fill} fill="var(--accent)" fillOpacity={0.5} />
      <path
        d={paths.line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
      />
    </svg>
  )
}

export default function ProgressHeader(props: {
  appName: string
  state: DownloadManagerState
  runner: Runner
}) {
  const sampleSize = 100
  const { t } = useTranslation()
  const [progress] = useHasProgress(props.appName, props.runner)
  const [avgSpeed, setAvgDownloadSpeed] = useState<Point[]>(
    Array<Point>(sampleSize).fill({ download: 0, disk: 0 })
  )

  useEffect(() => {
    if (props.state === 'idle') {
      setAvgDownloadSpeed(
        Array<Point>(sampleSize).fill({ download: 0, disk: 0 })
      )
      return
    }

    setAvgDownloadSpeed((prev) => {
      const next = [...prev]
      if (next.length > sampleSize - 1) {
        next.shift()
      }
      next.push({
        download:
          progress.downSpeed && progress.downSpeed > 0
            ? progress.downSpeed
            : (next.at(-1)?.download ?? 0),
        disk: progress.diskSpeed ?? 0
      })
      return next
    })
  }, [progress, props.state])

  return (
    <>
      <div className="progressHeader">
        <div className="downloadRateStats">
          <div className="downloadRateChart">
            <div
              style={{
                width: '100%',
                height: '100px',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            >
              <SpeedChart data={avgSpeed} />
            </div>
          </div>
          <div className="realtimeDownloadStatContainer">
            <h5 className="realtimeDownloadStat">
              {roundToNearestHundredth(avgSpeed.at(-1)?.download)} MB/s
            </h5>
            <div className="realtimeDownloadStatLabel downLabel">
              {t('download-manager.label.speed', 'Download')}{' '}
            </div>
          </div>
          <div className="realtimeDownloadStatContainer">
            <h5 className="realtimeDownloadStat">
              {roundToNearestHundredth(avgSpeed.at(-1)?.disk)} MB/s
            </h5>
            <div className="realtimeDownloadStatLabel diskLabel">
              {t('download-manager.label.disk', 'Disk')}{' '}
            </div>
          </div>
        </div>
      </div>
      {props.state !== 'idle' && props.appName && progress.eta && (
        <div className="downloadBar">
          <div className="downloadProgressStats">
            <p className="downloadStat" color="var(--text-default)">{`${
              progress.percent ?? 0
            }% [${progress.bytes ?? ''}] `}</p>
          </div>
          <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress
                style={{ height: 10 }}
                variant="determinate"
                className="linearProgress"
                value={progress.percent || 0}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography
                variant="subtitle1"
                title={t('download-manager.ETA', 'Estimated Time')}
              >
                {props.state === 'running'
                  ? (progress.eta ?? '00.00.00')
                  : 'Paused'}
              </Typography>
            </Box>
          </Box>
        </div>
      )}
    </>
  )
}
