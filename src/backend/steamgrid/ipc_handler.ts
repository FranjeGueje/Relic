import { GlobalConfig } from 'backend/config'
import { addHandler } from 'backend/ipc'

// v0.6.0 briefly tried to encrypt this key with Electron's safeStorage,
// prefixing the stored value with "sgdb:v1:". That backend turned out to be
// unreliable in practice — many Linux desktops have no working keyring daemon
// (safeStorage.isEncryptionAvailable() was false even with every
// --password-store override tried) — so the key is now always plain text in
// config.json, like every other setting Relic persists. A value still
// carrying that prefix can't be recovered here; it's cleared once so the user
// re-pastes their key.
const LEGACY_ENCRYPTED_PREFIX = 'sgdb:v1:'

function readStoredApiKey(): string {
  const stored: string = GlobalConfig.get().getSettings().steamGridDbApiKey
  if (!stored) return ''

  if (stored.startsWith(LEGACY_ENCRYPTED_PREFIX)) {
    GlobalConfig.get().setSetting('steamGridDbApiKey', '')
    return ''
  }

  return stored
}

addHandler('steamgriddb.hasApiKey', () => !!readStoredApiKey())

addHandler('steamgriddb.setApiKey', (event, key) => {
  GlobalConfig.get().setSetting('steamGridDbApiKey', key.trim())
})
