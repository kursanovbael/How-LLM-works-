import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Mode } from '../types'

export type TagKind = 'established' | 'simplified' | 'illustrative' | 'varies'

const TAG_LABEL: Record<TagKind, string> = {
  established: 'Established concept',
  simplified: 'Simplified teaching model',
  illustrative: 'Illustrative demo values',
  varies: 'Varies by model',
}

export function Tag({ kind, children }: { kind: TagKind; children?: ReactNode }) {
  return <span className={`tag tag-${kind}`}>{children ?? TAG_LABEL[kind]}</span>
}

export function Legend({ items }: { items: { kind: TagKind; text: string }[] }) {
  return (
    <ul className="legend" aria-label="What is real and what is simplified">
      {items.map((it) => (
        <li key={it.text}>
          <Tag kind={it.kind} />
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  )
}

export function SceneHead({ n, label, question, children }: { n: number; label: string; question: string; children: ReactNode }) {
  return (
    <header className="head">
      <div className="eyebrow">
        <span className="eyebrow-n">{String(n).padStart(2, '0')}</span>
        <span className="eyebrow-bar" />
        <span>{label}</span>
      </div>
      <h2 className="q">{question}</h2>
      <p className="lede">{children}</p>
    </header>
  )
}

/** Extra detail: open by default in Explore mode, folded in Guided mode. */
export function Deeper({ mode, title = 'Under the hood', children }: { mode: Mode; title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(mode === 'explore')
  useEffect(() => setOpen(mode === 'explore'), [mode])
  return (
    <div className={`deeper ${open ? 'open' : ''}`}>
      <button className="deeper-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="deeper-plus" aria-hidden>{open ? '–' : '+'}</span>
        {title}
      </button>
      {open && <div className="deeper-body">{children}</div>}
    </div>
  )
}

export function NextBar({ mode, label, hint, onNext, onPrev }: { mode: Mode; label: string; hint: string; onNext: () => void; onPrev?: () => void }) {
  return (
    <div className={`nextbar ${mode}`}>
      {onPrev && (
        <button className="btn ghost small" onClick={onPrev} aria-label="Previous scene">← Back</button>
      )}
      <button className={mode === 'guided' ? 'btn primary' : 'btn ghost small'} onClick={onNext}>
        {mode === 'guided' ? <><span className="next-kicker">Next</span>{label} →</> : <>{label} →</>}
      </button>
      {mode === 'guided' && <span className="next-hint">{hint}</span>}
    </div>
  )
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="hint">
      <span className="hint-dot" aria-hidden />
      {children}
    </div>
  )
}

/** Width of an element in px, updated on resize. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** setTimeout sequence that cleans up on unmount / restart. */
export function useTimers() {
  const ids = useRef<number[]>([])
  useEffect(() => () => ids.current.forEach(clearTimeout), [])
  return {
    after(ms: number, fn: () => void) {
      ids.current.push(window.setTimeout(fn, ms))
    },
    clear() {
      ids.current.forEach(clearTimeout)
      ids.current = []
    },
  }
}
