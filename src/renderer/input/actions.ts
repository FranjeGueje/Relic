/**
 * What the person asked for, whatever they used: the interface never reads a key
 * or a button, only these. A keyboard, a gamepad and Steam Input (which turns a
 * pad into keys) all end up here.
 */
export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'confirm'
  | 'back'
  | 'prevStore'
  | 'nextStore'
  | 'toggleInstalled'
  | 'downloads'
  | 'sort'
  | 'refresh'
  | 'quit'
  | 'menu'

const KEYS: Record<string, Action> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'confirm',
  ' ': 'confirm',
  Escape: 'back',
  Backspace: 'back',
  PageUp: 'prevStore',
  '[': 'prevStore',
  PageDown: 'nextStore',
  ']': 'nextStore',
  i: 'toggleInstalled',
  d: 'downloads',
  s: 'sort',
  r: 'refresh',
  q: 'quit',
  m: 'menu'
}

export function keyToAction(key: string): Action | undefined {
  return KEYS[key]
}
