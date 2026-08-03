import { libraryManagerMap } from '../../storeManagers'
import { spawnSync } from 'node:child_process'
import { getCometBin } from 'backend/utils'
import { join } from 'path'

async function getLegendaryVersion(): Promise<string> {
  const { stdout, error, abort } = await libraryManagerMap[
    'legendary'
  ].runRunnerCommand(
    {
      subcommand: undefined,
      '--version': true
    },
    {
      abortId: 'legendary-version'
    }
  )

  if (error ?? abort) return 'invalid'

  const matches = stdout.match(/([\d.]+)/)
  const version = matches?.[1]
  if (!version) return 'invalid'
  return `v${version}`
}

async function getGogdlVersion(): Promise<string> {
  const { stdout, error } = await libraryManagerMap['gog'].runRunnerCommand(
    ['--version'],
    {
      abortId: 'gogdl-version'
    }
  )

  if (error) return 'invalid'

  const trimmed = stdout.trim()
  if (!trimmed) return 'invalid'
  return trimmed
}

async function getCometVersion(): Promise<string> {
  const path = getCometBin()
  const { stdout, error } = spawnSync(join(path.dir, path.bin), ['--version'])

  if (error) return 'invalid'

  return stdout.toString().trimEnd()
}

async function getNileVersion(): Promise<string> {
  const { stdout, error } = await libraryManagerMap['nile'].runRunnerCommand(
    ['--version'],
    {
      abortId: 'nile-version'
    }
  )

  if (error) return 'invalid'

  const trimmed = stdout.trim()
  if (!trimmed) return 'invalid'
  return trimmed
}

export { getLegendaryVersion, getGogdlVersion, getNileVersion, getCometVersion }
