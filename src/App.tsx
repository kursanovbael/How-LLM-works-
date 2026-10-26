import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { bd, startBackdrop } from './lib/backdrop'
import { DEFAULT_PROMPT, tokenize } from './lib/text'
import { SCENES, type Mode, type SceneProps } from './types'
import { prefersReduced } from './components/ui'
import Intro from './components/Intro'
import Rail from './components/Rail'
import SceneInput from './scenes/SceneInput'
import SceneEmbeddings from './scenes/SceneEmbeddings'
import SceneTransformer from './scenes/SceneTransformer'
import SceneAttention from './scenes/SceneAttention'
import ScenePrediction from './scenes/ScenePrediction'
import SceneAnswer from './scenes/SceneAnswer'
import SceneLimits from './scenes/SceneLimits'

const VIEWS = [SceneInput, SceneEmbeddings, SceneTransformer, SceneAttention, ScenePrediction, SceneAnswer, SceneLimits]

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [stage, setStage] = useState(-1)
  const [leaving, setLeaving] = useState(false)
  const [mode, setMode] = useState<Mode>('guided')
  const [sel, setSel] = useState(0)
  const [autoRun, setAutoRun] = useState(0)
  const stageRef = useRef(stage)
  stageRef.current = stage
  const { tokens } = useMemo(() => tokenize(prompt), [prompt])

  useEffect(() => {
    bd.reduced = prefersReduced()
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => { bd.reduced = mq.matches; bd.wake() }
    mq.addEventListener('change', f)
    const stop = startBackdrop(canvasRef.current!)
    return () => { mq.removeEventListener('change', f); stop() }
  }, [])

  const swap = useCallback((n: number) => {
    setStage(n)
    setLeaving(false)
    bd.setStage(n)
    if (n >= 0) bd.surge()
  }, [])

  const go = useCallback((n: number) => {
    const to = Math.max(-1, Math.min(SCENES.length - 1, n))
    if (to === stageRef.current) return
    if (prefersReduced()) return swap(to)
    setLeaving(true)
    window.setTimeout(() => swap(to), 380)
  }, [swap])

  const enter = useCallback(() => {
    setSel(0)
    swap(0)
  }, [swap])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      if (stageRef.current < 0) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(stageRef.current + 1)
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(stageRef.current - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const replay = () => {
    setLeaving(false)
    setStage(-1)
    bd.setStage(-1)
    window.setTimeout(() => setAutoRun((n) => n + 1), 700)
  }
  const editPrompt = () => { setStage(-1); bd.setStage(-1); setLeaving(false) }

  const View = stage >= 0 ? VIEWS[stage] : null
  const props: SceneProps = { tokens, sel: Math.min(sel, tokens.length - 1), setSel, mode, go, stage }

  return (
    <div className={`app ${stage < 0 ? 'is-intro' : ''}`}>
      <canvas ref={canvasRef} className="backdrop" aria-hidden />
      <div className="vignette" aria-hidden />

      <header className="bar">
        <button className="brand" onClick={editPrompt} aria-label="Inside an LLM — back to the prompt">
          <span className="brand-mark" aria-hidden />
          <span>Inside an LLM</span>
        </button>
        {stage >= 0 && (
          <div className="bar-tools">
            <div className="seg" role="group" aria-label="Experience mode">
              <button className={mode === 'guided' ? 'on' : ''} onClick={() => setMode('guided')} title="Narrated path with a clear next step">Guided</button>
              <button className={mode === 'explore' ? 'on' : ''} onClick={() => setMode('explore')} title="Free exploration with details unfolded">Explore</button>
            </div>
            <button className="btn ghost small" onClick={editPrompt}>Edit prompt</button>
            <button className="btn ghost small" onClick={replay}>↺ Replay entry</button>
          </div>
        )}
      </header>

      {stage < 0 && <Intro prompt={prompt} setPrompt={setPrompt} autoRun={autoRun} onDone={enter} />}

      {View && (
        <main className={`stage ${leaving ? 'leaving' : 'entering'}`} key={stage}>
          <View {...props} />
        </main>
      )}

      {stage >= 0 && <Rail stage={stage} mode={mode} go={go} />}
    </div>
  )
}
