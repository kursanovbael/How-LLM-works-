import { useEffect, useMemo, useState } from 'react'
import { add, cosine, divergeColor, fmt, positionVec, project, tokColor, vectorOf } from '../lib/text'
import type { SceneProps } from '../types'
import { SCENES } from '../types'
import { Deeper, Hint, Legend, NextBar, SceneHead, Tag, prefersReduced, useTimers } from '../components/ui'

const SHOWN = 8

function Cells({ v, show, onHover }: { v: number[]; show: boolean; onHover?: (i: number | null) => void }) {
  return (
    <div className="cells">
      {v.slice(0, SHOWN).map((x, i) => (
        <div
          key={i}
          className={`cell ${show ? 'show' : ''}`}
          style={{ ['--d' as string]: `${i * 70}ms`, background: divergeColor(x) }}
          onMouseEnter={() => onHover?.(i)}
          onMouseLeave={() => onHover?.(null)}
        >
          <span>{x.toFixed(2)}</span>
        </div>
      ))}
      <div className="cell more"><span>…</span></div>
    </div>
  )
}

function Bars({ v, show, onHover }: { v: number[]; show: boolean; onHover: (i: number | null) => void }) {
  return (
    <div className="bars" role="img" aria-label="First eight illustrative vector dimensions">
      <div className="bars-axis" />
      {v.slice(0, SHOWN).map((x, i) => (
        <div key={i} className="bar-col" onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)}>
          <div className="bar-half up">{x > 0 && <i className={show ? 'show' : ''} style={{ height: `${x * 100}%`, ['--d' as string]: `${i * 80}ms` }} />}</div>
          <div className="bar-half down">{x < 0 && <i className={show ? 'show' : ''} style={{ height: `${-x * 100}%`, ['--d' as string]: `${i * 80}ms` }} />}</div>
          <b>{fmt(x)}</b>
          <u>d{i + 1}</u>
        </div>
      ))}
      <div className="bar-col more"><b>…</b><u>d16+</u></div>
    </div>
  )
}

export default function SceneEmbeddings({ tokens, sel, setSel, mode, go }: SceneProps) {
  const [phase, setPhase] = useState(prefersReduced() || mode === 'explore' ? 4 : 0)
  const [cmpOn, setCmpOn] = useState(false)
  const [cmp, setCmp] = useState<number | null>(null)
  const [dim, setDim] = useState<number | null>(null)
  const [shift, setShift] = useState(true)
  const t = useTimers()

  const run = () => {
    t.clear()
    if (prefersReduced()) return setPhase(4)
    setPhase(0)
    ;[1, 2, 3, 4].forEach((p) => t.after(p * 1000 - 500, () => setPhase(p)))
  }
  useEffect(() => {
    if (mode === 'guided' && !prefersReduced()) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const vecs = useMemo(() => tokens.map(vectorOf), [tokens])
  const pts = useMemo(() => {
    const raw = vecs.map((v, i) => ({ a: project(v), b: project(add(v, positionVec(i))) }))
    const m = Math.max(0.01, ...raw.flatMap((p) => [Math.abs(p.a[0]), Math.abs(p.a[1]), Math.abs(p.b[0]), Math.abs(p.b[1])]))
    const k = 1 / m
    return raw.map((p) => ({ a: [p.a[0] * k, p.a[1] * k] as [number, number], b: [p.b[0] * k, p.b[1] * k] as [number, number] }))
  }, [vecs])

  const tok = tokens[sel]
  const vec = vecs[sel]
  const pos = useMemo(() => positionVec(sel), [sel])
  const aware = useMemo(() => add(vec, pos), [vec, pos])
  const other = cmp !== null && cmp !== sel ? cmp : null
  const sim = other !== null ? cosine(vec, vecs[other]) : null

  const pick = (i: number) => {
    if (cmpOn && i !== sel) setCmp(i)
    else { setSel(i); if (cmp === i) setCmp(null) }
    if (mode === 'guided') run()
  }

  const X = (n: number) => 300 + n * 235
  const Y = (n: number) => 175 + n * 125

  return (
    <div className="scene s-embed">
      <div className="copy">
        <SceneHead n={2} label="Embeddings" question="How does text become numbers?">
          A neural network can only compute with numbers. Each token is looked up by its ID and becomes a long list of numbers, a <b>vector</b>. Position is mixed in so order is not lost.
        </SceneHead>
        <div className="row-btns">
          <button className="btn primary small" onClick={run}>▶ Run transformation</button>
          <button className={`btn small ${cmpOn ? 'on' : 'ghost'}`} onClick={() => { setCmpOn(!cmpOn); if (cmpOn) setCmp(null) }} aria-pressed={cmpOn}>
            {cmpOn ? 'Comparing: pick a 2nd token' : 'Compare two vectors'}
          </button>
        </div>
        <Hint>Pick a token, then run the transformation.</Hint>

        <div className="note-box">
          <Tag kind="illustrative" />
          <p>Every number on this page is <b>invented for the demo</b>. They are not taken from a real model.</p>
          <p>A real vector has hundreds to thousands of dimensions, and no single dimension has a simple meaning you could label.</p>
        </div>

        <Deeper mode={mode}>
          <p>Embeddings are <b>learned</b>: during training the numbers are adjusted until they help the model predict text well. Similar usage tends to end up with similar vectors, but the individual dimensions are not human-readable features.</p>
          <p>Positional information is how the model represents order. The classic way is to add a position pattern to the token vector (shown here). Other designs exist, such as learned positions or rotary embeddings, so implementations differ.</p>
        </Deeper>
        <Legend items={[
          { kind: 'established', text: 'Tokens → IDs → learned vectors, plus positional information.' },
          { kind: 'simplified', text: '16 dimensions, 8 shown. The 2-D map is a flat shadow of them.' },
          { kind: 'varies', text: 'How position is encoded differs between models.' },
        ]} />
        <NextBar mode={mode} label="The Transformer" hint={SCENES[1].next} onNext={() => go(2)} onPrev={() => go(0)} />
      </div>

      <div className="visual">
        <div className="picker" role="group" aria-label="Choose a token">
          {tokens.map((tk, i) => (
            <button
              key={i}
              className={`chip mini ${i === sel ? 'on' : ''} ${i === other ? 'cmp' : ''}`}
              style={{ ['--c' as string]: i === other ? 'var(--violet)' : tokColor(i) }}
              onClick={() => pick(i)}
              aria-pressed={i === sel || i === other}
            >
              {tk.text.startsWith(' ') ? <><i className="sp" />{tk.text.slice(1)}</> : tk.text}
            </button>
          ))}
        </div>

        <div className="pipe">
          <div className={`pstage ${phase === 1 ? 'lit' : ''} ${phase >= 1 ? 'seen' : ''}`}>
            <div className="plabel"><b>1</b> Text</div>
            <div className="pbody big-token" style={{ color: tokColor(sel) }}>{tok.shown}</div>
            <div className="pfoot">the piece of text</div>
          </div>
          <div className={`parrow ${phase === 2 ? 'go' : ''}`} aria-hidden><i /></div>

          <div className={`pstage ${phase === 2 ? 'lit' : ''} ${phase >= 2 ? 'seen' : ''}`}>
            <div className="plabel"><b>2</b> Token ID</div>
            <div className="pbody">
              <div className="vocab">
                {[...new Map(tokens.map((x) => [x.id, x])).values()].sort((a, b) => a.id - b.id).filter((x, _i, arr) => {
                  const k = arr.findIndex((y) => y.id === tok.id)
                  const j = arr.indexOf(x)
                  return Math.abs(j - k) <= 2
                }).map((x) => (
                  <div key={x.id} className={x.id === tok.id ? 'on' : ''}><span>{x.id}</span><em>{x.shown}</em></div>
                ))}
              </div>
            </div>
            <div className="pfoot">a lookup in the vocabulary</div>
          </div>
          <div className={`parrow ${phase === 3 ? 'go' : ''}`} aria-hidden><i /></div>

          <div className={`pstage wide ${phase === 3 ? 'lit' : ''} ${phase >= 3 ? 'seen' : ''}`}>
            <div className="plabel"><b>3</b> Vector</div>
            <div className="pbody"><Bars v={vec} show={phase >= 3} onHover={setDim} /></div>
            <div className="pfoot dimtip">
              {dim === null ? 'first 8 of 16 demo dimensions' : `d${dim + 1} = ${fmt(vec[dim])} · no standalone meaning`}
            </div>
          </div>
          <div className={`parrow ${phase === 4 ? 'go' : ''}`} aria-hidden><i /></div>

          <div className={`pstage wide ${phase === 4 ? 'lit' : ''} ${phase >= 4 ? 'seen' : ''}`}>
            <div className="plabel"><b>4</b> Position-aware</div>
            <div className="pbody sum">
              <div className="sum-row"><em>token</em><Cells v={vec} show={phase >= 4} /></div>
              <div className="sum-op">+ position {sel + 1}</div>
              <div className="sum-row"><em>pos.</em><Cells v={pos} show={phase >= 4} /></div>
              <div className="sum-op">=</div>
              <div className="sum-row res"><em>input</em><Cells v={aware} show={phase >= 4} /></div>
            </div>
            <div className="pfoot">what enters the first layer</div>
          </div>
        </div>

        <div className="space-row">
          <div className="space">
            <div className="space-head">
              <span>A flat shadow of the vector space</span>
              <label className="check">
                <input type="checkbox" checked={shift} onChange={(e) => setShift(e.target.checked)} /> show position shift
              </label>
            </div>
            <svg viewBox="0 0 600 350" role="img" aria-label="Two-dimensional projection of illustrative token vectors">
              <defs>
                <marker id="ah" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" fill="var(--warm)" />
                </marker>
              </defs>
              {[-1, -0.5, 0, 0.5, 1].map((g) => (
                <g key={g} className="grid">
                  <line x1={X(g)} y1="20" x2={X(g)} y2="330" />
                  <line x1="40" y1={Y(g)} x2="560" y2={Y(g)} />
                </g>
              ))}
              {other !== null && (
                <line className="cmp-line" x1={X(pts[sel].a[0])} y1={Y(pts[sel].a[1])} x2={X(pts[other].a[0])} y2={Y(pts[other].a[1])} />
              )}
              {shift && (
                <line className="shift-line" x1={X(pts[sel].a[0])} y1={Y(pts[sel].a[1])} x2={X(pts[sel].b[0])} y2={Y(pts[sel].b[1])} markerEnd="url(#ah)" />
              )}
              {pts.map((p, i) => {
                const on = i === sel, c = i === other
                return (
                  <g key={i} className={`pt ${on ? 'on' : ''} ${c ? 'cmp' : ''}`} transform={`translate(${X(p.a[0])},${Y(p.a[1])})`} onClick={() => pick(i)}>
                    <circle className="halo" r={on || c ? 15 : 9} />
                    <circle className="dot" r={on || c ? 5.5 : 3.6} fill={c ? 'var(--violet)' : tokColor(i)} />
                    <text x="9" y="-8">{tokens[i].shown}</text>
                  </g>
                )
              })}
              {shift && (
                <circle className="ring" cx={X(pts[sel].b[0])} cy={Y(pts[sel].b[1])} r="7" />
              )}
            </svg>
            <p className="space-note">
              {shift ? '● token vector, ◯ same token with its position added. ' : ''}
              A 2-D picture cannot show a 16-dimensional vector, let alone thousands. This is a fixed random projection used only to give a feel for “nearness”.
            </p>
          </div>

          <div className="compare">
            <div className="space-head"><span>Compare</span></div>
            {other === null ? (
              <p className="empty">Press <b>Compare two vectors</b>, then choose a second token to see how similar the illustrative vectors are.</p>
            ) : (
              <>
                <div className="cmp-pair">
                  <span style={{ color: tokColor(sel) }}>{tok.shown}</span>
                  <span className="vs">vs</span>
                  <span style={{ color: 'var(--violet)' }}>{tokens[other].shown}</span>
                </div>
                <Cells v={vec} show />
                <Cells v={vecs[other]} show />
                <div className="gauge" aria-label={`Cosine similarity ${sim!.toFixed(2)}`}>
                  <div className="gauge-track"><i style={{ left: `${(sim! + 1) * 50}%` }} /></div>
                  <div className="gauge-scale"><span>−1</span><span>0</span><span>+1</span></div>
                </div>
                <p className="cmp-val">cosine similarity <b>{fmt(sim!)}</b> <Tag kind="illustrative">illustrative</Tag></p>
                <p className="empty">Some demo words were placed in loose groups so nearness is visible. In a real model, similarity emerges from training.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
