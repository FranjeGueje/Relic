const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']

export function formatBytes(bytes: unknown): string {
  const n = Number(bytes)
  if (isNaN(n) || n === 0) return '0 B'
  const k = 1024
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), units.length - 1)
  const val = n / Math.pow(k, i)
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}
