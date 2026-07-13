import type { ReactNode } from 'react'
import { Icons } from './icons'

export function money(n: number, currency = 'Rs '): string {
  return currency + n.toLocaleString('en-IN')
}
export function compact(n: number): string {
  if (n >= 1e7) return (n / 1e7).toFixed(2) + 'Cr'
  if (n >= 1e5) return (n / 1e5).toFixed(2) + 'L'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return <button className={'sw' + (on ? ' on' : '')} onClick={onChange} aria-pressed={on} />
}

export function StatCard({
  icon,
  tone,
  value,
  label,
  trend,
}: {
  icon: keyof typeof Icons
  tone: 'violet' | 'gold' | 'green' | 'blue' | 'red'
  value: string
  label: string
  trend?: { dir: 'up' | 'down'; val: string }
}) {
  return (
    <div className="card card-pad stat">
      <div className="stat-top">
        <div className={'stat-ico ' + tone}>{Icons[icon]}</div>
        {trend && (
          <span className={'trend ' + trend.dir}>
            {trend.dir === 'up' ? Icons.up : Icons.down}
            {trend.val}
          </span>
        )}
      </div>
      <div>
        <div className="stat-val">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={'pill ' + tone}>{children}</span>
}

export function Range({
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix = '%',
  onChange,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="range">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="rv">
        {value}
        {suffix}
      </span>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  foot,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  foot?: ReactNode
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  )
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  )
}

const AVATAR_COLORS = ['#6d5efc', '#17b877', '#f5a623', '#3b9df0', '#ef4a44', '#9b59b6', '#e67e22']
export function Avatar({ name }: { name: string }) {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length
  return (
    <span className="uava" style={{ background: AVATAR_COLORS[i] }}>
      {name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()}
    </span>
  )
}

export function Wallets({ filled, total }: { filled: number; total: number }) {
  return (
    <span className="wallets" title={`${filled}/${total} wallets`}>
      {Array.from({ length: total }).map((_, i) => (
        <i key={i} className={i < filled ? 'f' : ''} />
      ))}
    </span>
  )
}
