import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar, Toggle, Modal, fmt } from '../components/ui'
import { useStore } from '../data/store'
import { WALLET_ACCOUNT } from '../data/mock'

export default function Collections() {
  const nav = useNavigate()
  const { balance, freeze, collectionsOn, setCollectionsOn, orders } = useStore()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Collections" onBack={() => nav('/')} />
      <div className="scroll pad">
        <div className="card balance-card">
          <div className="balance-col">
            <h3>Balance</h3>
            <div className="num">{fmt(balance)}</div>
          </div>
          <div className="balance-col">
            <h3>Freeze Funds</h3>
            <div className="num gold">{fmt(freeze)}</div>
          </div>
        </div>

        <div className="card collect-toggle-card">
          <span className="ct-label">Collections</span>
          <Toggle on={collectionsOn} onChange={() => setCollectionsOn(!collectionsOn)} />
        </div>

        <div className="card wallet-row">
          <span className="wr-k">Wallet Account</span>
          <span className="wr-v">{WALLET_ACCOUNT} &#8250;</span>
        </div>

        <div className="order-list-title">ORDER LIST</div>

        {!collectionsOn ? (
          <div className="card empty">
            <div className="e-ico">&#128721;</div>
            Collections are turned off
          </div>
        ) : orders.length === 0 ? (
          <div className="card empty">
            <div className="e-ico">&#128203;</div>
            No data
          </div>
        ) : (
          orders.map((o) => (
            <div className="card collect-order" key={o.id}>
              <div className="co-lines">
                <div className="oc-line">
                  <span className="k">{o.type}</span>
                  <span className="v">{fmt(o.amount)}</span>
                </div>
                <div className="oc-line">
                  <span className="k">REWARD</span>
                  <span className="v gold">{fmt(o.reward)}</span>
                </div>
              </div>
              <div className="oc-actions">
                <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(o.id)}>
                  Checking
                </button>
                <span className="status processing">Processing</span>
              </div>
            </div>
          ))
        )}
        <div style={{ height: 24 }} />
      </div>

      {confirmId && (
        <Modal
          body={
            <>
              To protect the rights and interests of you and the players, the backstage staff will
              verify the order and give the feedback result within 0.1 hour, during which the
              corresponding amount of funds in your account will be frozen. Please wait patiently or
              contact customer service.
            </>
          }
          onCancel={() => setConfirmId(null)}
          onOk={() => {
            const id = confirmId
            setConfirmId(null)
            nav('/order/' + id)
          }}
        />
      )}
    </Shell>
  )
}
