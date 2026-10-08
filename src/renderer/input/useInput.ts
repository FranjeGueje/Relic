import { useEffect, useRef, useState } from 'react'
import { keyToAction, type Action } from './actions'
import { dispatch, pushLayer } from './bus'
import { detectControllerLayout, type ControllerLayout } from './controller'
import { idlePad, readPad, type PadState } from './pad'

/** Takes the actions while the component is on screen; the last one mounted is on top */
export function useLayer(handler: (action: Action) => void): void {
  const latest = useRef(handler)
  latest.current = handler
  useEffect(() => pushLayer((action) => latest.current(action)), [])
}

const firstPad = (): Gamepad | undefined =>
  Array.from(navigator.getGamepads()).find((pad): pad is Gamepad => !!pad)

/** What is typed into a text field belongs to the field, not to the actions */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  )
}

/** Listens to the keyboard and to the gamepad, once for the whole app */
export function startInput(): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (isTyping(event.target)) return
    const action = keyToAction(event.key)
    if (!action || event.ctrlKey || event.altKey || event.metaKey) return
    event.preventDefault()
    dispatch(action)
  }
  window.addEventListener('keydown', onKey)

  let state: PadState = idlePad
  let frame = 0
  const poll = (now: number) => {
    const pad = firstPad()
    if (pad) {
      const read = readPad(
        pad.buttons.map((b) => b.pressed || b.value > 0.5),
        pad.axes,
        state,
        now
      )
      state = read.state
      read.actions.forEach(dispatch)
    }
    frame = requestAnimationFrame(poll)
  }
  frame = requestAnimationFrame(poll)

  return () => {
    window.removeEventListener('keydown', onKey)
    cancelAnimationFrame(frame)
  }
}

/** The layout of the pad that is connected, or null if there is none */
export function useControllerLayout(): ControllerLayout | null {
  const [layout, setLayout] = useState<ControllerLayout | null>(null)
  useEffect(() => {
    const refresh = () => {
      const pad = firstPad()
      setLayout(pad ? detectControllerLayout(pad.id) : null)
    }
    refresh()
    window.addEventListener('gamepadconnected', refresh)
    window.addEventListener('gamepaddisconnected', refresh)
    return () => {
      window.removeEventListener('gamepadconnected', refresh)
      window.removeEventListener('gamepaddisconnected', refresh)
    }
  }, [])
  return layout
}
