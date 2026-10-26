import { useEffect, useMemo, useRef, useState } from 'react'
import type { SceneProps } from '../types'
import { SCENES } from '../types'
import { Deeper, Hint, Legend, NextBar, SceneHead, Tag, prefersReduced, useTimers } from '../components/ui'

type Cand = [string, number] // token text (with leading space when needed), illustrative logit

const END = '<end>'
const TABLE: Record<string, Cand[]> = {
  the: [[' east', 3.2], [' morning', 2.8], [' sky', 2.0], [' world', 0.9], [' west', 0.4]],
  east: [['.', 3.5], [',', 2.6], [' and', 1.6], [' every', 0.8], [' as', 0.4]],
  morning: [['.', 3.2], [',', 2.7], [' and', 1.8], [' when', 0.9], [' light', 0.5]],
  sky: [['.', 3.0], [',', 2.4], [' and', 1.9], [' at', 0.7], [' above', 0.5]],
  world: [['.', 2.8], [',', 2.2], [' and', 1.5], [' of', 1.0], [' today', 0.6]],
  west: [['.', 2.5], [',', 2.0], [' and', 1.2], [' too', 0.5], [' never', 0.2]],
  '.': [[END, 3.0], [' The', 2.2], [' It', 1.6], [' Then', 0.9], [' Every', 0.5]],
  ',': [[' and', 2.6], [' casting', 1.7], [' painting', 1.4], [' while', 1.1], [' bringing', 0.5]],
  and: [[' sets', 2.1], [' the', 1.8], [' light', 1.4], [' warms', 1.1], [' ends', 0.4]],
}
const FALLBACK: Cand[] = [['.', 2.6], [',', 2.0], [' and', 1.5], [' the', 1.0], [END, 0.8]]

const BASE = ['The', ' sun', ' rises', ' in', ' the']
const MAX_NEW = 10

const softmax = (c: Cand[], T: number) => {
  const m = Math.max(...c.map((x) => x[1] / T))
  const e = c.map((x) => Math.exp(x[1] / T - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / s)
}

type Phase = 'idle' | 'scoring' | 'choosing' | 'joining'

export default function ScenePrediction({ mode, go }: SceneProps) {
  const [gen, setGen] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [temp, setTemp] = useState(1)
  const [greedy, setGreedy] = useState(false)
  const [pick, setPick] = useState<number | null>(null)
  const [flash, setFlash] = useState<number | null>(null)
  const [lastJoin, setLastJoin] = useState(-1)
  const t = useTimers()
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearInterval(timer.current), [])

  const last = (gen[gen.length - 1] ?? 'the').trim().toLowerCase()
  const ended = gen[gen.length - 1] === END
  const full = gen.length >= MAX_NEW
  const cands = TABLE[last] ?? FALLBACK
  const probs = useMemo(() => softmax(cands, temp), [cands, temp])
  const done = ended || full
  const showBars = phase === 'scoring' || phase === 'choosing' || phase === 'joining'

  const generate = () => {
    if (phase !== 'idle' || done) return
    let idx = 0
    if (greedy) idx = probs.indexOf(Math.max(...probs))
    else {
      const r = Math.random()
      let acc = 0
      idx = probs.length - 1
      for (let i = 0; i < probs.length; i++) { acc += probs[i]; if (r <= acc) { idx = i; break } }
    }
    const quick = prefersReduced()
    setPick(null)
    setPhase('scoring')
    t.after(quick ? 0 : 900, () => {
      setPhase('choosing')
      let step = 0
      const total = cands.length * 2 + idx + 1
      window.clearInterval(timer.current)
      if (quick) { setFlash(null); setPick(idx); return finish(idx) }
      timer.current = window.setInterval(() => {
        setFlash(step % cands.length)
        step++
        if (step >= total) {
          window.clearInterval(timer.current)
          setFlash(null)
          setPick(idx)
          t.after(500, () => finish(idx))
        }
      }, 85)
    })
    function finish(i: number) {
      setPhase('joining')
      const tok = cands[i][0]
      t.after(quick ? 0 : 650, () => {
        setGen((g) => [...g, tok])
        setLastJoin(gen.length)
        setPhase('idle')
        setPick(null)
      })
    }
  }

  const reset = () => { t.clear(); window.clearInterval(timer.current); setGen([]); setPhase('idle'); setPick(null); setFlash(null); setLastJoin(-1) }

  const shownText = (x: string) => (x === END ? '⟨end of response⟩' : x.replace(/^ /, '▁'))

  return (
    <div className="scene s-pred">
      <div className="copy">
        <SceneHead n={5} label="Next-token prediction" question="How does the model choose what comes next?">
          The model does not write a whole answer at once. It scores every possible next token, picks one, adds it to the text, and does it again.
        </SceneHead>
        <Hint>Press <b>Generate next token</b> a few times.</Hint>

        <div className="controls">
          <button className="btn primary generate" onClick={done ? reset : generate} disabled={phase !== 'idle'}>
            {done ? '↺ Start over' : phase === 'idle' ? 'GENERATE NEXT TOKEN' : phase === 'scoring' ? 'Scoring candidates…' : phase === 'choosing' ? 'Choosing…' : 'Adding to the text…'}
          </button>
          <div className="ctrl">
            <label htmlFor="temp"><span>Temperature</span><b>{temp.toFixed(1)}</b></label>
            <input id="temp" type="range" min="0.2" max="2" step="0.1" value={temp} onChange={(e) => setTemp(+e.target.value)} />
            <div className="ctrl-scale"><span>sharper</span><span>flatter</span></div>
          </div>
          <div className="seg wide" role="group" aria-label="Decoding strategy">
            <button className={!greedy ? 'on' : ''} onClick={() => setGreedy(false)}>Sample</button>
            <button className={greedy ? 'on' : ''} onClick={() => setGreedy(true)}>Greedy · top pick</button>
          </div>
          {gen.length > 0 && !done && <button className="btn ghost small" onClick={reset}>Reset</button>}
        </div>

        <div className="note-box">
          <Tag kind="illustrative" />
          <p>Candidates and scores are <b>invented for this demo</b>. A real model scores its whole vocabulary (tens of thousands of tokens), and outputs depend on the model, the context, the decoding strategy and the sampling settings.</p>
        </div>

        <Deeper mode={mode}>
          <p>Scores before normalisation are called <b>logits</b>. <b>Softmax</b> turns them into probabilities that sum to 1. Dividing logits by a temperature first makes the distribution sharper (low) or flatter (high). Greedy decoding always takes the top token; sampling draws randomly in proportion to probability. Real systems also use methods such as top-k or top-p.</p>
          <p>Generating one token at a time, each conditioned on everything so far, is called <b>autoregressive</b> generation.</p>
        </Deeper>
        <Legend items={[
          { kind: 'established', text: 'LLMs typically generate text by repeatedly predicting the next token from the current context.' },
          { kind: 'simplified', text: 'Five candidates per step, tiny hand-written tables.' },
          { kind: 'varies', text: 'Decoding strategy and settings change what is chosen.' },
        ]} />
        <NextBar mode={mode} label="The answer emerges" hint={SCENES[4].next} onNext={() => go(5)} onPrev={() => go(3)} />
      </div>

      <div className="visual">
        <div className="sentence" aria-live="polite">
          <div className="cap">Context so far</div>
          <p>
            {BASE.map((b, i) => <span key={i} className="stok base">{b}</span>)}
            {gen.map((g, i) => (
              <span key={i} className={`stok new ${i === lastJoin ? 'join' : ''} ${g === END ? 'end' : ''}`}>{g === END ? '■' : g}</span>
            ))}
            {!done && <span className="cursor" aria-hidden />}
          </p>
        </div>

        <div className="flowline" aria-hidden>
          {['Context', 'Transformer', 'Scores', 'Softmax', 'Choose'].map((s, i) => (
            <span key={s} className={`fl ${phase !== 'idle' && ((phase === 'scoring' && i < 4) || phase === 'choosing' || phase === 'joining') ? 'on' : ''} ${(phase === 'choosing' || phase === 'joining') && i === 4 ? 'now' : ''}`} style={{ ['--i' as string]: i }}>{s}</span>
          ))}
        </div>

        <div className="cand-stage">
          <div className="cap">
            Candidates for the next token <Tag kind="illustrative">illustrative</Tag>
          </div>
          <ul className="cands">
            {cands.map(([tk, logit], i) => (
              <li key={tk + gen.length} className={`cand ${showBars ? 'show' : ''} ${pick === i ? 'win' : ''} ${flash === i ? 'flash' : ''} ${pick !== null && pick !== i ? 'lose' : ''} ${phase === 'joining' && pick === i ? 'rise' : ''}`} style={{ ['--i' as string]: i }}>
                <span className="cand-tok">{shownText(tk)}</span>
                <span className="cand-bar"><i style={{ width: showBars ? `${probs[i] * 100}%` : '0%' }} /></span>
                <span className="cand-p">{showBars ? `${(probs[i] * 100).toFixed(0)}%` : '—'}</span>
                <span className="cand-logit">logit {logit.toFixed(1)}</span>
              </li>
            ))}
          </ul>
          <p className="cand-foot">
            {done
              ? ended ? 'The model produced an end-of-response token, so generation stops.' : 'Demo length limit reached. Start over to try other paths.'
              : phase === 'idle' ? 'Waiting: press Generate to score these candidates.' : phase === 'scoring' ? 'Scores are computed, then turned into probabilities.' : phase === 'choosing' ? (greedy ? 'Greedy: take the highest probability.' : 'Sampling: a random draw weighted by probability.') : 'The chosen token joins the context. The loop repeats with a longer context.'}
          </p>
        </div>
      </div>
    </div>
  )
}
