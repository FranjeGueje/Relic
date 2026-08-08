import pkg_json from 'backend/../../package.json'
import { relicVersion } from 'backend/constants/others'

function getRelicVersion(): string {
  const VERSION_NUMBER = relicVersion
  const BETA_VERSION_NAME = pkg_json.versionNames.beta
  const STABLE_VERSION_NAME = pkg_json.versionNames.stable
  const isBetaOrAlpha =
    VERSION_NUMBER.includes('alpha') || VERSION_NUMBER.includes('beta')
  const VERSION_NAME = isBetaOrAlpha ? BETA_VERSION_NAME : STABLE_VERSION_NAME

  return `${VERSION_NUMBER} ${VERSION_NAME}`
}

export { getRelicVersion }
