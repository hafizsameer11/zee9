import fs from 'fs'
import path from 'path'

const root = path.resolve('super9.bet (1)/super9.bet/assets')

function extractStrings(file, filter) {
  const text = fs.readFileSync(file, 'utf8')
  const matches = text.match(/["']([^"']{3,100})["']/g) ?? []
  const unique = [...new Set(matches.map((s) => s.slice(1, -1)))]
  return unique.filter(filter).sort()
}

const mining = path.join(root, 'mining/index.e0e3c.js')
if (fs.existsSync(mining)) {
  console.log('=== MINING GAME STRINGS ===')
  const s = extractStrings(mining, (x) =>
    /mine|bet|mult|cash|grid|bomb|gem|start|audio|spine|texture|prefab|box|win|treasure/i.test(x),
  )
  console.log(s.join('\n'))
}

const main = path.join(root, 'main/index.d00af.js')
if (fs.existsSync(main)) {
  const text = fs.readFileSync(main, 'utf8')
  console.log('\n=== GAME IDS ===')
  console.log([...new Set(text.match(/(?:90|80)\d{4}/g) ?? [])].sort().join(', '))
  console.log('\n=== BUNDLE / SCENE NAMES ===')
  const bundles = extractStrings(main, (x) =>
    /mining|aviator|wingo|crash|fortune|hall|teen|lottery|gems|money|double/i.test(x),
  )
  console.log(bundles.join('\n'))
}

// List configs
console.log('\n=== ASSET BUNDLES WITH CONFIG ===')
for (const dir of fs.readdirSync(root)) {
  const cfg = fs.readdirSync(path.join(root, dir)).find((f) => f.startsWith('config.'))
  if (cfg) {
    const data = JSON.parse(fs.readFileSync(path.join(root, dir, cfg), 'utf8'))
    const types = data.types ?? []
    const paths = Object.values(data.paths ?? {}).map((p) => (Array.isArray(p) ? p[0] : p))
    const animPaths = paths.filter((p) => /anim|spine|audio/i.test(String(p)))
    console.log(`\n[${dir}] encrypted=${data.encrypted} types=${types.join(',')}`)
    console.log('  animations/audio:', animPaths.slice(0, 25).join(' | '))
  }
}

// Game list API
const gameListPath = path.resolve('super9.bet (1)/gateway-ngv2.s9.game/system/game/getGameList.html')
if (fs.existsSync(gameListPath)) {
  const api = JSON.parse(fs.readFileSync(gameListPath, 'utf8'))
  console.log('\n=== S9 GAME CATALOG (page 1) ===')
  for (const g of api.data.gameList) {
    console.log(
      `${g.gameId}\t${g.gameName}\ttype=${g.gameType}\thot=${g.hotType}\torigin=${g.gameOrigin}`,
    )
  }
}
