/** What an error says, for a reply to the interface (errors travel as text) */
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** The address, or `undefined` when it is not one */
export function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url)
  } catch {
    return undefined
  }
}
