import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

export function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Deprecated faux iOS status bar — kept as no-op so pages don't show native chrome. */
export function StatusBar(_props?: { dark?: boolean }) {
  return null
}

export function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={'shell' + (className ? ' ' + className : '')}>{children}</div>
}

export function TopBar({
  title,
  onBack,
  right,
  face = true,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
  face?: boolean
}) {
  const nav = useNavigate()
  return (
    <div className="topbar">
      <button className="tb-btn" onClick={onBack ?? (() => nav(-1))} aria-label="Back">
        &#8249;
      </button>
      <span className="tb-title">{title}</span>
      <span className="tb-spacer" />
      {right}
      {face && !right && <span className="tb-face">&#9786;</span>}
    </div>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return <button className={'toggle' + (on ? ' on' : '')} onClick={onChange} aria-pressed={on} />
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function Modal({
  title,
  body,
  cancelText = 'Cancel',
  okText = 'Confirm',
  onCancel,
  onOk,
}: {
  title?: string
  body: ReactNode
  cancelText?: string
  okText?: string
  onCancel: () => void
  onOk: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="m-body">
          {title && <div className="m-title">{title}</div>}
          {body}
        </div>
        <div className="m-foot">
          <button className="m-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="m-ok" onClick={onOk}>
            {okText}
          </button>
        </div>
      </div>
    </div>
  )
}
