import CacheStore from '../../cache'
import { ExtraInfo, GameInfo } from 'common/types'
import { LegendaryInstallInfo } from 'common/types/legendary'

export const installStore = new CacheStore<LegendaryInstallInfo>(
  'legendary_install_info'
)
export const libraryStore = new CacheStore<GameInfo[], 'library'>(
  'legendary_library',
  null
)

export const gameInfoStore = new CacheStore<ExtraInfo>('legendary_gameinfo')
