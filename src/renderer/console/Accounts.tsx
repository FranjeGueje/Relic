import { useCallback, useEffect, useState } from 'react'
import type { AccountsStatus, StoreInfo } from '../../shared/types'
import type { Translate } from '../i18n'
import { useLayer } from '../input/useInput'
import type { Actions } from '../state/useRakun'
import { ConfirmDialog } from './ConfirmDialog'

function stateText(t: Translate, account: AccountsStatus[StoreInfo['id']]) {
  if (!account.loggedIn) return t('accounts.signedOut')
  return account.name
    ? t('accounts.signedIn', { name: account.name })
    : t('accounts.signedInNoName')
}

/** The stores and whether each has a session; A signs in or (after asking) out */
export function Accounts({
  actions,
  t,
  onClose
}: {
  actions: Actions
  t: Translate
  onClose: () => void
}) {
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [accounts, setAccounts] = useState<AccountsStatus | null>(null)
  const [focus, setFocus] = useState(0)
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState('')
  const [askLogout, setAskLogout] = useState<StoreInfo | null>(null)

  const load = useCallback(async () => {
    const [list, status] = await Promise.all([
      window.rakun.call('getStores'),
      window.rakun.call('getAccounts')
    ])
    setStores(list)
    setAccounts(status)
  }, [])
  useEffect(() => {
    load().catch((e: unknown) => setError(String(e)))
  }, [load])

  const signIn = async (store: StoreInfo) => {
    setWaiting(true)
    setError('')
    const reply = await window.rakun.login(store.id)
    setWaiting(false)
    if (!reply.ok && !reply.cancelled)
      setError(t('accounts.failed', { error: reply.error }))
    await load()
  }

  const signOut = async (store: StoreInfo) => {
    setAskLogout(null)
    setError('')
    try {
      await window.rakun.call('logout', store.id)
      actions.reloadStore(store.id)
    } catch (e) {
      setError(String(e))
    }
    await load()
  }

  const activate = (store: StoreInfo | undefined) => {
    if (!store || !accounts || waiting) return
    if (accounts[store.id].loggedIn) setAskLogout(store)
    else void signIn(store)
  }

  useLayer((action) => {
    if (askLogout || waiting) return
    if (action === 'up') setFocus(Math.max(focus - 1, 0))
    else if (action === 'down') setFocus(Math.min(focus + 1, stores.length - 1))
    else if (action === 'confirm') activate(stores[focus])
    else if (action === 'back' || action === 'menu') onClose()
  })

  return (
    <div className="overlay solid" role="dialog">
      <div className="panel">
        <h1>{t('accounts.title')}</h1>
        <ul className="rows">
          {stores.map((store, index) => (
            <li key={store.id}>
              <button
                className={`row${index === focus ? ' focused' : ''}`}
                onMouseEnter={() => setFocus(index)}
                onClick={() => activate(store)}
              >
                <span>{store.label}</span>
                <span className="muted small">
                  {accounts ? stateText(t, accounts[store.id]) : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {waiting && <p className="muted">{t('accounts.waiting')}</p>}
        {error && <p className="errorText">{error}</p>}
      </div>
      {askLogout && (
        <ConfirmDialog
          title={t('accounts.logoutTitle', { store: askLogout.label })}
          message={t('accounts.logoutMessage')}
          t={t}
          onYes={() => void signOut(askLogout)}
          onNo={() => setAskLogout(null)}
        />
      )}
    </div>
  )
}
