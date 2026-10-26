// Illustrative tokenizer + illustrative embeddings.
// Nothing here comes from a real model: splits, IDs and vectors are
// deterministic stand-ins built to teach the shape of the pipeline.

export type TokKind = 'word' | 'piece' | 'punct' | 'number'

export interface Tok {
  /** exact text including a leading space when present */
  text: string
  /** text with the leading-space marker shown as ▁ */
  shown: string
  id: number
  kind: TokKind
  /** character range in the normalised prompt */
  start: number
  end: number
}

export const DEFAULT_PROMPT = 'How does an LLM understand and answer a question?'
export const MAX_TOKENS = 24

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rng(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const tokenId = (text: string) => 100 + (hash('id:' + text) % 49900)

const SUFFIXES = ['ization', 'ation', 'ition', 'ment', 'ness', 'ing', 'ions', 'ion', 'able', 'ally', 'ers', 'ed', 'ly', 'er', 'es', 's']

function splitWord(w: string): string[] {
  if (/^[A-Z]{3,}$/.test(w)) {
    const out: string[] = []
    for (let i = 0; i < w.length; i += 2) out.push(w.slice(i, i + 2))
    return out
  }
  if (w.length <= 7) return [w]
  const lower = w.toLowerCase()
  for (const suf of SUFFIXES) {
    if (lower.endsWith(suf) && w.length - suf.length >= 4) return [w.slice(0, -suf.length), w.slice(-suf.length)]
  }
  if (w.length >= 11) {
    const cut = Math.ceil(w.length * 0.55)
    return [w.slice(0, cut), w.slice(cut)]
  }
  return [w]
}

export function normalise(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export function tokenize(raw: string): { tokens: Tok[]; text: string; truncated: boolean } {
  const text = normalise(raw) || DEFAULT_PROMPT
  const re = /( ?)(?:'[A-Za-z]{1,2}|[A-Za-z]+|\d{1,3}|[^\sA-Za-z\d])/g
  const tokens: Tok[] = []
  let m: RegExpExecArray | null
  let truncated = false
  while ((m = re.exec(text))) {
    const lead = m[1]
    const body = m[0].slice(lead.length)
    const start = m.index
    let parts: string[]
    let kind: TokKind
    if (/^[A-Za-z]+$/.test(body)) {
      parts = splitWord(body)
      kind = parts.length > 1 ? 'piece' : 'word'
    } else if (/^\d+$/.test(body)) {
      parts = [body]
      kind = 'number'
    } else if (body.startsWith("'")) {
      parts = [body]
      kind = 'piece'
    } else {
      parts = [body]
      kind = 'punct'
    }
    let cursor = start
    parts.forEach((p, i) => {
      const t = (i === 0 ? lead : '') + p
      tokens.push({
        text: t,
        shown: t.startsWith(' ') ? '▁' + t.slice(1) : t,
        id: tokenId(t),
        kind,
        start: cursor,
        end: cursor + t.length,
      })
      cursor += t.length
    })
    if (tokens.length >= MAX_TOKENS) {
      truncated = re.lastIndex < text.length
      break
    }
  }
  return { tokens: tokens.slice(0, MAX_TOKENS), text, truncated }
}

/* ---------------- illustrative vectors ---------------- */

export const D = 16

const GROUPS: Record<string, string> = {
  question: 'qa', answer: 'qa', ask: 'qa', understand: 'qa', how: 'qa', does: 'qa',
  llm: 'ml', model: 'ml', ll: 'ml', m: 'ml',
  morning: 'sun', east: 'sun', sky: 'sun', sun: 'sun', rises: 'sun', world: 'sun', west: 'sun',
  animal: 'life', tired: 'life', street: 'life', cross: 'life',
}

function gauss(r: () => number) {
  return (r() + r() + r() + r() - 2) * 1.7
}

const groupCache = new Map<string, number[]>()
function groupVec(g: string) {
  let v = groupCache.get(g)
  if (!v) {
    const r = rng(hash('g:' + g))
    v = Array.from({ length: D }, () => gauss(r))
    groupCache.set(g, v)
  }
  return v
}

export function vectorOf(tok: Tok): number[] {
  const key = tok.text.trim().toLowerCase()
  const r = rng(hash('v:' + key))
  const base = Array.from({ length: D }, () => gauss(r))
  const g = GROUPS[key]
  const gv = g ? groupVec(g) : null
  return base.map((b, i) => {
    const v = gv ? b * 0.5 + gv[i] * 0.85 : b
    return Math.max(-0.99, Math.min(0.99, v * 0.62))
  })
}

/** classic sinusoidal positional pattern, scaled down for the demo */
export function positionVec(pos: number): number[] {
  return Array.from({ length: D }, (_, i) => {
    const k = Math.floor(i / 2)
    const freq = 1 / Math.pow(10000, (2 * k) / D)
    const a = pos * freq * 3.2
    return 0.45 * (i % 2 === 0 ? Math.sin(a) : Math.cos(a))
  })
}

export const add = (a: number[], b: number[]) => a.map((x, i) => x + b[i])

const PROJ = (() => {
  const r = rng(7)
  return [Array.from({ length: D }, () => gauss(r)), Array.from({ length: D }, () => gauss(r))]
})()

/** fixed random 2-D projection of the 16 demo dimensions (a shadow, not the vector) */
export function project(v: number[]): [number, number] {
  const f = (row: number[]) => row.reduce((s, w, i) => s + w * v[i], 0) / 3.4
  return [f(PROJ[0]), f(PROJ[1])]
}

export function cosine(a: number[], b: number[]) {
  let d = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return d / (Math.sqrt(na * nb) || 1)
}

export const fmt = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2)

/** diverging colour for a value in [-1, 1] */
export function divergeColor(v: number) {
  const a = Math.min(1, Math.abs(v) * 1.35)
  return v >= 0 ? `rgba(92,225,255,${0.12 + a * 0.85})` : `rgba(255,170,96,${0.12 + a * 0.85})`
}

const PALETTE = ['#5ce1ff', '#6f93ff', '#a07bff', '#7be0c8', '#8fb4ff', '#c29bff']
export const tokColor = (i: number) => PALETTE[i % PALETTE.length]
