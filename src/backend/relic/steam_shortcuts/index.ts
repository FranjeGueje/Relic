export {
  addGameToSteam,
  createRelicBat,
  createRunnerFile,
  createGameSymlink
} from './add_game'
export { findShortcut, addShortcut, removeShortcut } from './store'
export type {
  AddGameToSteamOptions,
  AddGameToSteamResult,
  GameRunner,
  SteamShortcut
} from './types'
