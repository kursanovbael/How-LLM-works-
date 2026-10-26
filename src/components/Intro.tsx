import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { tokenize, tokColor, DEFAULT_PROMPT } from '../lib/text'
import { bd } from '../lib/backdrop'
import { prefersReduced, useTimers } from './ui'

type Phase = 'idle' | 'split' | 'fly'

interface Props {
  prompt: string
  setPrompt: (s: string) => void
  autoRun: number // increments to trigger an automatic run (replay)
  onDone: () => void
}

export default function Intro({ prompt, setPrompt, autoRun, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const t = useTimers()
  const chipsRef = useRef<HTMLDivElement>(null)
  const { tokens } = useMemo(() => tokenize(prompt), [prompt])
  const taRef = useRef<HTMLTextAreaElement>(null)

  const send = () => {
    if (phase !== 'idle') return
    if (!prompt.trim()) setPrompt(DEFAULT_PROMPT)
    if (prefersReduced()) { onDone(); return }
    setPhase('split')
    t.after(1100, () => {
      setPhase('fly')
      bd.surge()
    })
    t.after(2700, onDone)
  }

  useEffect(() => {
    if (autoRun > 0) send()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun])

  // auto-grow textarea
  useLayoutEffect(() => {
    const ta = taRef.current
    if (!ta) return
    const fit = () => {
      ta.style.height = '0px'
      ta.style.height = ta.scrollHeight + 'px'
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(ta.parentElement!)
    ro.observe(ta)
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [prompt, phase])

  // aim each chip at the middle of the viewport when flying
  useLayoutEffect(() => {
    if (phase !== 'fly' || !chipsRef.current) return
    const cx = window.innerWidth * 0.52, cy = window.innerHeight * 0.34
    chipsRef.current.querySelectorAll<HTMLElement>('.chip').forEach((el) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--dx', `${cx - (r.left + r.width / 2)}px`)
      el.style.setProperty('--dy', `${cy - (r.top + r.height / 2)}px`)
    })
  }, [phase])

  const busy = phase !== 'idle'

  return (
    <section className={`intro phase-${phase}`} aria-label="Prompt">
      <div className="intro-copy">
        <div className="kicker">An interactive model of a language model</div>
        <h1 className="title">
          Inside an <em>LLM</em>
        </h1>
        <p className="sub">Send a question in. Follow it through tokens, vectors, attention and prediction until words come out.</p>
      </div>

      <div className="prompt-wrap">
        <div className="prompt-label">
          <span className="live-dot" /> Prompt
        </div>
        <div className="prompt-box">
          {!busy ? (
            <textarea
              ref={taRef}
              className="prompt-input"
              value={prompt}
              rows={1}
              spellCheck={false}
              aria-label="Edit the prompt"
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
            />
          ) : (
            <div className="prompt-chips" ref={chipsRef} aria-hidden>
              {tokens.map((tk, i) => (
                <span
                  key={i}
                  className="chip"
                  style={{ ['--c' as string]: tokColor(i), ['--i' as string]: i, ['--n' as string]: tokens.length }}
                >
                  {tk.text.startsWith(' ') ? <><i className="sp" />{tk.text.slice(1)}</> : tk.text}
                </span>
              ))}
            </div>
          )}
          <button className="send" onClick={send} disabled={busy} aria-label="Send prompt">
            <span>SEND</span>
            <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden><path d="M0 6h16M11 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          </button>
        </div>
        <div className="prompt-foot">
          {phase === 'idle' && <span>Edit the sentence, or send it as it is. Enter also sends.</span>}
          {phase === 'split' && <span className="pulse-text">Splitting the text into tokens…</span>}
          {phase === 'fly' && <span className="pulse-text">Entering the model…</span>}
        </div>
      </div>
    </section>
  )
}
