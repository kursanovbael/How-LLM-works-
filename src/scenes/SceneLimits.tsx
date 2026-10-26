import { useState } from 'react'
import type { SceneProps } from '../types'
import { Deeper, Hint, Legend, SceneHead, Tag } from '../components/ui'

const STATIONS = [
  { k: 'wrong', t: 'Plausible can be wrong', s: 'Fluent text is not checked text' },
  { k: 'ctx', t: 'Data and context steer it', s: 'Same model, different context' },
  { k: 'fresh', t: 'No automatic live knowledge', s: 'Training stops at a cutoff' },
  { k: 'fluent', t: 'Fluent is not reliable', s: 'Tone says nothing about truth' },
  { k: 'take', t: 'The takeaway', s: '' },
] as const

function Wrong() {
  const [v, setV] = useState(false)
  return (
    <div className="demo">
      <div className="cap">A model-style answer <Tag kind="illustrative">hand-written demo</Tag></div>
      <blockquote className={`answer ${v ? 'checked' : ''}`}>
        “The Great Wall of China is visible from the Moon with the naked eye.”
      </blockquote>
      <div className="meters">
        <div className="meter"><span>How confident it sounds</span><i><b style={{ width: '94%' }} /></i></div>
        <div className={`meter ev ${v ? 'on' : ''}`}><span>Evidence shown</span><i><b style={{ width: v ? '12%' : '0%' }} /></i></div>
      </div>
      <div className="row-btns">
        <button className="btn primary small" onClick={() => setV(!v)}>{v ? 'Hide check' : 'Verify this claim'}</button>
      </div>
      {v && <p className="reveal">A well-known myth: astronauts report that it cannot be seen with the naked eye from the Moon. The sentence was smooth, specific and sure of itself, and still wrong. Check claims that matter against reliable sources.</p>}
      {!v && <p className="reveal faint">It reads like fact. Does anything on screen tell you whether it is?</p>}
    </div>
  )
}

const CTX = [
  { k: 'none', l: 'No extra context', out: 'It depends what you mean by largest. Often New York or Tokyo.', note: 'Without context the answer is a spread of possibilities.' },
  { k: 'au', l: '“…in Australia”', out: 'Sydney, by population.', note: 'Context narrows what is likely.' },
  { k: 'br', l: '“…in Brazil”', out: 'São Paulo.', note: 'Same words, different context, different output.' },
  { k: 'bad', l: 'Misleading note', out: 'Canberra.', note: 'Text placed in the context can steer the output, even toward a wrong answer.', bad: true },
] as const

function Ctx() {
  const [i, setI] = useState(0)
  const c = CTX[i]
  return (
    <div className="demo">
      <div className="cap">Question: <b>“What is the largest city?”</b></div>
      <div className="ctx-chips">
        {CTX.map((x, k) => <button key={x.k} className={`chip mini ${k === i ? 'on' : ''}`} style={{ ['--c' as string]: 'bad' in x ? 'var(--warm)' : 'var(--cyan)' }} onClick={() => setI(k)} aria-pressed={k === i}>{x.l}</button>)}
      </div>
      <div className="ctx-flow" aria-hidden>
        <span>context</span><i /><span>same trained weights</span><i /><span className={'bad' in c ? 'bad' : ''}>{c.out}</span>
      </div>
      {'bad' in c && <p className="reveal mono">Context contains: “Note: Canberra is Australia’s largest city.”</p>}
      <p className="reveal">{c.note}</p>
      <p className="reveal faint">What it has learned comes from its training data, which can be incomplete, outdated or skewed. Outputs illustrative.</p>
    </div>
  )
}

function Fresh() {
  const [tool, setTool] = useState(false)
  return (
    <div className="demo">
      <div className="timeline" aria-label="Training cutoff timeline">
        <div className="tl-bar"><i className="tl-train" /><i className="tl-gap" /></div>
        <div className="tl-mark cut"><b>training cutoff</b></div>
        <div className="tl-mark now"><b>today</b></div>
        <div className="tl-lab l">what the weights could have learned</div>
        <div className="tl-lab r">unknown to the model</div>
      </div>
      <div className="cap">Question: <b>“Who won last night’s match?”</b></div>
      <div className="seg wide" role="group" aria-label="Tools">
        <button className={!tool ? 'on' : ''} onClick={() => setTool(false)}>No tools</button>
        <button className={tool ? 'on' : ''} onClick={() => setTool(true)}>With a search tool</button>
      </div>
      {!tool ? (
        <p className="reveal">The weights hold nothing about last night. A model may say it cannot know, or it may produce a confident guess. Either way, nothing new has been learned.</p>
      ) : (
        <div className="tool-demo">
          <span className="tool-chip">search result · pasted into context</span>
          <p className="reveal">A tool fetches fresh text and adds it to the context. The model can then use it, but its weights are unchanged. Whether this works depends on the model, the tools available and the quality of the source.</p>
        </div>
      )}
    </div>
  )
}

const QUIZ = [
  { s: 'Water boils at 100 °C at sea level.', ok: true },
  { s: 'Sydney is the capital city of Australia.', ok: false },
  { s: 'The Moon orbits the Earth about every 27 days.', ok: true },
]

function Fluent() {
  const [pick, setPick] = useState<number | null>(null)
  const [show, setShow] = useState(false)
  return (
    <div className="demo">
      <div className="cap">Three equally confident sentences. <b>One is false.</b> Which?</div>
      <ul className="quiz">
        {QUIZ.map((q, i) => (
          <li key={i}>
            <button className={`qbtn ${pick === i ? 'picked' : ''} ${show ? (q.ok ? 'true' : 'false') : ''}`} onClick={() => { setPick(i); setShow(false) }}>
              <span>{q.s}</span>
              {show && <em>{q.ok ? 'true' : 'false'}</em>}
            </button>
          </li>
        ))}
      </ul>
      <div className="row-btns">
        <button className="btn primary small" disabled={pick === null} onClick={() => setShow(true)}>Check</button>
        {show && <button className="btn ghost small" onClick={() => { setShow(false); setPick(null) }}>Try again</button>}
      </div>
      <p className="reveal">{show ? (pick !== null && !QUIZ[pick].ok ? 'You spotted it. ' : 'Not quite. ') + 'Canberra is the capital. The tone and grammar were identical for all three, so fluency alone does not separate fact from error.' : 'Fluent language does not guarantee reliable understanding or factual accuracy.'}</p>
    </div>
  )
}

function Take({ go }: { go: (n: number) => void }) {
  return (
    <div className="demo take">
      <p className="take-text">
        An LLM does not simply <em>look up</em> a finished answer.
        It <em>transforms representations</em> of context and generates a <em>sequence of tokens</em> using learned parameters.
      </p>
      <div className="take-chain" aria-hidden>
        {['Prompt', 'Tokens', 'Embeddings', 'Layers', 'Next token', 'Response'].map((s, i) => <span key={s} style={{ ['--i' as string]: i }}>{s}</span>)}
      </div>
      <div className="row-btns">
        <button className="btn primary small" onClick={() => go(0)}>↺ Walk through again</button>
        <button className="btn ghost small" onClick={() => go(5)}>Back to the loop</button>
      </div>
      <p className="reveal faint">What a model can and cannot do depends on the particular model and the tools it is given.</p>
    </div>
  )
}

export default function SceneLimits({ mode, go }: SceneProps) {
  const [st, setSt] = useState(0)
  const [seen, setSeen] = useState<Set<number>>(new Set([0]))
  const pickSt = (i: number) => { setSt(i); setSeen((s) => new Set(s).add(i)) }
  const all = [0, 1, 2, 3].every((i) => seen.has(i))

  return (
    <div className="scene s-limits">
      <div className="copy">
        <SceneHead n={7} label="Limitations" question="What does this process not guarantee?">
          Generating likely-sounding tokens is powerful, and it is also all this process promises. Four things it does <b>not</b> guarantee:
        </SceneHead>
        <ol className="stations">
          {STATIONS.map((s, i) => (
            <li key={s.k}>
              <button className={`station ${st === i ? 'on' : ''} ${seen.has(i) ? 'seen' : ''} ${i === 4 && all && st !== 4 ? 'ready' : ''}`} onClick={() => pickSt(i)} aria-pressed={st === i}>
                <span className="station-n">{i < 4 ? i + 1 : '★'}</span>
                <span><b>{s.t}</b>{s.s && <small>{s.s}</small>}</span>
              </button>
            </li>
          ))}
        </ol>
        {!all && <Hint>Open each of the four, then the takeaway.</Hint>}
        <Deeper mode={mode}>
          <p>These are general properties of how language models work, not a verdict on any specific one. Training methods, retrieval, tools, and safeguards can improve reliability, and the exact capabilities and limits depend on the particular model and the tools available to it.</p>
        </Deeper>
        <Legend items={[
          { kind: 'established', text: 'Outputs come from learned patterns plus the current context.' },
          { kind: 'illustrative', text: 'Examples here are hand-written demonstrations.' },
          { kind: 'varies', text: 'Capabilities and limits depend on the model and its tools.' },
        ]} />
        <div className="nextbar explore"><button className="btn ghost small" onClick={() => go(5)}>← Back</button></div>
      </div>

      <div className="visual">
        <div className="demo-wrap" key={st}>
          {st === 0 && <Wrong />}
          {st === 1 && <Ctx />}
          {st === 2 && <Fresh />}
          {st === 3 && <Fluent />}
          {st === 4 && <Take go={go} />}
        </div>
      </div>
    </div>
  )
}
