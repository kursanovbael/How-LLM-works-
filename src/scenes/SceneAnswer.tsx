import { useEffect, useMemo, useState } from 'react'
import { tokenId } from '../lib/text'
import type { SceneProps } from '../types'
import { SCENES } from '../types'
import { Deeper, Hint, Legend, NextBar, SceneHead, Tag, prefersReduced } from '../components/ui'

const RESP = [' An', ' LL', 'M', ' turns', ' your', ' question', ' into', ' tokens', ',', ' turns', ' them', ' into', ' vectors', ',', ' mixes', ' in', ' context', ' with', ' attention', ',', ' and', ' predicts', ' the', ' next', ' token', ' again', ' and', ' again', ' until', ' a', ' reply', ' appears', '.']

const STAGES = ['Prompt', 'Tokens', 'Embeddings', 'Transformer layers', 'Next-token prediction', 'Response']

function Glyph({ i }: { i: number }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 40 28" width="40" height="28" aria-hidden>
      {i === 0 && <><path {...s} d="M4 6h32M4 12h26M4 18h30M4 24h14" /></>}
      {i === 1 && <><rect {...s} x="3" y="9" width="9" height="10" rx="2" /><rect {...s} x="15" y="9" width="12" height="10" rx="2" /><rect {...s} x="30" y="9" width="7" height="10" rx="2" /></>}
      {i === 2 && <>{[6, -3, 8, -7, 4, -5].map((v, k) => <rect key={k} x={5 + k * 5.6} y={v > 0 ? 14 - v : 14} width="3.6" height={Math.abs(v)} rx="1" fill="currentColor" opacity=".8" />)}</>}
      {i === 3 && <><rect {...s} x="4" y="4" width="32" height="5" rx="2" /><rect {...s} x="4" y="12" width="32" height="5" rx="2" /><rect {...s} x="4" y="20" width="32" height="5" rx="2" /></>}
      {i === 4 && <>{[18, 8, 13, 5].map((h, k) => <rect key={k} x={6 + k * 8} y={25 - h} width="5" height={h} rx="1.5" fill="currentColor" opacity={k === 0 ? 1 : 0.45} />)}</>}
      {i === 5 && <><path {...s} d="M4 9h24M4 16h32M4 23h18" /><path {...s} d="M26 23h6" strokeWidth="2.4" /></>}
    </svg>
  )
}

export default function SceneAnswer({ tokens, mode, go }: SceneProps) {
  const reduced = prefersReduced()
  const [n, setN] = useState(reduced ? RESP.length : 0)
  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(mode === 'guided' && !reduced)
  const [fast, setFast] = useState(false)
  const [pick, setPick] = useState<number | null>(null)

  const seq = (k: number) => (k === 0 ? [0, 1, 2, 3, 4, 5] : [3, 4, 5])
  const done = n >= RESP.length
  const lit = playing && !done ? seq(n)[tick] : -1

  useEffect(() => {
    if (!playing || done) return
    const base = n < 2 ? 620 : 150
    const id = window.setTimeout(() => {
      if (tick + 1 < seq(n).length) setTick(tick + 1)
      else { setN(n + 1); setTick(0); if (n + 1 >= RESP.length) setPlaying(false) }
    }, fast ? base / 3 : base)
    return () => clearTimeout(id)
  }, [playing, n, tick, fast, done])

  const restart = () => { setN(0); setTick(0); setPick(null); setPlaying(true) }
  const toggle = () => { if (done) restart(); else setPlaying(!playing) }

  const gen = useMemo(() => RESP.slice(0, n), [n])
  const sel = pick !== null && pick < n ? pick : null

  return (
    <div className="scene s-answer">
      <div className="copy">
        <SceneHead n={6} label="The answer emerges" question="How does the final answer appear?">
          Everything so far, in a loop. Each new token is added to the context, the layers run again, and the next token is chosen. The reply is that sequence of tokens, shown as readable text.
        </SceneHead>
        <div className="row-btns">
          <button className="btn primary small" onClick={toggle}>{done ? '↺ Replay sequence' : playing ? 'Ⅱ Pause' : n === 0 ? '▶ Play sequence' : '▶ Resume'}</button>
          <button className="btn ghost small" onClick={restart}>Restart</button>
          <button className={`btn small ${fast ? 'on' : 'ghost'}`} onClick={() => setFast(!fast)} aria-pressed={fast}>Fast ×3</button>
        </div>
        <Hint>Click a generated token to inspect it.</Hint>

        <div className="detail" aria-live="polite">
          {sel === null ? (
            <p>The answer is not stored anywhere ready-made. It is built one token at a time, and every token depends on the ones before it.</p>
          ) : (
            <>
              <div className="detail-top"><span className="detail-name mono">{RESP[sel].replace(/^ /, '▁')}</span><Tag kind="illustrative">demo id {tokenId(RESP[sel])}</Tag></div>
              <p>Step {sel + 1}. The model read the prompt plus {sel} generated token{sel === 1 ? '' : 's'} ({tokens.length + sel} in total), scored its candidates for what comes next, and this token was selected.</p>
            </>
          )}
        </div>

        <div className="note-box">
          <Tag kind="illustrative" />
          <p>This reply is a <b>scripted demonstration</b>, not the output of a real model. A real model’s wording would vary with the model, the prompt and the sampling settings.</p>
        </div>

        <Deeper mode={mode}>
          <p>In practice, models cache intermediate results (the “KV cache”) so earlier tokens are not fully recomputed at each step. The conceptual loop is the same: predict, append, repeat, until an end-of-response token is produced or a length limit is reached.</p>
        </Deeper>
        <Legend items={[
          { kind: 'established', text: 'Generation is autoregressive: output tokens are fed back as context.' },
          { kind: 'simplified', text: 'One loop drawn as six stages; many details are folded together.' },
          { kind: 'illustrative', text: 'The reply text and token IDs are scripted.' },
        ]} />
        <NextBar mode={mode} label="Limitations" hint={SCENES[5].next} onNext={() => go(6)} onPrev={() => go(4)} />
      </div>

      <div className="visual">
        <div className="strip" role="list">
          {STAGES.map((s, i) => (
            <div key={s} role="listitem" className={`snode ${lit === i ? 'lit' : ''} ${lit > i || (lit === -1 && n > 0) ? 'seen' : ''}`}>
              <div className="sglyph"><Glyph i={i} /></div>
              <div className="sname">{s}</div>
              <div className="sub">
                {i === 0 && `${tokens.length} tokens in`}
                {i === 1 && 'text → pieces'}
                {i === 2 && 'pieces → vectors'}
                {i === 3 && 'context mixed in'}
                {i === 4 && 'scores → choice'}
                {i === 5 && `${n} token${n === 1 ? '' : 's'} out`}
              </div>
              {i < STAGES.length - 1 && <span className="sline" aria-hidden />}
            </div>
          ))}
          <div className={`loop ${n > 0 ? 'on' : ''} ${lit >= 3 && n > 0 ? 'lit' : ''}`} aria-hidden>
            <span>new token is appended to the context, then the loop repeats</span>
          </div>
        </div>

        <div className="ctx">
          <div className="cap">Context window · {tokens.length + n} tokens</div>
          <div className="ctx-bar" aria-hidden>
            {tokens.map((_, i) => <i key={`p${i}`} className="p" />)}
            {gen.map((_, i) => <i key={`g${i}`} className={`g ${i === sel ? 'sel' : ''}`} />)}
          </div>
          <div className="ctx-key"><span><i className="p" />prompt</span><span><i className="g" />generated</span></div>
        </div>

        <div className="resp">
          <div className="cap">Generated tokens</div>
          <div className="resp-chips">
            {gen.map((tk, i) => (
              <button key={i} className={`chip mini resp-chip ${i === sel ? 'on' : ''} ${i === n - 1 && playing ? 'fresh' : ''}`} onClick={() => setPick(i === pick ? null : i)} aria-pressed={i === sel}>
                {tk.startsWith(' ') ? <><i className="sp" />{tk.slice(1)}</> : tk}
              </button>
            ))}
            {!done && <span className="cursor" aria-hidden />}
          </div>
          <div className="cap second">As readable text</div>
          <p className="resp-text">
            {gen.join('') || <span className="faint">Press play to watch the reply appear…</span>}
            {!done && n > 0 && <span className="cursor" aria-hidden />}
          </p>
        </div>
      </div>
    </div>
  )
}
