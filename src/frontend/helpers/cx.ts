export function cx(...args: unknown[]): string {
  return args
    .flatMap((a) => {
      if (!a) return []
      if (typeof a === 'string') return [a]
      if (typeof a === 'object') {
        return Object.entries(a as Record<string, unknown>)
          .filter(([, v]) => v)
          .map(([k]) => k)
      }
      return []
    })
    .join(' ')
}
