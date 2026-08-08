import { GlobalConfig } from 'backend/config'
import { addHandler } from 'backend/ipc'
import { encryptApiKey, isEncryptedValue } from './secureKey'

function readStoredApiKey(): string {
  const stored: string = GlobalConfig.get().getSettings().steamGridDbApiKey
  return stored ?? ''
}

// Encrypt a key stored before encryption was introduced. `decryptApiKey` reads
// plaintext fine, so this is only an upgrade, never a requirement.
function migrateLegacyPlaintextKey(): void {
  const stored = readStoredApiKey()
  if (!stored || isEncryptedValue(stored)) return

  const reEncrypted = encryptApiKey(stored)
  if (isEncryptedValue(reEncrypted)) {
    GlobalConfig.get().setSetting('steamGridDbApiKey', reEncrypted)
  }
}

addHandler('steamgriddb.hasApiKey', () => {
  // Settings calls this on mount, so it is the read path where the migration
  // can still happen now that the manual cover picker is gone.
  migrateLegacyPlaintextKey()
  return !!readStoredApiKey()
})

addHandler('steamgriddb.setApiKey', (event, key) => {
  const trimmed = key.trim()
  const stored = trimmed ? encryptApiKey(trimmed) : ''
  GlobalConfig.get().setSetting('steamGridDbApiKey', stored)
})
