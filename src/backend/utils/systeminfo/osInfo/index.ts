async function getOsInfo(): Promise<{ name: string; version?: string }> {
  const { osInfo_linux } = await import('./linux')
  return osInfo_linux()
}

export { getOsInfo }
