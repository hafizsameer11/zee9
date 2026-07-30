import { DIFFICULTIES, VEHICLE_TRAFFIC_POOL, type DifficultyId, type VehicleKind } from '../constants/gameConfig'
import { api, getAccess } from '../../../api/client'
import { connectChickenRoadSocket } from '../../lib/chickenRoadSocket'
import type { GameSocket } from '../../lib/createGameSocket'

export type StartRoundInput = { betAmount: number; difficulty: DifficultyId }
export type StartRoundResult = {
  roundId: string
  multipliers: number[]
  laneCount: number
  seed: number
  betAmount: number
  difficulty: DifficultyId
  source: 'demo' | 'server'
}
export type StepRequest = { roundId: string; currentStep: number }
export type StepResult = {
  safe: boolean
  vehicleKind?: VehicleKind
  vehicleTiming?: number
  multiplier: number
  payout: number
  collided: boolean
  completed: boolean
  stepIndex: number
}
export type CashOutRequest = { roundId: string }
export type CashOutResult = { payout: number; multiplier: number; success: boolean }

let socket: GameSocket | null = null

function gameSocket() {
  if (!getAccess()) throw new Error('Not authenticated')
  socket ??= connectChickenRoadSocket()
  return socket
}

function transient(error: unknown) {
  return /connection closed|not connected|request timeout|websocket/i.test(
    error instanceof Error ? error.message : String(error),
  )
}

async function realtimeOrHttp<T>(
  action: string,
  payload: Record<string, unknown>,
  http: () => Promise<T>,
): Promise<T> {
  try {
    return await gameSocket().request<T>(action, payload)
  } catch (error) {
    if (!transient(error)) throw error
  }
  try {
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    return await gameSocket().request<T>(action, payload, 10_000)
  } catch {
    return http()
  }
}

function vehicle(): VehicleKind {
  return VEHICLE_TRAFFIC_POOL[Math.floor(Math.random() * VEHICLE_TRAFFIC_POOL.length)]!
}

export async function startRound(input: StartRoundInput): Promise<StartRoundResult> {
  const config = DIFFICULTIES[input.difficulty]
  const betAmount = Math.round(Number(input.betAmount) || 0)
  if (!config || betAmount <= 0) throw new Error('Invalid round')
  const data = await realtimeOrHttp<{ roundId: string; multipliers: number[]; laneCount: number }>(
    'start',
    { bet: betAmount, difficulty: input.difficulty },
    () => api.post('/games/chicken-road/start', { bet: betAmount, difficulty: input.difficulty }),
  )
  return { ...data, seed: 0, betAmount, difficulty: input.difficulty, source: 'server' }
}

export async function requestNextStep(input: StepRequest): Promise<StepResult> {
  const data = await realtimeOrHttp<Omit<StepResult, 'vehicleTiming'>>(
    'step',
    { roundId: input.roundId, currentStep: input.currentStep },
    () =>
      api.post(`/games/chicken-road/${input.roundId}/step`, {
        currentStep: input.currentStep,
      }),
  )
  return {
    ...data,
    vehicleKind: data.vehicleKind ?? vehicle(),
    vehicleTiming: 0.3 + Math.random() * 0.4,
  }
}

export function cashOut(input: CashOutRequest): Promise<CashOutResult> {
  return realtimeOrHttp(
    'cashout',
    { roundId: input.roundId },
    () => api.post(`/games/chicken-road/${input.roundId}/cashout`),
  )
}

export function clearDemoRounds() {}
export function forceSurvival(_roundId: string, _survival: boolean[]) {}
