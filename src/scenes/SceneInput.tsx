import { useLayoutEffect, useRef, useState } from 'react'
import { tokenize, tokColor } from '../lib/text'
import type { SceneProps } from '../types'
import { SCENES } from '../types'
import { Deeper, Hint, Legend, NextBar, SceneHead } from '../components/ui'

const KIND_LABEL = { word: 'Whole word', piece: 'Word piece', punct: 'Punctuation', number: 'Digits' } as const

export default function SceneInput({ tokens, sel, setSel, mode, go }: SceneProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ a: [number, number]; b: [number, number] }[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const text = tokenize(tokens.map((t) => t.text).join('')).text
  const words = text.split(' ').length
  const tok = tokens[sel]

  useLayoutEffect(() => {
    const measure = () => {
      const root = wrap.current
      if (!root) return
      const R = root.getBoundingClientRect()
      const out = tokens.map((_, i) => {
        const s = root.querySelector<HTMLElement>(`[data-seg="${i}"]`)!.getBoundingClientRect()
        const c = root.querySelector<HTMLElement>(`[data-chip="${i}"]`)!.getBoundingClientRect()
        return {
          a: [s.left + s.width / 2 - R.left, s.bottom - R.top] as [number, number],
          b: [c.left + c.width / 2 - R.left, c.top - R.top] as [number, number],
        }
      })
      setPos(out)
      setSize({ w: R.width, h: R.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrap.current!)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [tokens])

  return (
    <div className="scene s-input">
      <div className="copy">
        <SceneHead n={1} label="Input" question="What does the model receive?">
          Not letters, and not quite words. A tokenizer first cuts your text into small pieces called <b>tokens</b>, and everything after that works on them.
        </SceneHead>
        <Hint>Click any token to inspect it.</Hint>
        <div className="inspector" aria-live="polite">
          <div className="insp-top">
            <span className="insp-token" style={{ color: tokColor(sel) }}>{tok.shown}</span>
            <span className="insp-kind">{KIND_LABEL[tok.kind]}</span>
          </div>
          <dl className="insp-grid">
            <div><dt>Position</dt><dd>{sel + 1} of {tokens.length}</dd></div>
            <div><dt>Demo ID</dt><dd>{tok.id}</dd></div>
            <div><dt>Characters</dt><dd>{tok.text.length}</dd></div>
          </dl>
          <p className="insp-note">
            {tok.text.startsWith(' ') ? 'The leading space (▁) is part of this token. ' : ''}
            {tok.kind === 'piece' ? 'A longer or unfamiliar word can be split into several pieces. ' : ''}
            {tok.kind === 'punct' ? 'Punctuation usually gets tokens of its own. ' : ''}
            A token may be a whole word, part of a word, punctuation, or another text unit.
          </p>
        </div>
        <Deeper mode={mode}>
          <p>Real tokenizers (such as byte-pair encoding) learn their vocabulary from data, so the same sentence can split differently in different models. Common words are often a single token; rare words, names and code are split into more pieces.</p>
        </Deeper>
        <Legend items={[
          { kind: 'established', text: 'Models read tokens, not raw text.' },
          { kind: 'simplified', text: 'This splitter is a small demo rule set, not a real model’s tokenizer.' },
          { kind: 'illustrative', text: 'Token IDs are made up.' },
        ]} />
        <NextBar mode={mode} label="Embeddings" hint={SCENES[0].next} onNext={() => go(1)} />
      </div>

      <div className="visual">
        <div className="tokstage" ref={wrap}>
          <div className="tok-sentence" aria-label="Original text">
            <div className="cap">Original text</div>
            <p>
              {tokens.map((t, i) => (
                <span
                  key={i}
                  data-seg={i}
                  className={`tseg ${i === sel ? 'on' : ''}`}
                  style={{ ['--c' as string]: tokColor(i) }}
                  onMouseEnter={() => setSel(i)}
                >
                  {t.text}
                </span>
              ))}
            </p>
          </div>

          <svg className="tok-links" width={size.w} height={size.h} aria-hidden>
            {pos.map((p, i) => {
              const my = (p.a[1] + p.b[1]) / 2
              return (
                <path
                  key={i}
                  className={`link ${i === sel ? 'on' : ''}`}
                  style={{ ['--i' as string]: i, stroke: tokColor(i) }}
                  d={`M${p.a[0]},${p.a[1]} C${p.a[0]},${my} ${p.b[0]},${my} ${p.b[0]},${p.b[1]}`}
                />
              )
            })}
          </svg>

          <div className="tok-row">
            <div className="cap">{tokens.length} tokens from {words} words</div>
            <div className="chips">
              {tokens.map((t, i) => (
                <button
                  key={i}
                  data-chip={i}
                  className={`chip tchip ${i === sel ? 'on' : ''}`}
                  style={{ ['--c' as string]: tokColor(i), ['--i' as string]: i }}
                  onClick={() => setSel(i)}
                  aria-pressed={i === sel}
                  aria-label={`Token ${i + 1}: ${t.shown}`}
                >
                  {t.text.startsWith(' ') ? <><i className="sp" />{t.text.slice(1)}</> : t.text}
                  <small>{t.id}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
