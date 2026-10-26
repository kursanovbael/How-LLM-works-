// A small engine for the persistent neural-structure backdrop.
// It is a schematic: layers of nodes with feed-forward edges that the
// "camera" travels through as the visitor moves between scenes.

import { rng } from './text'

interface Cam { cx: number; zoom: number; yaw: number; pitch: number; hue: number; energy: number; dim: number }

const L = 9
const GAP = 150
const R = 250
const ZS = 170

const TARGETS: Record<number, Cam> = {
  [-1]: { cx: 0, zoom: 0.78, yaw: 0.42, pitch: -0.14, hue: 214, energy: 0.2, dim: 0.9 },
  0: { cx: -4 * GAP, zoom: 1.5, yaw: 0.3, pitch: -0.08, hue: 196, energy: 0.35, dim: 0.75 },
  1: { cx: -3 * GAP, zoom: 1.7, yaw: 0.5, pitch: 0.1, hue: 206, energy: 0.3, dim: 0.65 },
  2: { cx: 0, zoom: 1.0, yaw: 0.22, pitch: -0.05, hue: 226, energy: 0.65, dim: 0.5 },
  3: { cx: -0.6 * GAP, zoom: 1.65, yaw: 0.8, pitch: 0.06, hue: 262, energy: 0.4, dim: 0.5 },
  4: { cx: 4 * GAP, zoom: 1.5, yaw: -0.3, pitch: -0.06, hue: 246, energy: 0.45, dim: 0.65 },
  5: { cx: 0, zoom: 0.88, yaw: 0.3, pitch: -0.1, hue: 204, energy: 0.8, dim: 0.65 },
  6: { cx: 0, zoom: 0.66, yaw: 0.5, pitch: -0.18, hue: 30, energy: 0.08, dim: 0.4 },
}

interface Node { x: number; y: number; z: number; layer: number }
interface Edge { a: number; b: number }

export const bd = {
  stage: -1,
  reduced: false,
  dirty: true,
  listeners: new Set<() => void>(),
  setStage(n: number) {
    this.stage = n
    this.dirty = true
    this.wake()
  },
  surge() {
    surgePending = 1
    this.wake()
  },
  wake() {
    this.listeners.forEach((f) => f())
  },
}

let surgePending = 0

export function startBackdrop(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d', { alpha: false })!
  const r = rng(11)
  const nodes: Node[] = []
  const layerIdx: number[][] = []
  const counts = [9, 15, 20, 22, 22, 22, 20, 14, 8]
  for (let l = 0; l < L; l++) {
    layerIdx.push([])
    for (let i = 0; i < counts[l]; i++) {
      const ang = r() * Math.PI * 2
      const rad = Math.sqrt(r()) * R * (0.55 + 0.45 * Math.sin((l / (L - 1)) * Math.PI))
      layerIdx[l].push(nodes.length)
      nodes.push({ x: (l - (L - 1) / 2) * GAP + (r() - 0.5) * 30, y: Math.cos(ang) * rad, z: Math.sin(ang) * rad * (ZS / R), layer: l })
    }
  }
  const edges: Edge[] = []
  const outs: number[][] = nodes.map(() => [])
  for (let l = 0; l < L - 1; l++) {
    for (const a of layerIdx[l]) {
      const cand = layerIdx[l + 1]
        .map((b) => ({ b, d: (nodes[a].y - nodes[b].y) ** 2 + (nodes[a].z - nodes[b].z) ** 2 + r() * 9000 }))
        .sort((p, q) => p.d - q.d)
        .slice(0, 3)
      for (const c of cand) { outs[a].push(edges.length); edges.push({ a, b: c.b }) }
    }
  }

  const cam: Cam = { ...TARGETS[-1] }
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
  const pulses: { e: number; t: number; v: number }[] = []
  let W = 0, H = 0, dpr = 1, raf = 0, last = performance.now(), running = false

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = canvas.clientWidth; H = canvas.clientHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    bd.dirty = true
    wake()
  }

  const proj = new Float32Array(nodes.length * 3)
  const project = () => {
    const cy = Math.cos(cam.yaw + mouse.x * 0.12), sy = Math.sin(cam.yaw + mouse.x * 0.12)
    const cp = Math.cos(cam.pitch + mouse.y * 0.08), sp = Math.sin(cam.pitch + mouse.y * 0.08)
    const F = 900
    const base = Math.min(W / 1100, H / 700, 1.25) * 1.15
    const ox = W < 720 ? 0 : W * 0.04
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const x = n.x - cam.cx
      const x1 = x * cy + n.z * sy
      const z1 = -x * sy + n.z * cy
      const y1 = n.y * cp - z1 * sp
      const z2 = n.y * sp + z1 * cp
      const s = (cam.zoom * base * F) / (F + z2 + 260)
      proj[i * 3] = W / 2 + ox + x1 * s
      proj[i * 3 + 1] = H / 2 + y1 * s
      proj[i * 3 + 2] = s
    }
  }

  const frame = (now: number, animate: boolean) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const T = TARGETS[bd.stage] ?? TARGETS[-1]
    const k = bd.reduced ? 1 : 1 - Math.pow(0.035, dt)
    let moving = false
    for (const key of ['cx', 'zoom', 'yaw', 'pitch', 'hue', 'energy', 'dim'] as const) {
      const d = T[key] - cam[key]
      if (Math.abs(d) > 0.002 * (key === 'cx' ? 100 : 1)) moving = true
      cam[key] += d * k
    }
    mouse.x += (mouse.tx - mouse.x) * 0.04
    mouse.y += (mouse.ty - mouse.y) * 0.04

    if (animate && !bd.reduced) {
      if (surgePending) {
        surgePending = 0
        for (const a of layerIdx[0]) for (const e of outs[a].slice(0, 2)) pulses.push({ e, t: -Math.random() * 0.5, v: 0.03 + Math.random() * 0.02 })
      }
      if (pulses.length < 70 && Math.random() < cam.energy * 0.5) {
        const l = Math.floor(Math.random() * (L - 1))
        const a = layerIdx[l][Math.floor(Math.random() * layerIdx[l].length)]
        pulses.push({ e: outs[a][Math.floor(Math.random() * outs[a].length)], t: 0, v: 0.012 + Math.random() * 0.016 })
      }
    }

    project()
    ctx.fillStyle = '#03050b'
    ctx.fillRect(0, 0, W, H)
    const grad = ctx.createRadialGradient(W * 0.55, H * 0.5, 0, W * 0.55, H * 0.5, Math.max(W, H) * 0.7)
    grad.addColorStop(0, `hsla(${cam.hue},70%,14%,0.55)`)
    grad.addColorStop(1, 'rgba(3,5,11,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    const focusX = (n: Node) => {
      const d = (n.x - cam.cx) / (GAP * 2.4)
      return 0.28 + 0.72 * Math.exp(-d * d)
    }
    ctx.lineWidth = 1
    for (const e of edges) {
      const A = nodes[e.a], B = nodes[e.b]
      const f = (focusX(A) + focusX(B)) / 2
      const al = 0.1 * f * cam.dim
      if (al < 0.012) continue
      ctx.strokeStyle = `hsla(${cam.hue},80%,68%,${al})`
      ctx.beginPath()
      ctx.moveTo(proj[e.a * 3], proj[e.a * 3 + 1])
      ctx.lineTo(proj[e.b * 3], proj[e.b * 3 + 1])
      ctx.stroke()
    }

    ctx.globalCompositeOperation = 'lighter'
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]
      p.t += p.v * (0.6 + cam.energy) * dt * 60
      if (p.t >= 1) {
        const nx = outs[edges[p.e].b]
        if (nx.length && Math.random() < 0.9) { p.e = nx[Math.floor(Math.random() * nx.length)]; p.t = 0 } else pulses.splice(i, 1)
        continue
      }
      if (p.t < 0) continue
      const e = edges[p.e]
      const x = proj[e.a * 3] + (proj[e.b * 3] - proj[e.a * 3]) * p.t
      const y = proj[e.a * 3 + 1] + (proj[e.b * 3 + 1] - proj[e.a * 3 + 1]) * p.t
      const f = focusX(nodes[e.a])
      const tx = proj[e.a * 3] + (proj[e.b * 3] - proj[e.a * 3]) * Math.max(0, p.t - 0.18)
      const ty = proj[e.a * 3 + 1] + (proj[e.b * 3 + 1] - proj[e.a * 3 + 1]) * Math.max(0, p.t - 0.18)
      ctx.strokeStyle = `hsla(${cam.hue + 18},100%,75%,${0.55 * f})`
      ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke()
      ctx.fillStyle = `hsla(${cam.hue + 18},100%,82%,${0.9 * f})`
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill()
    }
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const f = focusX(n)
      const s = proj[i * 3 + 2]
      const rad = Math.max(1, 2.6 * s)
      ctx.fillStyle = `hsla(${cam.hue},90%,70%,${0.12 * f * cam.dim})`
      ctx.beginPath(); ctx.arc(proj[i * 3], proj[i * 3 + 1], rad * 3.2, 0, 6.283); ctx.fill()
      ctx.fillStyle = `hsla(${cam.hue},95%,78%,${0.75 * f * cam.dim + 0.1})`
      ctx.beginPath(); ctx.arc(proj[i * 3], proj[i * 3 + 1], rad, 0, 6.283); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    return moving
  }

  const loop = (now: number) => {
    if (document.hidden) { running = false; return }
    const moving = frame(now, true)
    if (bd.reduced && !moving) { running = false; return }
    raf = requestAnimationFrame(loop)
  }
  function wake() {
    if (running) return
    running = true
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }

  const onMove = (e: PointerEvent) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2
    if (bd.reduced) return
    wake()
  }
  const onVis = () => { if (!document.hidden) wake() }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  bd.listeners.add(wake)
  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('visibilitychange', onVis)
  resize()
  wake()
  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    bd.listeners.delete(wake)
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('visibilitychange', onVis)
  }
}
