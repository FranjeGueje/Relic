export function split(s: string): string[] {
  return s.split(' ')
}

export function quote(s: string): string {
  return `'${s}'`
}

export function join(args: string[]): string {
  return args.map((a) => `'${a}'`).join(' ')
}
