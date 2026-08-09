import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, useParams } from 'react-router-dom'

import { UpdateComponent } from 'frontend/components/UI'
import WebviewControls from 'frontend/components/UI/WebviewControls'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'
import LoginWarning from '../Login/components/LoginWarning'
import { NileLoginData } from 'common/types/nile'

const gogEmbedRegExp = new RegExp('https://embed.gog.com/on_login_success?')

export default function WebView() {
  useTranslation()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { epic, gog, amazon, zoom, connectivity } = useContext(ContextProvider)
  const [loading, setLoading] = useState<{
    refresh: boolean
    message: string
  }>(() => ({
    refresh: true,
    message: t('loading.website', 'Loading Website')
  }))
  const [amazonLoginData, setAmazonLoginData] = useState<NileLoginData | null>(
    null
  )
  const navigate = useNavigate()
  const webviewRef = useRef<Electron.WebviewTag>(null)

  // `runner` is set to a runner if we're supposed to show its login prompt
  const { runner } = useParams()

  const epicLoginUrl = 'https://www.epicgames.com/id/login?responseType=code'

  const wikiURL =
    'https://github.com/Relic-Games-Launcher/RelicGamesLauncher/wiki'
  const gogLoginUrl =
    'https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=galaxy'
  const zoomLoginUrl =
    'https://www.zoom-platform.com/login?li=relic&return_li_token=true'

  const trueAsStr = 'true' as unknown as boolean | undefined

  const urls: { [pathname: string]: string } = {
    '/wiki': wikiURL,
    '/loginEpic': epicLoginUrl,
    '/loginGOG': gogLoginUrl,
    '/loginweb/legendary': epicLoginUrl,
    '/loginweb/gog': gogLoginUrl,
    '/loginweb/nile': amazonLoginData ? amazonLoginData.url : '',
    '/loginweb/zoom': zoomLoginUrl
  }
  const startUrl = urls[pathname]

  useEffect(() => {
    if (pathname !== '/loginweb/nile') return
    console.log('Loading amazon login data')

    setLoading({
      refresh: true,
      message: t('status.preparing_login', 'Preparing Login...')
    })
    void amazon.getLoginData().then((data) => {
      setAmazonLoginData(data)
      setLoading((prev) => ({
        ...prev,
        refresh: false
      }))
    })
    // amazon.getLoginData is a stable bound method; the eslint rule can't
    // verify that and also wants the whole `amazon` object, which is a new
    // reference every GlobalState render and would refetch login data on
    // every unrelated re-render while sitting on this route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, amazon.getLoginData, t])

  const handleSuccessfulLogin = useCallback(() => {
    navigate('/login')
  }, [navigate])

  const handleAmazonLogin = useCallback(
    (code: string) => {
      if (!amazonLoginData) {
        console.error('Could not login to Amazon because login data is missing')
        return
      }

      setLoading({
        refresh: true,
        message: t('status.logging', 'Logging In...')
      })
      void amazon
        .login({
          client_id: amazonLoginData.client_id,
          code: code,
          code_verifier: amazonLoginData.code_verifier,
          serial: amazonLoginData.serial
        })
        .then(() => {
          handleSuccessfulLogin()
        })
    },
    // amazon.login is a stable bound method; same reasoning as above
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [amazonLoginData, t, amazon.login, handleSuccessfulLogin]
  )

  const [webviewPreloadPath, setWebviewPreloadPath] = useState('')
  useEffect(() => {
    const fetchWebviewPreloadPath = async () => {
      const path = await window.api.getWebviewPreloadPath()
      setWebviewPreloadPath(path)
    }

    void fetchWebviewPreloadPath()
  }, [])

  useLayoutEffect(() => {
    const webview = webviewRef.current
    if (webview) {
      const loadstop = () => {
        setLoading((prev) => ({ ...prev, refresh: false }))
        const userAgent =
          startUrl === epicLoginUrl
            ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EpicGamesLauncher'
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/200.0'
        if (webview.getUserAgent() != userAgent) {
          webview.setUserAgent(userAgent)
        }
        // Ignore the login handling if not on login page
        if (!runner) {
          return
        } else if (runner === 'gog') {
          const pageUrl = webview.getURL()
          if (pageUrl.match(gogEmbedRegExp)) {
            const parsedURL = new URL(pageUrl)
            const code = parsedURL.searchParams.get('code')
            if (code) {
              setLoading({
                refresh: true,
                message: t('status.logging', 'Logging In...')
              })
              void gog.login(code).then(() => handleSuccessfulLogin())
            }
          }
        } else if (runner === 'nile') {
          const pageURL = webview.getURL()
          const parsedURL = new URL(pageURL)
          const code = parsedURL.searchParams.get(
            'openid.oa2.authorization_code'
          )
          if (code) {
            handleAmazonLogin(code)
          }
        } else if (runner == 'legendary') {
          const pageUrl = webview.getURL()
          const parsedUrl = new URL(pageUrl)
          if (parsedUrl.hostname === 'localhost') {
            const code = parsedUrl.searchParams.get('code')
            if (code) {
              setLoading({
                refresh: true,
                message: t('status.logging', 'Logging In...')
              })
              void epic.login(code).then(() => handleSuccessfulLogin())
            }
          }
        }
      }

      const onerror = (_event: Electron.DidFailLoadEvent) => {
        void _event
        // ignore errors for now
      }

      webview.addEventListener('dom-ready', loadstop)
      webview.addEventListener('did-fail-load', onerror)
      // if the page title changed it's because the store loaded so there's
      // connectivity, we can update the status without waiting for the checks
      const updateConnectivity = () => {
        if (connectivity.status !== 'online') {
          window.api.setConnectivityOnline()
        }
      }
      webview.addEventListener('page-title-updated', updateConnectivity)

      return () => {
        webview.removeEventListener('dom-ready', loadstop)
        webview.removeEventListener('did-fail-load', onerror)
        webview.removeEventListener('page-title-updated', updateConnectivity)
      }
    }
    return
    // epic.login/gog.login are stable bound methods; the eslint rule can't
    // verify that and also wants the whole `epic`/`gog` objects, which are
    // new references every GlobalState render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    amazonLoginData,
    runner,
    webviewPreloadPath,
    connectivity.status,
    epic.login,
    gog.login,
    handleAmazonLogin,
    handleSuccessfulLogin,
    startUrl,
    t
  ])

  useEffect(() => {
    const webview = webviewRef.current
    if (webview) {
      const onLoginNavigate = () => {
        if (runner === 'zoom') {
          const pageURL = webview.getURL()
          const parsedURL = new URL(pageURL)
          const token = parsedURL.searchParams.get('li_token')
          if (token) {
            setLoading({
              refresh: true,
              message: t('status.logging', 'Logging In...')
            })
            void zoom.login(pageURL).then(() => handleSuccessfulLogin())
          }
        }
      }

      webview.addEventListener('did-navigate', onLoginNavigate)

      return () => {
        webview.removeEventListener('did-navigate', onLoginNavigate)
      }
    }

    return
    // zoom.login is a stable bound method; same reasoning as above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner, handleSuccessfulLogin, t, zoom.login])

  const [showLoginWarningFor, setShowLoginWarningFor] = useState<
    null | 'epic' | 'gog' | 'amazon' | 'zoom'
  >(null)

  useEffect(() => {
    if (
      startUrl.match(/epicgames\.com/) &&
      startUrl.indexOf('/id/login') < 0 &&
      !epic.username
    ) {
      setShowLoginWarningFor('epic')
    } else if (
      startUrl.match(/gog\.com/) &&
      !startUrl.match(/auth\.gog\.com/) &&
      !gog.username
    ) {
      setShowLoginWarningFor('gog')
    } else if (startUrl.match(/gaming\.amazon\.com/) && !amazon.user_id) {
      setShowLoginWarningFor('amazon')
    } else if (startUrl.match(/zoom-platform\.com\/$/) && !zoom.username) {
      setShowLoginWarningFor('zoom')
    } else {
      setShowLoginWarningFor(null)
    }
  }, [startUrl, epic.username, gog.username, amazon.user_id, zoom.username])

  const onLoginWarningClosed = () => {
    setShowLoginWarningFor(null)
  }

  // Handle back/forward mouse buttons to navigate inside webview
  useEffect(() => {
    if (!webviewRef.current) return

    const webview = webviewRef.current

    const handleMouseBackForward = (ev: MouseEvent) => {
      // 3 and 4 are the typical `button` value for mouse back/forward buttons on mouseup events
      switch (ev.button) {
        case 3:
          if (webview.canGoBack()) {
            ev.preventDefault()
            webview.goBack()
          }
          break
        case 4:
          if (webview.canGoForward()) {
            ev.preventDefault()
            webview.goForward()
          }
          break
      }
    }

    document.addEventListener('mouseup', handleMouseBackForward)

    return () => {
      document.removeEventListener('mouseup', handleMouseBackForward)
    }
  }, [])

  if (!webviewPreloadPath) {
    return <></>
  }

  return (
    <div className="WebView">
      {webviewRef.current && (
        <WebviewControls
          webview={webviewRef.current}
          initURL={startUrl}
          openInBrowser={!startUrl.startsWith('login')}
        />
      )}
      {loading.refresh && <UpdateComponent message={loading.message} />}
      <webview
        key={runner}
        ref={webviewRef}
        className="WebView__webview"
        partition={`persist:${runner || 'default'}`}
        src={startUrl}
        allowpopups={trueAsStr}
        preload={webviewPreloadPath}
      />
      {showLoginWarningFor && (
        <LoginWarning
          warnLoginForStore={showLoginWarningFor}
          onClose={onLoginWarningClosed}
        />
      )}
    </div>
  )
}
