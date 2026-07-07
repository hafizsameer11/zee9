import type { ReactNode, RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Diamond,
  History,
  MessageCircle,
  Send,
  Settings,
  Trophy,
  Wallet,
} from 'lucide-react'
import { useWallet } from '../../context/WalletContext'
import { getDesignCanvasStyle, type DesignLayout } from '../hooks/useDesignScale'
import './zee9Premium.tw.css'

const LIVE_WINS = [
  { name: 'Ahmed_K', amount: 12500, game: 'CRASH' },
  { name: 'Sana92', amount: 4200, game: 'Fortune Ox' },
  { name: 'Bilal.R', amount: 8000, game: 'MINES' },
]

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export type Zee9PremiumFrameProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  rootClassName: string
  canvasClassName: string
  title: string
  subtitle?: string
  accent?: 'gold' | 'blue' | 'green' | 'red'
  children: ReactNode
  footerExtra?: ReactNode
}

export default function Zee9PremiumFrame({
  viewportRef,
  layout,
  rootClassName,
  canvasClassName,
  title,
  subtitle,
  accent = 'gold',
  children,
  footerExtra,
}: Zee9PremiumFrameProps) {
  const navigate = useNavigate()
  const { balance } = useWallet()

  const accentGrad =
    accent === 'blue'
      ? 'from-[#5ea0f2] to-[#1565c0]'
      : accent === 'green'
        ? 'from-[#1bd6a0] to-[#0d8f6a]'
        : accent === 'red'
          ? 'from-[#ff6467] to-[#c41e3a]'
          : 'from-[#f4d98a] via-[#d4af37] to-[#c41e3a]'

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div
        className={canvasClassName}
        style={getDesignCanvasStyle(layout)}
      >
        <div className="game-ui bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.04_40),oklch(0.145_0.01_40))] flex flex-col w-full h-full overflow-hidden text-neutral-50">
          <header className="shrink-0 bg-[#0a0603]/80 backdrop-blur-md border-white/10 border-b border-solid flex px-8 justify-between items-center h-16">
            <button type="button" className="flex items-center gap-2 border-0 bg-transparent p-0 cursor-pointer" onClick={() => navigate('/home')}>
              <div className="size-9 bg-gradient-to-br from-[#f4d98a] to-[#d4af37] rotate-45 shadow-[0_0_16px_rgba(212,175,55,0.5)] rounded-lg flex justify-center items-center">
                <Diamond className="size-4 -rotate-45 text-[#0a0603]" />
              </div>
              <span className="bg-gradient-to-r from-[#f4d98a] to-[#d4af37] bg-clip-text text-transparent font-extrabold text-xl tracking-tight">
                Zee9
              </span>
            </button>
            <div className="flex items-center gap-3 shrink-0">
              <div className="shadow-[0_0_14px_rgba(212,175,55,0.35)] rounded-full bg-[#0a0603]/70 border-[#d4af37]/50 border border-solid flex px-4 py-2 items-center gap-2">
                <Wallet className="size-4 text-[#f4d98a]" />
                <span className="font-bold text-[#f4d98a] text-sm">PKR {formatPkr(balance)}</span>
              </div>
              <button type="button" className="size-9 rounded-full bg-neutral-800 text-[#a1a1a1] border-white/10 border border-solid flex justify-center items-center">
                <History className="size-4" />
              </button>
              <button type="button" className="size-9 rounded-full bg-neutral-800 text-[#a1a1a1] border-white/10 border border-solid flex justify-center items-center">
                <Settings className="size-4" />
              </button>
            </div>
          </header>

          <div className="shrink-0 px-8 pt-5 pb-2 flex justify-between items-end">
            <div>
              <h1 className={`bg-gradient-to-r ${accentGrad} bg-clip-text text-transparent font-black text-4xl leading-tight tracking-tight`}>
                {title}
              </h1>
              {subtitle && <p className="text-[#a1a1a1] text-sm mt-1">{subtitle}</p>}
            </div>
          </div>

          <div className="game-main min-h-0 flex-1 px-6 pb-4 overflow-y-auto">{children}</div>

          <footer className="game-footer shrink-0 bg-[#0a0603]/80 border-white/10 border-t border-solid flex px-8 justify-between items-center h-14">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="shrink-0 flex items-center gap-2">
                <Trophy className="size-4 text-[#1bd6a0]" />
                <span className="font-bold text-[#1bd6a0] text-xs">LIVE WINS</span>
              </div>
              <div className="text-[#a1a1a1] text-xs flex items-center gap-3 overflow-hidden whitespace-nowrap">
                {LIVE_WINS.map((w, i) => (
                  <span key={w.name}>
                    {i > 0 && ' · '}
                    <span className="font-semibold text-neutral-50">{w.name}</span> won{' '}
                    <span className="font-bold text-[#1bd6a0]">PKR {formatPkr(w.amount)}</span> on {w.game}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {footerExtra}
              <div className="rounded-full bg-neutral-800 border-white/10 border border-solid flex px-3 items-center gap-2 h-9 w-72">
                <MessageCircle className="size-4 text-[#a1a1a1]" />
                <input className="bg-transparent outline-none text-xs flex-1 text-neutral-50" placeholder="Type a message..." readOnly />
                <Send className="size-4 text-[#d4af37]" />
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
