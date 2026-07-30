import type { ReactNode } from 'react'

export function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="shell">{children}</div>
}

export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <div className="topbar">
      <button className="tb-btn" onClick={onBack} aria-label="Back" type="button">
        &#8249;
      </button>
      <span className="tb-title">{title}</span>
      <span className="tb-spacer" />
      {right ?? <span className="tb-face">&#9786;</span>}
    </div>
  )
}
