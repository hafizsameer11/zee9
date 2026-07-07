import fs from 'fs'

const main = fs.readFileSync('super9.bet (1)/super9.bet/assets/main/index.d00af.js', 'utf8')

// Find GameId enum-like patterns
const chunks = main.match(/GameId[^}]{0,4000}/g) ?? []
for (const c of chunks.slice(0, 3)) {
  console.log(c.slice(0, 2000))
  console.log('---')
}

// Bundle name constants
const bundleMatches = [...main.matchAll(/([A-Z_]{3,30})\s*:\s*["']([a-zA-Z][a-zA-Z0-9_-]*)["']/g)]
const bundles = bundleMatches.filter((m) => /BUNDLE|mining|aviator|crash|fortune|hall|teen|wingo|lottery|money/i.test(m[0]))
console.log('\n=== BUNDLE CONSTANTS ===')
for (const [, key, val] of bundles.slice(0, 40)) {
  console.log(`${key} -> ${val}`)
}
