import { useState } from 'react'
import { PageHead } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}
function slice(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end)
  const e = polar(cx, cy, r, start)
  const large = end - start <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`
}

function isNoneLabel(label: string) {
  const l = label.trim().toLowerCase()
  return l === 'none' || l === 'no win' || l.includes('try again')
}

export default function LuckyWheel() {
  const { wheel, updateWheel, addWheelPrize, addNonePrize, deleteWheelPrize } = useAdmin()
  const total = wheel.reduce((s, p) => s + p.weight, 0)
  const seg = wheel.length > 0 ? 360 / wheel.length : 360
  const R = 150
  const C = 160

  return (
    <>
      <PageHead
        title="Lucky Wheel"
        subtitle="Set prize labels, colours and win % (weight). Weight 0 = never wins. If all weights are 0, every spin lands on None."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={addNonePrize}>{Icons.plus} Add None</button>
            <button className="btn btn-primary" onClick={addWheelPrize}>{Icons.plus} Add prize</button>
          </div>
        }
      />

      <div className="grid grid-2" style={{ gridTemplateColumns: '360px 1fr', alignItems: 'start' }}>
        <div className="card card-pad">
          <div className="wheel-wrap">
            <svg width="320" height="340" viewBox="0 0 320 340">
              <circle cx={C} cy={C} r={R + 8} fill="#241d49" />
              {wheel.map((p, i) => {
                const start = i * seg
                const end = start + seg
                const mid = start + seg / 2
                const lp = polar(C, C, R * 0.62, mid)
                return (
                  <g key={p.id}>
                    <path d={slice(C, C, R, start, end)} fill={p.color} stroke="#fff" strokeWidth="2" />
                    <text
                      x={lp.x}
                      y={lp.y}
                      fill="#fff"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${mid} ${lp.x} ${lp.y})`}
                    >
                      {p.label}
                    </text>
                  </g>
                )
              })}
              <circle cx={C} cy={C} r={26} fill="#fff" stroke="#241d49" strokeWidth="3" />
              <text x={C} y={C} fill="#6d5efc" fontSize="12" fontWeight="800" textAnchor="middle" dominantBaseline="middle">SPIN</text>
              <polygon points={`${C - 12},${C - R - 6} ${C + 12},${C - R - 6} ${C},${C - R + 16}`} fill="var(--gold)" stroke="#fff" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Prize segments</h3>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Win % = weight ÷ total ({total || 0}). Set weight to 0 to disable a segment.
            </span>
          </div>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {wheel.map((p) => (
              <div className="wheel-seg-row" key={p.id}>
                <input type="color" value={p.color} onChange={(e) => updateWheel(p.id, { color: e.target.value })} style={{ width: 28, height: 28, border: 'none', background: 'none', padding: 0 }} />
                <input value={p.label} onChange={(e) => updateWheel(p.id, { label: e.target.value })} />
                {isNoneLabel(p.label) && <span className="pill" style={{ flex: 'none' }}>None</span>}
                {p.isPhysical && <span className="pill gold" style={{ flex: 'none' }}>Physical</span>}
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                  <input type="checkbox" checked={!!p.isPhysical} onChange={(e) => updateWheel(p.id, { isPhysical: e.target.checked })} />
                  Physical
                </label>
                <div className="wt">
                  <span>weight</span>
                  <input type="number" min={0} value={p.weight} onChange={(e) => updateWheel(p.id, { weight: Math.max(0, Number(e.target.value)) })} />
                </div>
                <b style={{ width: 52, textAlign: 'right', color: 'var(--brand)' }}>
                  {total > 0 ? ((p.weight / total) * 100).toFixed(1) : '0.0'}%
                </b>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteWheelPrize(p.id)} title="Remove prize">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
