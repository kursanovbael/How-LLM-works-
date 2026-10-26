import { SCENES, type Mode } from '../types'

export default function Rail({ stage, mode, go }: { stage: number; mode: Mode; go: (n: number) => void }) {
  const pct = (stage / (SCENES.length - 1)) * 100
  return (
    <nav className={`rail ${mode}`} aria-label="Journey progress">
      <div className="rail-track">
        <div className="rail-fill" style={{ width: `${pct}%` }} />
        {SCENES.map((s, i) => (
          <button
            key={s.key}
            className={`rail-node ${i === stage ? 'now' : ''} ${i < stage ? 'done' : ''}`}
            style={{ left: `${(i / (SCENES.length - 1)) * 100}%` }}
            onClick={() => go(i)}
            aria-label={`Scene ${i + 1}: ${s.label}`}
            aria-current={i === stage ? 'step' : undefined}
          >
            <span className="rail-dot" />
            <span className="rail-label">
              <b>{String(i + 1).padStart(2, '0')}</b> {s.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
