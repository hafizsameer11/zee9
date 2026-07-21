import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar, Toggle, Modal } from '../components/ui'
import { useStore } from '../data/store'

export default function AccountManagement() {
  const nav = useNavigate()
  const { accounts, toggleAccount, deleteAccount } = useStore()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const jazz = useMemo(() => accounts.filter((a) => a.method === 'Jazzcash'), [accounts])
  const easy = useMemo(() => accounts.filter((a) => a.method === 'Easypaisa'), [accounts])

  function Section({ title, list, limit }: { title: string; list: typeof accounts; limit: number }) {
    return (
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 14px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 14 }}>{title}</b>
          <span className="muted" style={{ fontSize: 12 }}>{list.length}/{limit}</span>
        </div>
        <p className="muted" style={{ fontSize: 11, padding: '0 14px 8px', margin: 0 }}>
          Only one {title} can be Active. Players only see the active number.
        </p>
        {list.map((a) => (
          <div className="acct-item" key={a.id}>
            <div className="acct-main">
              <div className="acct-num">{a.number}</div>
              <div className="muted" style={{ fontSize: 12 }}>{a.holder}</div>
              <div className="acct-onoff">
                Active: <Toggle on={a.on} onChange={() => toggleAccount(a.id)} />
              </div>
            </div>
            <div className="acct-right">
              <button className="btn btn-violet btn-sm" onClick={() => setPendingDelete(a.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="empty" style={{ paddingBottom: 16 }}>
            <div className="e-ico">&#128179;</div>
            No {title} numbers yet
          </div>
        )}
      </div>
    )
  }

  return (
    <Shell>
      <StatusBar />
      <TopBar
        title="Account Management"
        right={
          <button className="tb-btn" onClick={() => nav('/accounts/add')} aria-label="Add">
            &#43;
          </button>
        }
      />
      <div className="scroll pad">
        <Section title="JazzCash" list={jazz} limit={30} />
        <Section title="Easypaisa" list={easy} limit={30} />
        <div style={{ height: 24 }} />
      </div>

      {pendingDelete && (
        <Modal
          title="Delete account?"
          body="This collection account will be removed."
          onCancel={() => setPendingDelete(null)}
          onOk={() => {
            deleteAccount(pendingDelete)
            setPendingDelete(null)
          }}
        />
      )}
    </Shell>
  )
}
