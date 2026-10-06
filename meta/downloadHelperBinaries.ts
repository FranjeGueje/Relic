import { createWriteStream, rmSync } from 'fs'
import { chmod, stat, mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import { execSync } from 'child_process'

import { setGlobalDispatcher, ProxyAgent } from 'undici'

type SupportedPlatform = 'win32' | 'linux'
type DownloadedBinary =
  | 'legendary'
  | 'gogdl'
  | 'nile'
  | 'comet'
  | 'epic-integration'
  | 'zoom-platform'
  | 'umu'

const RELEASE_TAGS = {
  legendary: '0.21.1',
  gogdl: 'v1.3.0',
  nile: 'v1.2.0',
  comet: 'v0.3.2',
  'epic-integration': 'v0.4',
  'zoom-platform': 'v1.0.1',
  // NOTE: umu-launcher tags have no `v` prefix
  umu: '1.4.4'
} as const satisfies Record<DownloadedBinary, string>

// GitHub repos the binaries come from. zoom-platform is not on GitHub.
const REPOS = {
  legendary: 'legendary-gl/legendary',
  gogdl: 'Heroic-Games-Launcher/heroic-gogdl',
  nile: 'imLinguin/nile',
  comet: 'imLinguin/comet',
  'epic-integration': 'BananaWorks07/heroic-epic-integration',
  umu: 'Open-Wine-Components/umu-launcher'
} as const satisfies Partial<Record<DownloadedBinary, string>>

// One file each binary must leave in public/bin. A matching tag in
// .release_tags is not enough: public/bin is gitignored, so the file can be
// missing (fresh checkout, file no longer versioned) while the tag says it's there.
const EXPECTED_FILES = {
  legendary: join('x64', 'linux', 'legendary'),
  gogdl: join('x64', 'linux', 'gogdl'),
  nile: join('x64', 'linux', 'nile'),
  comet: join('x64', 'linux', 'comet'),
  'epic-integration': join('x64', 'win32', 'EpicGamesLauncher.exe'),
  'zoom-platform': join('zoom', 'zoom-platform.sh'),
  umu: join('umu', 'umu-run')
} as const satisfies Record<DownloadedBinary, string>

const pathExists = async (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false
  )

async function downloadFile(url: string, dst: string) {
  const response = await fetch(url, {
    keepalive: true,
    headers: {
      'User-Agent': 'RelicBinaryUpdater/1.0'
    }
  })
  if (response.status !== 200) {
    throw Error(`Failed to download ${url}: ${response.status}`)
  }
  await mkdir(dirname(dst), { recursive: true })
  const fileStream = createWriteStream(dst, { flags: 'w' })
  await finished(Readable.fromWeb(response.body).pipe(fileStream))
}

async function downloadAsset(
  binaryName: string,
  repo: string,
  tag_name: string,
  arch: string,
  platform: SupportedPlatform,
  filename: string
) {
  const url = `https://github.com/${repo}/releases/download/${tag_name}/${filename}`
  console.log('Downloading', binaryName, 'for', platform, arch, 'from', url)

  const exeFilename = binaryName + (platform === 'win32' ? '.exe' : '')
  const exePath = join('public', 'bin', arch, platform, exeFilename)
  await downloadFile(url, exePath)

  console.log('Done downloading', binaryName, 'for', platform, arch)

  if (platform !== 'win32') {
    await chmod(exePath, '755')
  }
}

/**
 * Downloads assets uploaded to a GitHub release
 * @param binaryName The binary which was built & uploaded. Also used to get the final folder path
 * @param repo The repo to download from
 * @param tagName The GitHub Release tag which produced the binaries
 * @param assetNames The name(s) of the assets which were uploaded, mapped to platforms
 */
async function downloadGithubAssets(
  binaryName: string,
  repo: string,
  tagName: string,
  assetNames: Record<
    'x64' | 'arm64',
    Partial<Record<SupportedPlatform, string>>
  >
) {
  const downloadPromises = Object.entries(assetNames).map(
    async ([arch, platformFilenameMap]) =>
      Promise.all(
        Object.entries(platformFilenameMap)
          .filter(([, filename]) => filename)
          .map(([platform, filename]) => {
            return downloadAsset(
              binaryName,
              repo,
              tagName,
              arch,
              platform as keyof typeof platformFilenameMap,
              filename
            )
          })
      )
  )

  return Promise.all(downloadPromises)
}

async function downloadLegendary() {
  return downloadGithubAssets(
    'legendary',
    REPOS['legendary'],
    RELEASE_TAGS['legendary'],
    {
      x64: {
        linux: 'legendary_linux_x64',
        win32: 'legendary_windows_x64.exe'
      },
      arm64: {
        linux: 'legendary_linux_arm64',
        win32: 'legendary_windows_arm64.exe'
      }
    }
  )
}

async function downloadGogdl() {
  return downloadGithubAssets('gogdl', REPOS['gogdl'], RELEASE_TAGS['gogdl'], {
    x64: {
      linux: 'gogdl_linux_x86_64',
      win32: 'gogdl_windows_x86_64.exe'
    },
    arm64: {
      linux: 'gogdl_linux_arm64',
      win32: 'gogdl_windows_arm64.exe'
    }
  })
}

async function downloadNile() {
  return downloadGithubAssets('nile', REPOS['nile'], RELEASE_TAGS['nile'], {
    x64: {
      linux: 'nile_linux_x86_64',
      win32: 'nile_windows_x86_64.exe'
    },
    arm64: {
      linux: 'nile_linux_arm64'
    }
  })
}

async function downloadComet() {
  return Promise.all([
    downloadGithubAssets(
      'GalaxyCommunication',
      REPOS['comet'],
      RELEASE_TAGS['comet'],
      {
        x64: {
          win32: 'GalaxyCommunication-dummy.exe'
        },
        arm64: {}
      }
    ),
    downloadGithubAssets('comet', REPOS['comet'], RELEASE_TAGS['comet'], {
      x64: {
        linux: 'comet-x86_64-unknown-linux-gnu',
        win32: 'comet-x86_64-pc-windows-msvc.exe'
      },
      arm64: {
        linux: 'comet-aarch64-unknown-linux-gnu',
        win32: 'comet-aarch64-pc-windows-msvc.exe'
      }
    }),
    downloadDummyService()
  ])
}

async function downloadDummyService() {
  const tag = RELEASE_TAGS['comet']
  const url = `https://github.com/${REPOS['comet']}/releases/download/${tag}/dummy-service.zip`
  const zipPath = join('public', 'bin', 'dummy-service.zip')
  const destDir = join('public', 'bin', 'x64', 'win32')

  console.log('Downloading dummy-service.zip from', url)

  await downloadFile(url, zipPath)

  mkdir(destDir, { recursive: true })
  console.log('Extracting', zipPath, 'to', destDir)
  execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' })

  rmSync(zipPath)
  console.log('Done downloading dummy-service')
}

async function downloadEpicIntegration() {
  return downloadGithubAssets(
    'EpicGamesLauncher',
    REPOS['epic-integration'],
    RELEASE_TAGS['epic-integration'],
    {
      x64: {
        win32: 'EpicGamesLauncher.exe'
      },
      arm64: {}
    }
  )
}

async function downloadZoomPlatform() {
  const url = 'https://zoom-platform.sh/zoom-platform.sh'
  const dest = join('public', 'bin', 'zoom', 'zoom-platform.sh')

  console.log('Downloading zoom-platform.sh from', url)
  await downloadFile(url, dest)
  await chmod(dest, '755')
  console.log('Done downloading zoom-platform.sh')
}

async function downloadUmu() {
  const tag = RELEASE_TAGS['umu']
  const url = `https://github.com/${REPOS['umu']}/releases/download/${tag}/umu-launcher-${tag}-zipapp.tar`
  const tarPath = join('public', 'bin', 'umu-launcher-zipapp.tar')
  // The tarball already contains an `umu/` prefix, so it extracts into
  // public/bin/umu/{umu-run,umu_run.py}
  const destDir = join('public', 'bin')

  console.log('Downloading umu-launcher zipapp from', url)
  await downloadFile(url, tarPath)

  console.log('Extracting', tarPath, 'to', destDir)
  execSync(`tar -xf "${tarPath}" -C "${destDir}"`, { stdio: 'inherit' })

  rmSync(tarPath)
  await chmod(join(destDir, 'umu', 'umu-run'), '755')
  console.log('Done downloading umu-launcher')
}

/**
 * Finds out which binaries need to be downloaded by comparing
 * `public/bin/.release_tags` to RELEASE_TAGS
 */
async function compareDownloadedTags(): Promise<DownloadedBinary[]> {
  const storedTagsText = await readFile(
    'public/bin/.release_tags',
    'utf-8'
  ).catch(() => '{}')
  let storedTagsParsed: Partial<Record<DownloadedBinary, string>>
  try {
    storedTagsParsed = JSON.parse(storedTagsText)
  } catch {
    // Corrupted cache file, re-download everything
    return Object.keys(RELEASE_TAGS) as DownloadedBinary[]
  }
  const binariesToDownload: DownloadedBinary[] = []
  for (const [runner, currentTag] of Object.entries(RELEASE_TAGS)) {
    const binary = runner as DownloadedBinary
    const fileExists = await pathExists(
      join('public', 'bin', EXPECTED_FILES[binary])
    )
    if (storedTagsParsed[binary] !== currentTag || !fileExists)
      binariesToDownload.push(binary)
  }
  return binariesToDownload
}

async function fetchLatestTag(repo: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/releases/latest`,
    {
      headers: {
        'User-Agent': 'RelicBinaryUpdater/1.0',
        Accept: 'application/vnd.github+json'
      }
    }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = (await res.json()) as { tag_name?: string }
  if (!body.tag_name) throw new Error('response without tag_name')
  return body.tag_name
}

/** zoom-platform is not on GitHub: its version lives inside the script itself */
async function readZoomInstallerVersion(): Promise<string> {
  const script = await readFile(
    join('public', 'bin', 'zoom', 'zoom-platform.sh'),
    'utf-8'
  ).catch(() => '')
  return /INSTALLER_VERSION="([^"]+)"/.exec(script)?.[1] ?? 'no file'
}

async function getUpstreamTag(binary: DownloadedBinary): Promise<string> {
  if (binary === 'zoom-platform') return readZoomInstallerVersion()
  return fetchLatestTag(REPOS[binary])
}

/** Read-only: compares each pinned tag with the latest upstream one */
async function runVersionCheck() {
  const rows = await Promise.all(
    (Object.keys(RELEASE_TAGS) as DownloadedBinary[]).map(async (binary) => {
      const pin = RELEASE_TAGS[binary]
      const upstream = await getUpstreamTag(binary).catch(
        (error: unknown) => `ERROR (${String(error)})`
      )
      const status = upstream === pin ? 'OK' : 'DESACTUALIZADO'
      return { binary, pin, upstream, status }
    })
  )
  console.table(rows)
}

async function storeDownloadedTags() {
  await writeFile('public/bin/.release_tags', JSON.stringify(RELEASE_TAGS))
}

async function main() {
  const proxyUri = process.env['HTTPS_PROXY']
  if (proxyUri) {
    console.log(`Using proxy: ${proxyUri}`)
    const proxyAgent = new ProxyAgent(proxyUri)
    setGlobalDispatcher(proxyAgent)
  }

  if (process.env['RELIC_CHECK'] === '1') {
    await runVersionCheck()
    return
  }

  if (!(await pathExists('public/bin'))) {
    console.error('public/bin not found, are you in the source root?')
    return
  }

  const binariesToDownload = await compareDownloadedTags()
  if (!binariesToDownload.length) {
    console.log('Nothing to download, binaries are up-to-date')
    return
  }

  console.log('Downloading:', binariesToDownload)
  const promisesToAwait: Promise<unknown>[] = []

  if (binariesToDownload.includes('legendary'))
    promisesToAwait.push(downloadLegendary())
  if (binariesToDownload.includes('gogdl'))
    promisesToAwait.push(downloadGogdl())
  if (binariesToDownload.includes('nile')) promisesToAwait.push(downloadNile())
  if (binariesToDownload.includes('comet'))
    promisesToAwait.push(downloadComet())
  if (binariesToDownload.includes('epic-integration'))
    promisesToAwait.push(downloadEpicIntegration())
  if (binariesToDownload.includes('zoom-platform'))
    promisesToAwait.push(downloadZoomPlatform())
  if (binariesToDownload.includes('umu')) promisesToAwait.push(downloadUmu())

  await Promise.all(promisesToAwait)

  await storeDownloadedTags()
}

void main()
