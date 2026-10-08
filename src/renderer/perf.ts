/**
 * Timings of the start-up, to see where the time goes. They only print when the
 * window was opened with `RELIC_PERF=1` (the main process adds `?perf`).
 */
const enabled = new URLSearchParams(window.location.search).has('perf')

export function mark(label: string): void {
  if (enabled)
    console.info(`[perf] ${label}: ${Math.round(performance.now())} ms`)
}
