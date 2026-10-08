export type ControllerLayout =
  'ps4' | 'ps5' | 'xbox' | 'nintendo' | 'steam-deck'

/** From the id Chromium gives the pad (it holds the vendor and product) */
export function detectControllerLayout(id: string): ControllerLayout {
  if (/054c.*0ce6/i.test(id)) return 'ps5'
  if (/054c|PS3|0268|2563.*0523/i.test(id)) return 'ps4'
  if (/28de.*11ff/.test(id)) return 'steam-deck'
  if (/microsoft|xbox/i.test(id)) return 'xbox'
  if (/nintendo|057e|switch|joy.?con|pro.?controller/i.test(id))
    return 'nintendo'
  return 'xbox'
}

export type ButtonNames = {
  confirm: string
  back: string
  secondary: string
  tertiary: string
}

/** How each layout calls the buttons the hints talk about */
export function buttonNames(layout: ControllerLayout): ButtonNames {
  if (layout === 'ps4' || layout === 'ps5')
    return { confirm: '✕', back: '◯', secondary: '□', tertiary: '△' }
  if (layout === 'nintendo')
    return { confirm: 'A', back: 'B', secondary: 'Y', tertiary: 'X' }
  return { confirm: 'A', back: 'B', secondary: 'X', tertiary: 'Y' }
}

export type HintKeys = {
  select: string
  back: string
  stores: string
  installed: string
  downloads: string
  sort: string
  refresh: string
  menu: string
  quit: string
  move: string
}

/** The labels of the hints: the buttons of the pad if there is one, the keys if not */
export function hintKeys(layout: ControllerLayout | null): HintKeys {
  if (layout === null)
    return {
      select: 'Enter',
      back: 'Esc',
      stores: '[ ]',
      installed: 'I',
      downloads: 'D',
      sort: 'S',
      refresh: 'R',
      menu: 'M',
      quit: 'Esc',
      move: '← ↑ ↓ →'
    }
  const names = buttonNames(layout)
  return {
    select: names.confirm,
    back: names.back,
    stores: 'L1 R1',
    installed: names.secondary,
    downloads: names.tertiary,
    sort: 'R2',
    refresh: 'Start',
    menu: 'Select',
    quit: names.back,
    move: 'D-pad'
  }
}
