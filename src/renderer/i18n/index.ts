import { en, type StringKey } from './strings'

export type Translate = (
  key: StringKey,
  values?: Record<string, string | number>
) => string

/** Fills the `{name}` placeholders of a text */
export function translator(): Translate {
  return (key, values = {}) =>
    en[key].replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in values ? String(values[name]) : whole
    )
}

export type { StringKey }
