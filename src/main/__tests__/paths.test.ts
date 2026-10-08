import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  ephemeralDir,
  ephemeralPaths,
  removeEphemeral,
  restoreUserEnv
} from '../paths'

describe('ephemeralDir', () => {
  test('lives in the runtime dir when there is one', () => {
    expect(ephemeralDir({ XDG_RUNTIME_DIR: '/run/user/1000' }, '/tmp')).toBe(
      '/run/user/1000/relic'
    )
  })

  test('falls back to the temp dir, also when the variable is empty', () => {
    expect(ephemeralDir({}, '/tmp')).toBe('/tmp/relic')
    expect(ephemeralDir({ XDG_RUNTIME_DIR: '' }, '/tmp')).toBe('/tmp/relic')
  })
})

describe('ephemeralPaths', () => {
  test('every path is inside the dir and they are all different', () => {
    const paths = Object.values(ephemeralPaths('/run/relic'))
    expect(paths.every((p) => p.startsWith('/run/relic/'))).toBe(true)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('removeEphemeral', () => {
  test('removes the folder with its content', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'relic-test-')), 'relic')
    mkdirSync(join(dir, 'cache'), { recursive: true })
    writeFileSync(join(dir, 'cache', 'file'), 'x')
    removeEphemeral(dir)
    expect(existsSync(dir)).toBe(false)
  })

  test('does not fail when it is already gone', () => {
    expect(() => removeEphemeral('/nonexistent/relic-test')).not.toThrow()
  })
})

describe('restoreUserEnv', () => {
  test('puts back the cache folder the person had', () => {
    const env = restoreUserEnv({
      XDG_CACHE_HOME: '/run/relic/xdgCache',
      RELIC_USER_XDG_CACHE_HOME: '/home/me/.cache',
      HOME: '/home/me'
    })
    expect(env).toEqual({ XDG_CACHE_HOME: '/home/me/.cache', HOME: '/home/me' })
  })

  test('removes it when the person had none', () => {
    const env = restoreUserEnv({
      XDG_CACHE_HOME: '/run/relic/xdgCache',
      RELIC_USER_XDG_CACHE_HOME: ''
    })
    expect(env).toEqual({})
  })

  test('leaves the environment as it is when the AppImage did not move it', () => {
    expect(restoreUserEnv({ XDG_CACHE_HOME: '/x' })).toEqual({
      XDG_CACHE_HOME: '/x'
    })
  })
})
