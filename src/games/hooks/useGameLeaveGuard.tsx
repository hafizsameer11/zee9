import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import LeaveConfirmModal from '../components/LeaveConfirmModal'

export type GameLeaveGuardOptions = {
  /** Whether the player has an active bet that would be lost on leave. */
  hasActiveBet: boolean
  stakeAmount?: number
  canCashOut?: boolean
  cashOutAmount?: number
  onCashOut?: () => void | Promise<void>
  /** Lobby route — defaults to `/home`. */
  lobbyPath?: string
}

export function useGameLeaveGuard(navigate: NavigateFunction, options: GameLeaveGuardOptions) {
  const [open, setOpen] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const goLobby = useCallback(() => {
    setOpen(false)
    navigate(optionsRef.current.lobbyPath ?? '/home')
  }, [navigate])

  const requestLeave = useCallback(() => {
    if (optionsRef.current.hasActiveBet) {
      setOpen(true)
      return
    }
    goLobby()
  }, [goLobby])

  const onCashOutAndLeave = useCallback(async () => {
    const { onCashOut } = optionsRef.current
    if (onCashOut) await onCashOut()
    goLobby()
  }, [goLobby])

  const LeaveModal: ReactNode = (
    <LeaveConfirmModal
      open={open}
      stakeAmount={options.stakeAmount}
      canCashOut={options.canCashOut}
      cashOutAmount={options.cashOutAmount}
      onStay={() => setOpen(false)}
      onCashOutAndLeave={options.onCashOut ? onCashOutAndLeave : undefined}
      onLeaveAnyway={goLobby}
    />
  )

  return { requestLeave, goLobby, LeaveModal }
}
