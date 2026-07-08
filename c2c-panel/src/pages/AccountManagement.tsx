import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar, Toggle, Modal } from '../components/ui'
import { useStore } from '../data/store'

export default function AccountManagement() {
  const nav = useNavigate()
  const { accounts, toggleAccount, deleteAccount } = useStore()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

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
        <div className="card">
          {accounts.map((a) => (
            <div className="acct-item" key={a.id}>
              <div className="acct-main">
                <div className="acct-num">{a.number}</div>
                {a.awaiting ? (
                  <div className="acct-await">Awaiting review</div>
                ) : (
                  <div className="acct-onoff">
                    On / Off: <Toggle on={a.on} onChange={() => toggleAccount(a.id)} />
                  </div>
                )}
              </div>
              <div className="acct-right">
                <button className="btn btn-violet btn-sm" onClick={() => setPendingDelete(a.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="empty">
              <div className="e-ico">&#128179;</div>
              No accounts yet
            </div>
          )}
        </div>
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
