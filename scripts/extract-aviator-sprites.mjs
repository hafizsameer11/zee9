import fs from 'fs'
import path from 'path'

const importDir = 'super9.bet (1)/super9.bet/assets/aviator/import'
const names = new Set()

function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name)
    if (f.isDirectory()) walk(p)
    else if (f.name.endsWith('.json')) {
      const t = fs.readFileSync(p, 'utf8')
      for (const m of t.matchAll(/"name":"([^"]+)"/g)) names.add(m[1])
    }
  }
}

walk(importDir)
const arr = [...names].sort()
const keywords = ['bet', 'bank', 'toggle', 'switch', 'frame', 'screen', 'graph', 'rocket', 'lishi', 'history', 'btn', 'escape', 'auto', 'welcome', 'guide', 'crash', 'panel', 'bg', 'gold', 'chip', 'add', 'vent', 'game', 'ty_', 'qiehuan', 'huo']
for (const k of keywords) {
  const m = arr.filter((n) => n.toLowerCase().includes(k))
  if (m.length) console.log(`--- ${k} ---\n${m.join('\n')}\n`)
}
