import fs from 'fs'

const d = JSON.parse(fs.readFileSync('public/games/7up-down/atlas-ui.json', 'utf8'))
const tex = {
  '1802d2ef6': 'ui-atlas.png',
  '1be40e510': 'game-atlas.png',
  '12ccf0bcb': 'misc-atlas.png',
}

for (const f of d) {
  const c = f.content
  if (!c?.name) continue
  const t = tex[c.texture] ?? c.texture
  const rotated = c.rotated ? ',rotated' : ''
  if (/chip|7up|choose|rebate|rebet|add|winner|lucky|btn|icon|cm_|jdt|table|bg/i.test(c.name)) {
    console.log(`${c.name}\t${t}\t${JSON.stringify(c.rect)}${rotated}`)
  }
}
