import type { Action } from './actions'

// Chromium's "standard" gamepad mapping
const BUTTONS: Record<number, Action> = {
  0: 'confirm', // A / ✕
  1: 'back', // B / ◯
  2: 'toggleInstalled', // X / □
  3: 'downloads', // Y / △
  4: 'prevStore', // L1
  5: 'nextStore', // R1
  7: 'sort', // R2
  8: 'menu', // Select / View
  9: 'refresh' // Start
}
const DPAD: Record<number, Action> = {
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right'
}

const STICK_THRESHOLD = 0.6
/** A held direction repeats: after a pause, then steadily */
const REPEAT_DELAY_MS = 400
const REPEAT_EVERY_MS = 110

type Direction = 'up' | 'down' | 'left' | 'right'

export type PadState = {
  pressed: ReadonlySet<number>
  held?: { action: Direction; since: number; last: number }
}

export const idlePad: PadState = { pressed: new Set() }

/** The left stick as a direction: the axis that leans further, if past the threshold */
export function stickDirection(x: number, y: number): Direction | undefined {
  if (Math.max(Math.abs(x), Math.abs(y)) < STICK_THRESHOLD) return undefined
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left'
  return y > 0 ? 'down' : 'up'
}

function heldDirection(
  pressed: ReadonlySet<number>,
  axes: readonly number[]
): Direction | undefined {
  for (const [button, action] of Object.entries(DPAD))
    if (pressed.has(Number(button))) return action as Direction
  return stickDirection(axes[0] ?? 0, axes[1] ?? 0)
}

function directionActions(
  held: Direction | undefined,
  previous: PadState['held'],
  now: number
): { actions: Action[]; held: PadState['held'] } {
  if (!held) return { actions: [], held: undefined }
  if (previous?.action !== held)
    return { actions: [held], held: { action: held, since: now, last: now } }
  const repeats =
    now - previous.since >= REPEAT_DELAY_MS &&
    now - previous.last >= REPEAT_EVERY_MS
  return repeats
    ? { actions: [held], held: { ...previous, last: now } }
    : { actions: [], held: previous }
}

/**
 * What one reading of a gamepad means. A button counts when it goes down, not
 * while it stays down, so the press that opened a dialog does not also answer it.
 */
export function readPad(
  down: readonly boolean[],
  axes: readonly number[],
  state: PadState,
  now: number
): { actions: Action[]; state: PadState } {
  const pressed = new Set<number>()
  down.forEach((isDown, index) => isDown && pressed.add(index))

  const actions: Action[] = []
  for (const [button, action] of Object.entries(BUTTONS))
    if (pressed.has(Number(button)) && !state.pressed.has(Number(button)))
      actions.push(action)

  const direction = directionActions(
    heldDirection(pressed, axes),
    state.held,
    now
  )
  return {
    actions: [...actions, ...direction.actions],
    state: { pressed, held: direction.held }
  }
}
