import type { ComponentType } from 'react'

export type GameComponentProps = {
  gameId: string
  bet: number
  onMessage?: (msg: string | null) => void
}

export type GameEntry = {
  component: ComponentType<GameComponentProps>
  title: string
  engine: string
}

export type BetPanelProps = {
  bet: number
  setBet: (v: number) => void
  onConfirm?: () => void
  confirmLabel?: string
  disabled?: boolean
}
