import { useEffect, useState } from 'react'
import { PageHead, Pill, Toggle, Range, Modal, money, compact } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'
import type { GameRow } from '../data/mock'
import { api } from '../api/client'

const EMOJIS = ['💎', '✈️', '🎯', '🚀', '💣', '🐂', '🎲', '🃏', '🐉', '🎴', '⚡', '🎰', '🍀', '👑', '🔥', '⭐']

function profitTone(n: number) {
  if (n > 0) return { color: '#0f7a3a' }
  if (n < 0) return { color: '#c62828' }
  return { color: 'inherit' }
}

function winPctHint(category: string): string {
  switch (category) {
    case 'Slots':
      return 'RTP target — higher = more player returns · 100% = every spin pays at least 1× bet'
    case 'Mini':
      return '0% = harsh (forced mine/hazard) · 100% = no forced losses'
    case 'Crash':
      return 'Higher = fewer instant crashes · 100% = very player-friendly rounds'
    case 'Table':
    case 'Lottery':
      return 'Higher = outcomes favour players more · 100% = fairest odds'
    default:
      return 'Higher = more player wins over time · 100% = fairest odds'
  }
}

type LotteryLive = {
  enabled: boolean
  winPct: number
  period: string | null
  phase: string | null
  msLeft: number
  result: number | null
  forcedResult: number | null
  pendingForce: boolean
  betCount: number
  wagered: number
}

type CrashLive = {
  enabled: boolean
  winPct: number
  roundId: string | null
  phase: string | null
  multiplier: number
  waitingMsLeft: number
  crashPoint: number | null
  forcedCrashPoint: number | null
  pendingForce: boolean
  betCount: number
}

function LotteryOps({ showToast }: { showToast: (m: string) => void }) {
  const [live, setLive] = useState<LotteryLive | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      const data = await api.get('/admin/games/wingo-lottery/live')
      setLive(data)
    } catch {
      /* game may not be seeded yet */
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1000)
    return () => window.clearInterval(id)
  }, [])

  const force = async (result: number) => {
    setBusy(true)
    try {
      const data = await api.post('/admin/games/wingo-lottery/force', { result })
      showToast(`Forced ${result} (${data.applied} round)`)
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Force failed')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await api.post('/admin/games/wingo-lottery/force/clear')
      showToast('Force cleared')
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  const secs = live ? Math.ceil((live.msLeft || 0) / 1000) : 0

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="flex gap16" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div className="cell-main" style={{ fontSize: 16 }}>WinGo Lottery ops</div>
          <div className="cell-sub">
            {live?.period ? `Period ${live.period}` : 'No live round'} · phase{' '}
            <b>{live?.phase ?? '—'}</b> · {secs}s left · bets {live?.betCount ?? 0} · wagered{' '}
            {money(live?.wagered ?? 0)}
          </div>
          {live?.pendingForce && (
            <div className="cell-sub" style={{ color: '#c62828', marginTop: 4 }}>
              Forced next result: <b>{live.forcedResult}</b>
            </div>
          )}
          {live?.result != null && live.phase === 'reveal' && (
            <div className="cell-sub" style={{ marginTop: 4 }}>
              Last draw: <b>{live.result}</b>
            </div>
          )}
        </div>
        <button className="btn btn-outline" disabled={busy} onClick={() => void clear()}>
          Clear force
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 12 }}>
        {Array.from({ length: 10 }, (_, n) => (
          <button
            key={n}
            className={'chip' + (live?.forcedResult === n ? ' on' : '')}
            disabled={busy}
            onClick={() => void force(n)}
            style={{ minWidth: 40, fontWeight: 700 }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function RouletteOps({ showToast }: { showToast: (m: string) => void }) {
  const [live, setLive] = useState<LotteryLive | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setLive(await api.get('/admin/games/roulette/live'))
    } catch {
      /* not seeded */
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1000)
    return () => window.clearInterval(id)
  }, [])

  const force = async (result: number) => {
    setBusy(true)
    try {
      const data = await api.post('/admin/games/roulette/force', { result })
      showToast(`Roulette forced ${result} (${data.applied})`)
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Force failed')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await api.post('/admin/games/roulette/force/clear')
      showToast('Roulette force cleared')
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  const secs = live ? Math.ceil((live.msLeft || 0) / 1000) : 0
  const presets = [0, 1, 7, 14, 21, 28, 32, 36]

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="flex gap16" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div className="cell-main" style={{ fontSize: 16 }}>Roulette ops</div>
          <div className="cell-sub">
            {live?.period ? `Period ${live.period}` : 'No live round'} · phase{' '}
            <b>{live?.phase ?? '—'}</b> · {secs}s · bets {live?.betCount ?? 0} · wagered{' '}
            {money(live?.wagered ?? 0)}
          </div>
          {live?.pendingForce && (
            <div className="cell-sub" style={{ color: '#c62828', marginTop: 4 }}>
              Forced next: <b>{live.forcedResult}</b>
            </div>
          )}
          {live?.result != null && live.phase === 'reveal' && (
            <div className="cell-sub" style={{ marginTop: 4 }}>
              Last: <b>{live.result}</b>
            </div>
          )}
        </div>
        <button className="btn btn-outline" disabled={busy} onClick={() => void clear()}>
          Clear force
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 12 }}>
        {presets.map((n) => (
          <button
            key={n}
            className={'chip' + (live?.forcedResult === n ? ' on' : '')}
            disabled={busy}
            onClick={() => void force(n)}
            style={{ minWidth: 40, fontWeight: 700 }}
          >
            {n}
          </button>
        ))}
        <input
          type="number"
          min={0}
          max={36}
          placeholder="0-36"
          disabled={busy}
          style={{ width: 72, padding: '6px 8px', borderRadius: 8, border: '1px solid #ddd' }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            const v = Number((e.target as HTMLInputElement).value)
            if (Number.isInteger(v) && v >= 0 && v <= 36) void force(v)
          }}
        />
      </div>
    </div>
  )
}

function WingoOps({ showToast }: { showToast: (m: string) => void }) {
  const [mode, setMode] = useState<'30s' | '1min' | '3min' | '5min'>('30s')
  const [live, setLive] = useState<(LotteryLive & { mode?: string }) | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setLive(await api.get(`/admin/games/wingo/live?mode=${mode}`))
    } catch {
      /* not seeded */
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1000)
    return () => window.clearInterval(id)
  }, [mode])

  const force = async (result: number) => {
    setBusy(true)
    try {
      const data = await api.post('/admin/games/wingo/force', { result, mode })
      showToast(`WinGo ${mode} forced ${result} (${data.applied})`)
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Force failed')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await api.post('/admin/games/wingo/force/clear', { mode })
      showToast('WinGo force cleared')
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  const secs = live ? Math.ceil((live.msLeft || 0) / 1000) : 0

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="flex gap16" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div className="cell-main" style={{ fontSize: 16 }}>WinGo ops</div>
          <div className="cell-sub">
            Mode{' '}
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} style={{ marginRight: 8 }}>
              {(['30s', '1min', '3min', '5min'] as const).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {live?.period ? `Period ${live.period}` : 'No live round'} · <b>{live?.phase ?? '—'}</b> · {secs}s · bets{' '}
            {live?.betCount ?? 0}
          </div>
          {live?.pendingForce && (
            <div className="cell-sub" style={{ color: '#c62828', marginTop: 4 }}>
              Forced next: <b>{live.forcedResult}</b>
            </div>
          )}
        </div>
        <button className="btn btn-outline" disabled={busy} onClick={() => void clear()}>
          Clear force
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 12 }}>
        {Array.from({ length: 10 }, (_, n) => (
          <button
            key={n}
            className={'chip' + (live?.forcedResult === n ? ' on' : '')}
            disabled={busy}
            onClick={() => void force(n)}
            style={{ minWidth: 40, fontWeight: 700 }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

const CRASH_PRESETS = [1.0, 1.2, 1.5, 2, 3, 5, 10, 20, 50]

function CrashOpsPanel({
  slug,
  title,
  showToast,
}: {
  slug: string
  title: string
  showToast: (m: string) => void
}) {
  const [live, setLive] = useState<CrashLive | null>(null)
  const [busy, setBusy] = useState(false)
  const [custom, setCustom] = useState('2.00')

  const refresh = async () => {
    try {
      setLive(await api.get(`/admin/games/${slug}/live`))
    } catch {
      /* not seeded */
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1000)
    return () => window.clearInterval(id)
  }, [slug])

  const force = async (crashPoint: number) => {
    setBusy(true)
    try {
      const data = await api.post(`/admin/games/${slug}/force`, { mult: crashPoint })
      showToast(`${title} forced ${crashPoint}x (${data.applied})`)
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Force failed')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await api.post(`/admin/games/${slug}/force/clear`)
      showToast(`${title} force cleared`)
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  const waitSecs = live ? Math.ceil((live.waitingMsLeft || 0) / 1000) : 0

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="flex gap16" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div className="cell-main" style={{ fontSize: 16 }}>{title} ops</div>
          <div className="cell-sub">
            Phase <b>{live?.phase ?? '—'}</b>
            {live?.phase === 'waiting' ? ` · ${waitSecs}s` : ''}
            {live?.phase === 'flying' ? ` · ${live.multiplier?.toFixed(2)}x` : ''}
            {live?.phase === 'crashed' && live.crashPoint != null ? ` · crashed @ ${live.crashPoint}x` : ''}
            {' · '}bets {live?.betCount ?? 0}
          </div>
          {live?.pendingForce && (
            <div className="cell-sub" style={{ color: '#c62828', marginTop: 4 }}>
              Forced next crash: <b>{live.forcedCrashPoint}x</b>
            </div>
          )}
        </div>
        <button className="btn btn-outline" disabled={busy} onClick={() => void clear()}>
          Clear force
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 12, alignItems: 'center' }}>
        {CRASH_PRESETS.map((n) => (
          <button
            key={n}
            className={'chip' + (live?.forcedCrashPoint === n ? ' on' : '')}
            disabled={busy}
            onClick={() => void force(n)}
            style={{ minWidth: 48, fontWeight: 700 }}
          >
            {n}x
          </button>
        ))}
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          disabled={busy}
          style={{ width: 72, padding: '6px 8px', borderRadius: 8, border: '1px solid #ddd' }}
          placeholder="2.50"
        />
        <button
          className="btn btn-light"
          disabled={busy}
          onClick={() => {
            const v = Number(custom)
            if (Number.isFinite(v) && v >= 1 && v <= 100) void force(Math.floor(v * 100) / 100)
            else showToast('Enter 1–100')
          }}
        >
          Force
        </button>
      </div>
    </div>
  )
}

function SevenUpOps({ showToast }: { showToast: (m: string) => void }) {
  const [live, setLive] = useState<{
    period: string | null
    phase: string | null
    msLeft: number
    sum: number | null
    forcedSum: number | null
    pendingForce: boolean
    betCount: number
    wagered: number
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setLive(await api.get('/admin/games/7up-down/live'))
    } catch {
      /* not seeded */
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1000)
    return () => window.clearInterval(id)
  }, [])

  const force = async (sum: number) => {
    setBusy(true)
    try {
      const data = await api.post('/admin/games/7up-down/force', { sum })
      showToast(`7 Up Down forced sum ${sum} (${data.applied})`)
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Force failed')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await api.post('/admin/games/7up-down/force/clear')
      showToast('7 Up Down force cleared')
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="flex gap16" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div className="cell-main" style={{ fontSize: 16 }}>7 Up Down ops</div>
          <div className="cell-sub">
            {live?.period ? `Period ${live.period}` : 'No live round'} · phase <b>{live?.phase ?? '—'}</b> ·{' '}
            {Math.ceil((live?.msLeft ?? 0) / 1000)}s · bets {live?.betCount ?? 0}
          </div>
          {live?.pendingForce && (
            <div className="cell-sub" style={{ color: '#c62828', marginTop: 4 }}>
              Forced next sum: <b>{live.forcedSum}</b>
            </div>
          )}
        </div>
        <button className="btn btn-outline" disabled={busy} onClick={() => void clear()}>
          Clear force
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 12 }}>
        {Array.from({ length: 11 }, (_, i) => i + 2).map((sum) => (
          <button
            key={sum}
            className={'chip' + (live?.forcedSum === sum ? ' on' : '')}
            disabled={busy}
            onClick={() => void force(sum)}
          >
            {sum}
          </button>
        ))}
      </div>
    </div>
  )
}

function DragonTigerOps({ showToast }: { showToast: (m: string) => void }) {
  const [live, setLive] = useState<{
    period: string | null
    phase: string | null
    msLeft: number
    winner: string | null
    forcedWinner: string | null
    pendingForce: boolean
    betCount: number
    wagered: number
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setLive(await api.get('/admin/games/dragon-tiger/live'))
    } catch {
      /* not seeded */
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1000)
    return () => window.clearInterval(id)
  }, [])

  const force = async (winner: 'dragon' | 'tiger' | 'tie') => {
    setBusy(true)
    try {
      const data = await api.post('/admin/games/dragon-tiger/force', { winner })
      showToast(`Dragon Tiger forced ${winner} (${data.applied})`)
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Force failed')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await api.post('/admin/games/dragon-tiger/force/clear')
      showToast('Dragon Tiger force cleared')
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="flex gap16" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div className="cell-main" style={{ fontSize: 16 }}>Dragon Tiger ops</div>
          <div className="cell-sub">
            {live?.period ? `Period ${live.period}` : 'No live round'} · phase <b>{live?.phase ?? '—'}</b> ·{' '}
            {Math.ceil((live?.msLeft ?? 0) / 1000)}s
          </div>
          {live?.pendingForce && (
            <div className="cell-sub" style={{ color: '#c62828', marginTop: 4 }}>
              Forced winner: <b>{live.forcedWinner}</b>
            </div>
          )}
        </div>
        <button className="btn btn-outline" disabled={busy} onClick={() => void clear()}>
          Clear force
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 12 }}>
        {(['dragon', 'tiger', 'tie'] as const).map((w) => (
          <button
            key={w}
            className={'chip' + (live?.forcedWinner === w ? ' on' : '')}
            disabled={busy}
            onClick={() => void force(w)}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  )
}

function CarRouletteOps({ showToast }: { showToast: (m: string) => void }) {
  const brands = ['zephyra', 'kavaro', 'nordheim', 'ashlyne', 'taurion', 'regalis', 'scudera', 'vornik']
  const [live, setLive] = useState<{
    period: string | null
    phase: string | null
    msLeft: number
    resultBrand: string | null
    forcedBrand: string | null
    pendingForce: boolean
    betCount: number
    wagered: number
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setLive(await api.get('/admin/games/car-roulette/live'))
    } catch {
      /* not seeded */
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1000)
    return () => window.clearInterval(id)
  }, [])

  const force = async (brand: string) => {
    setBusy(true)
    try {
      const data = await api.post('/admin/games/car-roulette/force', { brand })
      showToast(`Car Roulette forced ${brand} (${data.applied})`)
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Force failed')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await api.post('/admin/games/car-roulette/force/clear')
      showToast('Car Roulette force cleared')
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="flex gap16" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div className="cell-main" style={{ fontSize: 16 }}>Car Roulette ops</div>
          <div className="cell-sub">
            {live?.period ? `Period ${live.period}` : 'No live round'} · phase <b>{live?.phase ?? '—'}</b> ·{' '}
            {Math.ceil((live?.msLeft ?? 0) / 1000)}s · wagered {money(live?.wagered ?? 0)}
          </div>
          {live?.pendingForce && (
            <div className="cell-sub" style={{ color: '#c62828', marginTop: 4 }}>
              Forced next: <b>{live.forcedBrand}</b>
            </div>
          )}
        </div>
        <button className="btn btn-outline" disabled={busy} onClick={() => void clear()}>
          Clear force
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        {brands.map((b) => (
          <button
            key={b}
            className={'chip' + (live?.forcedBrand === b ? ' on' : '')}
            disabled={busy}
            onClick={() => void force(b)}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  )
}

function ZooRouletteOps({ showToast }: { showToast: (m: string) => void }) {
  const animals = ['monkey', 'rabbit', 'lion', 'panda', 'swallow', 'pigeon', 'peacock', 'eagle', 'shark', 'golden_frog']
  const [live, setLive] = useState<{
    period: string | null
    phase: string | null
    msLeft: number
    resultAnimal: string | null
    forcedAnimal: string | null
    pendingForce: boolean
    betCount: number
    wagered: number
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setLive(await api.get('/admin/games/zoo-roulette/live'))
    } catch {
      /* not seeded */
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1000)
    return () => window.clearInterval(id)
  }, [])

  const force = async (animal: string) => {
    setBusy(true)
    try {
      const data = await api.post('/admin/games/zoo-roulette/force', { animal })
      showToast(`Zoo Roulette forced ${animal} (${data.applied})`)
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Force failed')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await api.post('/admin/games/zoo-roulette/force/clear')
      showToast('Zoo Roulette force cleared')
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="flex gap16" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div className="cell-main" style={{ fontSize: 16 }}>Zoo Roulette ops</div>
          <div className="cell-sub">
            {live?.period ? `Period ${live.period}` : 'No live round'} · phase <b>{live?.phase ?? '—'}</b> ·{' '}
            {Math.ceil((live?.msLeft ?? 0) / 1000)}s · wagered {money(live?.wagered ?? 0)}
          </div>
          {live?.pendingForce && (
            <div className="cell-sub" style={{ color: '#c62828', marginTop: 4 }}>
              Forced next: <b>{live.forcedAnimal}</b>
            </div>
          )}
        </div>
        <button className="btn btn-outline" disabled={busy} onClick={() => void clear()}>
          Clear force
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        {animals.map((a) => (
          <button
            key={a}
            className={'chip' + (live?.forcedAnimal === a ? ' on' : '')}
            disabled={busy}
            onClick={() => void force(a)}
          >
            {a.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Games() {
  const { games, updateGame, addGame, showToast } = useAdmin()
  const [edit, setEdit] = useState<GameRow | null>(null)
  const sorted = [...games].sort((a, b) => a.order - b.order)
  const live = games.filter((g) => g.enabled).length
  const has = (slug: string) => games.some((g) => g.slug === slug)

  const totals = games.reduce(
    (acc, g) => {
      acc.plays += g.plays
      acc.wagered += g.wagered
      acc.won += g.playerWonAmount
      acc.lost += g.playerLostAmount
      acc.profit += g.houseProfit
      return acc
    },
    { plays: 0, wagered: 0, won: 0, lost: 0, profit: 0 },
  )

  return (
    <>
      <PageHead
        title="Games"
        subtitle={`${live} of ${games.length} games live · win % 0–100 · live plays / P&L from real rounds`}
        actions={<button className="btn btn-primary" onClick={addGame}>{Icons.plus} Add game</button>}
      />

      {has('wingo-lottery') && <LotteryOps showToast={showToast} />}
      {has('roulette') && <RouletteOps showToast={showToast} />}
      {has('wingo') && <WingoOps showToast={showToast} />}
      {has('aviator') && <CrashOpsPanel slug="aviator" title="Aviator" showToast={showToast} />}
      {has('crash') && <CrashOpsPanel slug="crash" title="Crash" showToast={showToast} />}
      {has('aero-x') && <CrashOpsPanel slug="aero-x" title="AeroX" showToast={showToast} />}
      {has('double-crash') && <CrashOpsPanel slug="double-crash" title="Double Crash" showToast={showToast} />}
      {has('car-roulette') && <CarRouletteOps showToast={showToast} />}
      {has('zoo-roulette') && <ZooRouletteOps showToast={showToast} />}
      {has('dragon-tiger') && <DragonTigerOps showToast={showToast} />}
      {has('7up-down') && <SevenUpOps showToast={showToast} />}

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <div className="stat-label">Total plays</div>
          <div className="stat-val">{compact(totals.plays)}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Total wagered</div>
          <div className="stat-val">{money(totals.wagered)}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Player wins (paid)</div>
          <div className="stat-val" style={{ color: '#c62828' }}>{money(totals.won)}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Player losses</div>
          <div className="stat-val" style={{ color: '#0f7a3a' }}>{money(totals.lost)}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">House profit / loss</div>
          <div className="stat-val" style={profitTone(totals.profit)}>{money(totals.profit)}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Game</th>
                <th>Category</th>
                <th style={{ width: 220 }} title="Target RTP (return-to-player). 100% = players break even on average; slots may still have losing spins unless set to 100%.">Win / RTP %</th>
                <th className="t-right">Plays</th>
                <th className="t-right">Wagered</th>
                <th className="t-right">User wins</th>
                <th className="t-right">User losses</th>
                <th className="t-right">House P/L</th>
                <th>Status</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div className="cell-media">
                      <span className="gtile" style={{ background: g.color + '22', color: g.color }}>
                        {g.emoji}
                      </span>
                      <div>
                        <div className="cell-main flex gap8">
                          {g.title}
                          {g.tag && <span className={'tag ' + g.tag}>{g.tag.toUpperCase()}</span>}
                        </div>
                        <div className="cell-sub">#{g.id} · {g.slug || g.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Pill tone="grey">{g.category}</Pill>
                  </td>
                  <td>
                    <Range value={g.winPct} min={0} max={100} onChange={(v) => updateGame(g.id, { winPct: v })} />
                  </td>
                  <td className="t-right num">{compact(g.plays)}</td>
                  <td className="t-right num">{money(g.wagered)}</td>
                  <td className="t-right num">
                    <div className="cell-main">{compact(g.playerWins)}</div>
                    <div className="cell-sub" style={{ color: '#c62828' }}>{money(g.playerWonAmount)}</div>
                  </td>
                  <td className="t-right num">
                    <div className="cell-main">{compact(g.playerLosses)}</div>
                    <div className="cell-sub" style={{ color: '#0f7a3a' }}>{money(g.playerLostAmount)}</div>
                  </td>
                  <td className="t-right num cell-main" style={profitTone(g.houseProfit)}>
                    {money(g.houseProfit)}
                  </td>
                  <td>
                    {g.enabled ? <Pill tone="green">Live</Pill> : <Pill tone="grey">Off</Pill>}
                  </td>
                  <td className="t-right">
                    <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                      <Toggle on={g.enabled} onChange={() => updateGame(g.id, { enabled: !g.enabled })} />
                      <button className="btn btn-light btn-icon" onClick={() => setEdit(g)}>
                        {Icons.edit}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <Modal
          title="Edit game"
          onClose={() => setEdit(null)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEdit(null)
                  showToast('Game updated')
                }}
              >
                Save changes
              </button>
            </>
          }
        >
          <div className="flex gap16" style={{ marginBottom: 20 }}>
            <span className="gtile" style={{ width: 64, height: 64, fontSize: 34, background: edit.color + '22', color: edit.color }}>
              {edit.emoji}
            </span>
            <div style={{ flex: 1 }}>
              <div className="fld">
                <label>Title</label>
                <input value={edit.title} onChange={(e) => { updateGame(edit.id, { title: e.target.value }); setEdit({ ...edit, title: e.target.value }) }} />
              </div>
            </div>
          </div>

          <div className="fld" style={{ marginBottom: 16 }}>
            <label>Icon</label>
            <div className="chip-row">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className={'chip' + (edit.emoji === e ? ' on' : '')}
                  style={{ fontSize: 18 }}
                  onClick={() => { updateGame(edit.id, { emoji: e }); setEdit({ ...edit, emoji: e }) }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="fld">
              <label>Category</label>
              <select value={edit.category} onChange={(e) => { updateGame(edit.id, { category: e.target.value as GameRow['category'] }); setEdit({ ...edit, category: e.target.value as GameRow['category'] }) }}>
                {['Slots', 'Crash', 'Lottery', 'Table', 'Mini'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="fld">
              <label>Badge</label>
              <select value={edit.tag ?? ''} onChange={(e) => { const t = (e.target.value || undefined) as GameRow['tag']; updateGame(edit.id, { tag: t }); setEdit({ ...edit, tag: t }) }}>
                <option value="">None</option>
                <option value="hot">Hot</option>
                <option value="new">New</option>
              </select>
            </div>
          </div>

          <div className="fld">
            <label>Win / RTP % <span className="hint">— {winPctHint(edit.category)}</span></label>
            <Range value={edit.winPct} min={0} max={100} onChange={(v) => { updateGame(edit.id, { winPct: v }); setEdit({ ...edit, winPct: v }) }} />
          </div>

          <div className="form-grid mt16" style={{ fontSize: 13 }}>
            <div><b>Plays</b><div>{edit.plays}</div></div>
            <div><b>Wagered</b><div>{money(edit.wagered)}</div></div>
            <div><b>User wins</b><div>{edit.playerWins} · {money(edit.playerWonAmount)}</div></div>
            <div><b>User losses</b><div>{edit.playerLosses} · {money(edit.playerLostAmount)}</div></div>
            <div><b>House P/L</b><div style={profitTone(edit.houseProfit)}>{money(edit.houseProfit)}</div></div>
          </div>

          <div className="field-row mt16">
            <div className="fr-info">
              <b>Game enabled</b>
              <span>Show this game in the lobby</span>
            </div>
            <div className="fr-control">
              <Toggle on={edit.enabled} onChange={() => { updateGame(edit.id, { enabled: !edit.enabled }); setEdit({ ...edit, enabled: !edit.enabled }) }} />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
