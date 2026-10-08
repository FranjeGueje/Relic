/// <reference types="vite/client" />

import type { RakunBridge } from '../shared/bridge'

declare global {
  interface Window {
    rakun: RakunBridge
  }
}
