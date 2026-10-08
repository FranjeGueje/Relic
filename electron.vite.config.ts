import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

/** The interface is rakun's web, which comes in the submodule: see scripts/init-ui.sh */
const ui = resolve(__dirname, 'vendor/rakun/web/src')
if (!existsSync(resolve(ui, 'App.tsx')))
  throw new Error(
    'The interface is missing (vendor/rakun is empty): run scripts/init-ui.sh'
  )

export default defineConfig({
  main: { resolve: { alias: { '@rakun-ui': ui } } },
  preload: { resolve: { alias: { '@rakun-ui': ui } } },
  renderer: {
    plugins: [react()],
    resolve: { alias: { '@rakun-ui': ui } },
    server: { fs: { allow: [resolve(__dirname)] } }
  }
})
