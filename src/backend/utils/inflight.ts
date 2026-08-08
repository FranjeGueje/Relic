/**
 * Share one in-flight promise between callers asking for the same key.
 *
 * The install-info stores only get written once a fetch finishes, so two
 * concurrent callers both miss the cache and both spawn a runner process. That
 * showed up in real logs as identical `nile install --info` and `gogdl info`
 * commands issued within the same second.
 *
 * The entry is dropped as soon as the promise settles, so this is a
 * concurrency guard and never a cache: it does not keep results around, and a
 * rejection does not stick to block later attempts.
 */
export function shareInFlight<T>(
  inFlight: Map<string, Promise<T>>,
  key: string,
  run: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(key)
  if (existing) return existing

  const promise = run().finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}
