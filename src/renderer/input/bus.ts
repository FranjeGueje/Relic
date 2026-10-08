import type { Action } from './actions'

type Handler = (action: Action) => void

/**
 * Only the layer on top receives the actions: a dialog over the grid gets them
 * and the grid does not. Layers register while they are on screen.
 */
const layers: Handler[] = []

export function pushLayer(handler: Handler): () => void {
  layers.push(handler)
  return () => {
    const index = layers.lastIndexOf(handler)
    if (index !== -1) layers.splice(index, 1)
  }
}

export function dispatch(action: Action): void {
  layers.at(-1)?.(action)
}
