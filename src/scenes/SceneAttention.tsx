import { useMemo, useState } from 'react'
import { tokColor } from '../lib/text'
import type { SceneProps } from '../types'
import { SCENES } from '../types'
import { Deeper, Hint, Legend, NextBar, SceneHead, Tag, useWidth } from '../components/ui'

const SENT = ['The', ' animal', ' didn', "'t", ' cross', ' the', ' street', ' because', ' it', ' was', ' tired', '.']
const N = SENT.length

const BOOST: Record<string, number> = {
  '8,1': 2.8, '8,6': 2.0, '8,10': 1.8, '8,7': 0.6, '8,9': 0.4,
  '3,2': 3.2, '2,1': 1.8, '4,1': 2.0, '4,2': 0.8, '4,6': 0.9, '6,5': 2.2, '6,4': 1.3, '5,4': 0.7,
  '7,4': 1.1, '7,6': 0.9, '9,8': 2.2, '10,9': 1.6, '10,8': 1.9, '10,1': 1.6, '11,10': 1.8, '11,4': 0.7, '1,0': 2.0, '10,7': 0.8,
}

function weights(causal: boolean): number[][] {
  return Array.from({ length: N }, (_, i) => {
    const raw = Array.from({ length: N }, (_, j) => {
      if (causal && j > i) return -Infinity
      return -0.45 * Math.abs(i - j) + (i === j ? 0.6 : 0) + (BOOST[`${i},${j}`] ?? 0)
    })
    const m = Math.max(...raw)
    const e = raw.map((r) => (r === -Infinity ? 0 : Math.exp(r - m)))
    const s = e.reduce((a, b) => a + b, 0)
    return e.map((x) => x / s)
  })
}

const label = (s: string) => s.trim()
const pctText = (w: number) => `${Math.round(w * 100)}%`

export default function SceneAttention({ mode, go }: SceneProps) {
  const [wrap, W0] = useWidth<HTMLDivElement>()
  const [sel, setSel] = useState(8)
  const [pin, setPin] = useState<number | null>(null)
  const [causal, setCausal] = useState(true)
  const [showLinks, setShowLinks] = useState(true)
  const [replay, setReplay] = useState(1)

  const A = useMemo(() => weights(causal), [causal])
  const W = Math.max(W0, 760)
  const cell = W / N
  const cx = (i: number) => (i + 0.5) * cell
  const TOPH = 210, ROW = 64

  const arcs = (i: number, up: boolean) => {
    const list = A[i].map((w, j) => ({ w, j })).filter((a) => a.j !== i && a.w > 0.03).sort((a, b) => b.w - a.w)
    const max = list[0]?.w ?? 1
    return list.map((a, r) => {
      const x0 = cx(a.j), x1 = cx(i)
      const dist = Math.abs(a.j - i)
      const h = Math.min(TOPH - 24, 36 + dist * cell * 0.3)
      const y = up ? TOPH - 4 : TOPH + ROW + 4
      const cy = up ? y - h : y + h
      return { ...a, r, d: `M${x0},${y} Q${(x0 + x1) / 2},${cy} ${x1},${y}`, width: 1 + (a.w / max) * 6, op: 0.28 + 0.72 * (a.w / max) }
    })
  }

  const top = A[sel].map((w, j) => ({ w, j })).filter((a) => a.j !== sel).sort((a, b) => b.w - a.w).slice(0, 3)
  const primary = showLinks ? arcs(sel, true) : []
  const pinned = pin !== null && pin !== sel && showLinks ? arcs(pin, false) : []

  const choose = (i: number) => setSel(i)
  const rep = () => setReplay((r) => r + 1)

  return (
    <div className="scene s-attn">
      <div className="copy">
        <SceneHead n={4} label="Attention" question="How can a token use information from other tokens?">
          To make sense of “it”, the model needs the words around it. <b>Self-attention</b> compares a token with the others and blends in information from the ones that seem relevant.
        </SceneHead>
        <Hint>Select “it”, then other tokens, and compare the patterns.</Hint>
        <div className="row-btns">
          <button className="btn primary small" onClick={rep}>↺ Replay flow</button>
          <button className={`btn small ${showLinks ? 'ghost' : 'on'}`} onClick={() => setShowLinks(!showLinks)} aria-pressed={!showLinks}>{showLinks ? 'Hide connections' : 'Show connections'}</button>
          <button
            className={`btn small ${pin === sel ? 'on' : 'ghost'}`}
            onClick={() => setPin(pin === sel ? null : sel)}
            aria-pressed={pin === sel}
            title="Keep this token's pattern (violet) while you select another"
          >
            {pin === sel ? `Pinned “${label(SENT[sel])}”` : `Pin “${label(SENT[sel])}” to compare`}
          </button>
        </div>

        <div className="note-box">
          <Tag kind="illustrative" />
          <p>These weights are <b>hand-made for teaching</b>. In a real model every layer has many attention heads, each with its own pattern, and most have no tidy linguistic role.</p>
          <p>Attention maps are a clue, not a full explanation of why a model produced an output.</p>
        </div>

        <Deeper mode={mode}>
          <p>Each token’s vector is turned into a <b>query</b>, a <b>key</b> and a <b>value</b>. Query-key similarity gives a score for every other position; softmax turns the scores into weights that sum to 1; the output is a weighted blend of the values. The “causal mask” hides later tokens, which is how text-generating models avoid peeking at words they have not produced yet.</p>
        </Deeper>
        <Legend items={[
          { kind: 'established', text: 'Attention mixes information across positions using learned relevance weights.' },
          { kind: 'simplified', text: 'One averaged pattern with hand-picked weights.' },
          { kind: 'varies', text: 'Heads and their patterns differ by model, layer and input.' },
        ]} />
        <NextBar mode={mode} label="Next-token prediction" hint={SCENES[3].next} onNext={() => go(4)} onPrev={() => go(2)} />
      </div>

      <div className="visual">
        <div className="atn-scroll">
          <div className="atn" ref={wrap} style={{ minWidth: 760, height: TOPH + ROW + 170 }}>
            <svg width={W} height={TOPH + ROW + 170} aria-hidden>
              {primary.map((a) => (
                <g key={`p${sel}-${a.j}-${replay}-${causal}`}>
                  <path className="aarc" pathLength={1} d={a.d} style={{ strokeWidth: a.width, opacity: a.op, ['--r' as string]: a.r }} />
                  <circle r={2.2 + a.w * 4} className="adot" style={{ ['--r' as string]: a.r }}>
                    <animateMotion dur="1.1s" begin={`${0.35 + a.r * 0.12}s`} path={a.d} fill="freeze" calcMode="spline" keySplines=".5 0 .3 1" keyTimes="0;1" />
                  </circle>
                </g>
              ))}
              {pinned.map((a) => (
                <g key={`q${pin}-${a.j}-${replay}-${causal}`}>
                  <path className="aarc pin" pathLength={1} d={a.d} style={{ strokeWidth: a.width, opacity: a.op, ['--r' as string]: a.r }} />
                </g>
              ))}
            </svg>
            <div className="atn-row" style={{ top: TOPH, height: ROW }}>
              {SENT.map((s, i) => (
                <button
                  key={i}
                  className={`atok ${i === sel ? 'on' : ''} ${i === pin ? 'pin' : ''}`}
                  style={{ left: cx(i), ['--c' as string]: tokColor(i) }}
                  onClick={() => choose(i)}
                  aria-pressed={i === sel}
                >
                  {s.startsWith(' ') ? <><i className="sp" />{s.slice(1)}</> : s}
                  {primary.length > 0 && i !== sel && A[sel][i] > 0.03 && <small>{pctText(A[sel][i])}</small>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="atn-lower">
          <div className="matrix">
            <div className="space-head">
              <span>Simplified attention matrix</span>
              <Tag kind="illustrative">illustrative</Tag>
            </div>
            <svg viewBox="0 0 330 330" role="img" aria-label="Attention weight matrix, rows are the token attending, columns are the token attended to">
              <defs>
                <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="rgba(160,180,255,.18)" strokeWidth="1" /></pattern>
              </defs>
              {SENT.map((s, j) => (
                <text key={`c${j}`} className="mlab col" transform={`translate(${62 + j * 22 + 11},56) rotate(-55)`}>{label(s)}</text>
              ))}
              {SENT.map((s, i) => (
                <g key={i} className={`mrow ${i === sel ? 'sel' : ''} ${i === pin ? 'pin' : ''}`} onClick={() => choose(i)}>
                  <text className="mlab" x="56" y={72 + i * 22 + 14} textAnchor="end">{label(s)}</text>
                  {A[i].map((w, j) => (
                    <rect
                      key={j}
                      x={62 + j * 22}
                      y={72 + i * 22}
                      width="20"
                      height="20"
                      rx="3"
                      fill={causal && j > i ? 'url(#hatch)' : `rgba(92,225,255,${0.05 + w * 1.05})`}
                      className={j === sel && i !== sel ? '' : ''}
                    />
                  ))}
                  <rect className="mframe" x="60" y={70 + i * 22} width={N * 22 + 4} height="24" rx="5" />
                </g>
              ))}
            </svg>
            <p className="space-note">Row = the token doing the looking. Column = where it looks. Brighter = more weight. Hatched cells are hidden by the causal mask.</p>
          </div>

          <div className="readout">
            <div className="seg wide" role="group" aria-label="Attention mask">
              <button className={causal ? 'on' : ''} onClick={() => setCausal(true)}>Causal · text generators</button>
              <button className={!causal ? 'on' : ''} onClick={() => setCausal(false)}>Bidirectional · contrast</button>
            </div>
            <div className="read-main">
              <div className="read-title"><span style={{ color: tokColor(sel) }}>“{label(SENT[sel])}”</span> draws most on</div>
              <ol className="read-list">
                {top.map((t) => (
                  <li key={t.j}>
                    <span>{label(SENT[t.j])}</span>
                    <i><b style={{ width: `${t.w * 100}%` }} /></i>
                    <em>{pctText(t.w)}</em>
                  </li>
                ))}
              </ol>
              {sel === 8 && causal && (
                <p className="read-note">“tired” comes later, so in a text generator “it” cannot look at it directly. Later layers and positions can still use what “it” has gathered. Switch the mask to see the contrast.</p>
              )}
              {sel === 8 && !causal && (
                <p className="read-note">With the future visible, “it” can also weigh “tired”. Models that read whole sentences at once (not text generators) work this way.</p>
              )}
              {sel !== 8 && <p className="read-note">Different tokens show different patterns. Select “it” again to compare.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
