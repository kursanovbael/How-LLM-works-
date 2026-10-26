import { useMemo, useState } from 'react'
import { divergeColor, hash, tokColor, vectorOf } from '../lib/text'
import type { SceneProps } from '../types'
import { SCENES } from '../types'
import { Deeper, Hint, Legend, NextBar, SceneHead, Tag, useWidth } from '../components/ui'
import type { TagKind } from '../components/ui'

interface Row { id: string; label: string; kind: 'input' | 'attn' | 'ffn' | 'more' | 'final' | 'out'; title: string; text: string; tag: TagKind; tagText?: string }

const ROWS: Row[] = [
  { id: 'input', label: 'Input representations', kind: 'input', title: 'Input representations', tag: 'established',
    text: 'One vector per token: the embedding plus positional information from the previous scene. This is the stack of vectors the first layer receives.' },
  { id: 'attn1', label: 'Self-attention · layer 1', kind: 'attn', title: 'Self-attention', tag: 'established',
    text: 'Each token’s vector is updated using information gathered from other positions. In a text-generating model a token can only look at itself and earlier tokens. After this step every vector carries context. Scene 04 opens this up.' },
  { id: 'ffn1', label: 'Feed-forward network · layer 1', kind: 'ffn', title: 'Feed-forward network', tag: 'established',
    text: 'A small neural network applied to each position on its own. It transforms the context-rich vector further. Attention moves information between positions; this step processes it within each position.' },
  { id: 'attn2', label: 'Self-attention · layer 2', kind: 'attn', title: 'Another attention step', tag: 'simplified', tagText: 'Simplified teaching model',
    text: 'The same recipe again, with its own learned parameters. Because it reads vectors that already hold context, it can combine information in new ways. Each layer refines the representations.' },
  { id: 'ffn2', label: 'Feed-forward network · layer 2', kind: 'ffn', title: 'Another feed-forward step', tag: 'simplified', tagText: 'Simplified teaching model',
    text: 'Dashed side paths are residual connections: each step adds its result to what came in, rather than replacing it. Normalisation layers, left out here, keep the numbers well-behaved.' },
  { id: 'more', label: 'Repeated layers', kind: 'more', title: 'Many repeated layers', tag: 'varies', tagText: 'Varies by model',
    text: 'The attention + feed-forward block repeats many times. Small models use a handful of layers; large ones use dozens. The layer count, width and details differ between models.' },
  { id: 'final', label: 'Final representations', kind: 'final', title: 'Final representations', tag: 'established',
    text: 'After the last layer each position holds a rich, context-aware vector. For predicting the next token, the vector at the last position is the one that gets turned into scores.' },
  { id: 'out', label: 'Next-token scores', kind: 'out', title: 'Scores for the next token', tag: 'established',
    text: 'The last position’s vector is projected onto the whole vocabulary, giving one score per possible token. Those scores become probabilities, and one token is chosen. Scene 05 shows that step.' },
]

const RH = 76

export default function SceneTransformer({ tokens, mode, go }: SceneProps) {
  const [wrap, W0] = useWidth<HTMLDivElement>()
  const [selRow, setSelRow] = useState('attn1')
  const [run, setRun] = useState(mode === 'guided' ? 1 : 0)

  const W = Math.max(W0, 320)
  const n = Math.min(tokens.length, W < 560 ? 5 : 8)
  const show = tokens.slice(0, n)
  const pad = W < 560 ? 38 : 64
  const xs = show.map((_, i) => (n === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (n - 1)))
  const cw = Math.min(74, (W - pad * 2) / Math.max(n - 1, 1) - 8)
  const top = 52
  const H = top + ROWS.length * RH
  const y = (i: number) => top + i * RH
  const sel = ROWS.find((r) => r.id === selRow)!
  const vecs = useMemo(() => show.map(vectorOf), [show.map((t) => t.text).join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  const arcs = useMemo(() => {
    const out: { i: number; j: number; k: number }[] = []
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < j; i++) {
        if ((hash(`${i}-${j}`) % 100) / 100 < 0.55 + (j - i === 1 ? 0.4 : 0)) out.push({ i, j, k: hash(`w${i}${j}`) % 100 })
      }
    }
    return out
  }, [n])

  const x0 = xs[0] - cw / 2 - 14
  const x1 = xs[n - 1] + cw / 2 + 14

  return (
    <div className="scene s-tf">
      <div className="copy">
        <SceneHead n={3} label="The Transformer" question="How does the model process the representations?">
          The vectors pass through a <b>stack of layers</b>. Each layer lets tokens exchange information, then transforms the result. Nothing here is one magical brain: it is the same few steps, repeated.
        </SceneHead>
        <div className="row-btns">
          <button className="btn primary small" onClick={() => setRun((r) => r + 1)}>▶ Run a forward pass</button>
        </div>
        <Hint>Click any layer to learn what it does.</Hint>

        <div className="detail" aria-live="polite">
          <div className="detail-top"><span className="detail-name">{sel.title}</span><Tag kind={sel.tag}>{sel.tagText}</Tag></div>
          <p>{sel.text}</p>
        </div>

        <Deeper mode={mode}>
          <p>This is the decoder-style Transformer used by most text-generating LLMs. Real blocks also contain layer normalisation, many attention <b>heads</b> running in parallel, and large learned weight matrices. Those parameters, learned during training, are what a model “knows”.</p>
        </Deeper>
        <Legend items={[
          { kind: 'established', text: 'Attention + feed-forward blocks, stacked, ending in next-token scores.' },
          { kind: 'simplified', text: 'Two layers drawn; arcs and values are schematic.' },
          { kind: 'varies', text: 'Depth, width and block details differ per model.' },
        ]} />
        <NextBar mode={mode} label="Attention" hint={SCENES[2].next} onNext={() => go(3)} onPrev={() => go(1)} />
      </div>

      <div className="visual">
        <div className="tfwrap" ref={wrap}>
          <svg key={run} className={`tf ${run > 0 ? 'running' : ''}`} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Layered Transformer diagram">
            <defs>
              <linearGradient id="gA" x1="0" x2="1"><stop offset="0" stopColor="#a07bff" stopOpacity=".05" /><stop offset=".5" stopColor="#a07bff" stopOpacity=".2" /><stop offset="1" stopColor="#a07bff" stopOpacity=".05" /></linearGradient>
              <linearGradient id="gF" x1="0" x2="1"><stop offset="0" stopColor="#5ce1ff" stopOpacity=".04" /><stop offset=".5" stopColor="#5ce1ff" stopOpacity=".15" /><stop offset="1" stopColor="#5ce1ff" stopOpacity=".04" /></linearGradient>
            </defs>

            {/* connectors between rows */}
            {ROWS.slice(0, -1).map((_, r) =>
              xs.map((x, c) => {
                const ya = y(r) + (ROWS[r].kind === 'attn' ? 22 : 24), yb = y(r + 1) - 24
                if (ROWS[r].kind === 'more' || ROWS[r + 1].kind === 'more') {
                  return <line key={`${r}-${c}`} className="conn dim" x1={x} y1={ya} x2={x} y2={yb} />
                }
                return <line key={`${r}-${c}`} className="conn flow" style={{ ['--i' as string]: r }} x1={x} y1={ya} x2={x} y2={yb} />
              }),
            )}

            {/* residual bypasses */}
            {[1, 2, 3, 4].map((r) => {
              const xl = x0 - 10
              return (
                <g key={`res${r}`} className="resid">
                  <path d={`M${xs[0] - cw / 2 - 4},${y(r - 1) + 30} C${xl - 28},${y(r - 1) + 40} ${xl - 28},${y(r) - 4} ${xl + 4},${y(r)}`} />
                  <circle cx={xl + 6} cy={y(r)} r="4.5" />
                  <path d={`M${xl + 3},${y(r)}h6M${xl + 6},${y(r) - 3}v6`} />
                </g>
              )
            })}

            {ROWS.map((row, r) => {
              const yy = y(r)
              const active = row.id === selRow
              const common = {
                className: `trow ${row.kind} ${active ? 'sel' : ''}`,
                style: { ['--i' as string]: r },
                tabIndex: 0,
                role: 'button',
                'aria-label': row.title,
                'aria-pressed': active,
                onClick: () => setSelRow(row.id),
                onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelRow(row.id) } },
              }
              return (
                <g key={row.id} {...common}>
                  <text className="rlabel" x={x0} y={yy - 28}>{row.label}</text>
                  <rect className="rhit" x={x0 - 8} y={yy - 38} width={x1 - x0 + 16} height={76} rx="10" />
                  {row.kind === 'attn' && (
                    <>
                      <rect className="band" x={x0} y={yy - 20} width={x1 - x0} height={44} rx="8" fill="url(#gA)" />
                      {arcs.map((a, k) => {
                        const mx = (xs[a.i] + xs[a.j]) / 2
                        const lift = Math.min(18, (a.j - a.i) * 6 + 5)
                        return (
                          <path
                            key={k}
                            className="arc"
                            style={{ ['--o' as string]: 0.14 + (a.k / 100) * 0.5, ['--i' as string]: r, ['--k' as string]: k % 6 }}
                            d={`M${xs[a.i]},${yy + 8} Q${mx},${yy + 8 - lift * 2} ${xs[a.j]},${yy + 8}`}
                          />
                        )
                      })}
                      {xs.map((x, c) => <circle key={c} className="anode" cx={x} cy={yy + 8} r="3" />)}
                    </>
                  )}
                  {row.kind === 'ffn' &&
                    xs.map((x, c) => (
                      <g key={c} className="ffn-g">
                        <rect x={x - cw / 2} y={yy - 18} width={cw} height={40} rx="7" fill="url(#gF)" className="fbox" />
                        {[0, 1, 2, 3].map((d) => (
                          <circle key={`m${d}`} cx={x} cy={yy - 12 + d * 7.5} r="2.2" className="fdot mid" style={{ transform: `translateX(0)` }} />
                        ))}
                        {[0, 1].map((d) => (
                          <circle key={`l${d}`} cx={x - cw / 2 + 9} cy={yy - 4 + d * 12} r="2.2" className="fdot" />
                        ))}
                        {[0, 1].map((d) => (
                          <circle key={`r${d}`} cx={x + cw / 2 - 9} cy={yy - 4 + d * 12} r="2.2" className="fdot" />
                        ))}
                        {[0, 1].flatMap((a) => [0, 1, 2, 3].map((b) => (
                          <line key={`a${a}${b}`} className="fline" x1={x - cw / 2 + 9} y1={yy - 4 + a * 12} x2={x} y2={yy - 12 + b * 7.5} />
                        )))}
                        {[0, 1].flatMap((a) => [0, 1, 2, 3].map((b) => (
                          <line key={`b${a}${b}`} className="fline" x1={x} y1={yy - 12 + b * 7.5} x2={x + cw / 2 - 9} y2={yy - 4 + a * 12} />
                        )))}
                      </g>
                    ))}
                  {(row.kind === 'input' || row.kind === 'final') &&
                    xs.map((x, c) => {
                      const last = row.kind === 'final' && c === n - 1
                      return (
                        <g key={c} className={`vcard ${last ? 'last' : ''}`}>
                          <rect x={x - cw / 2} y={yy - 18} width={cw} height={44} rx="7" className="vbox" />
                          {row.kind === 'input' && <text x={x} y={yy - 5} className="vtext" textAnchor="middle" fill={tokColor(c)}>{show[c].shown.length > 9 ? show[c].shown.slice(0, 8) + '…' : show[c].shown}</text>}
                          {vecs[c].slice(0, 6).map((v, d) => {
                            const vv = row.kind === 'final' ? Math.sin(v * 7 + c) * 0.9 : v
                            return <rect key={d} x={x - cw / 2 + 6 + d * ((cw - 12) / 6)} y={row.kind === 'input' ? yy + 3 : yy - 8} width={(cw - 12) / 6 - 2} height={row.kind === 'input' ? 14 : 24} rx="1.5" fill={divergeColor(vv)} />
                          })}
                        </g>
                      )
                    })}
                  {row.kind === 'more' && (
                    <g className="more-g">
                      {[-14, 0, 14].map((o) => (
                        <rect key={o} x={x0 + 20 + o * 0.6} y={yy - 12 + o * 0.5} width={x1 - x0 - 40} height={20} rx="7" className="ghostband" />
                      ))}
                      <text x={(x0 + x1) / 2} y={yy + 4} textAnchor="middle" className="more-t">attention + feed-forward, repeated × N</text>
                    </g>
                  )}
                  {row.kind === 'out' && (
                    <g className="out-g">
                      <path className="outlink" d={`M${xs[n - 1]},${yy - 62} V${yy - 20}`} />
                      <rect x={Math.max(x0, xs[n - 1] - 150)} y={yy - 16} width={Math.min(x1 - x0, 150 + cw / 2 + 14)} height={40} rx="9" className="outbox" />
                      <text x={Math.max(x0, xs[n - 1] - 150) + 14} y={yy + 8} className="out-t">next-token scores</text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
        <p className="foot-note">
          Showing the first {n} of {tokens.length} tokens. Arc strengths and vector values are schematic, not measured from a model.
        </p>
      </div>
    </div>
  )
}
