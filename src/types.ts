import type { Tok } from './lib/text'

export type Mode = 'guided' | 'explore'

export interface SceneProps {
  tokens: Tok[]
  sel: number
  setSel: (i: number) => void
  mode: Mode
  go: (n: number) => void
  stage: number
}

export const SCENES = [
  { key: 'input', label: 'Input', next: 'Tokens become the model’s alphabet.' },
  { key: 'embeddings', label: 'Embeddings', next: 'Vectors enter the layered machine.' },
  { key: 'transformer', label: 'Transformer', next: 'Zoom into how tokens share information.' },
  { key: 'attention', label: 'Attention', next: 'Now see how a choice gets made.' },
  { key: 'prediction', label: 'Next token', next: 'Repeat the loop until text appears.' },
  { key: 'answer', label: 'Answer', next: 'Finally: what this does not guarantee.' },
  { key: 'limits', label: 'Limits', next: '' },
] as const
