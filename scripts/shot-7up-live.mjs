/**
 * Authenticated screenshots of the live 7 Up Down table.
 *
 *   node scripts/shot-7up-live.mjs [outDir] [phone] [password]
 *
 * Signs a seeded player in against the real API, drops the tokens into
 * localStorage, plays a couple of rounds and captures each phase.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = process.argv[2] ?? '/tmp/7up'
const PHONE = process.argv[3] ?? '03003333333'
const PASS = process.argv[4] ?? 'player123'
const SITE = 'https://zee9.roadmaster.pro'
const API = 'https://backend.roadmaster.pro/api/v1'

mkdirSync(OUT, { recursive: true })

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: PHONE, password: PASS }),
}).then((r) => r.json())

if (!login?.ok) throw new Error(`login failed: ${JSON.stringify(login)}`)
const { accessToken, refreshToken, user } = login.data
console.log('signed in as', user.displayName, user.id)

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const ctx = await browser.newContext({
  viewport: { width: 896, height: 414 },
  deviceScaleFactor: 2,
})
await ctx.addInitScript(
  ([a, r]) => {
    localStorage.setItem('zee9-player-access', a)
    localStorage.setItem('zee9-player-refresh', r)
    localStorage.setItem('zee9-sound-prefs', JSON.stringify({ music: false, sfx: false, vibrate: false, volume: 0 }))
  },
  [accessToken, refreshToken],
)

const page = await ctx.newPage()
const issues = []
page.on('console', (m) => m.type() === 'error' && issues.push(m.text()))
page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))
page.on('response', (r) => r.status() >= 400 && issues.push(`${r.status()} ${r.url()}`))

await page.goto(`${SITE}/play/7up-down`, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(6000)
await page.screenshot({ path: `${OUT}/01-table.png` })
console.log('01-table')

// Place a spread of bets on whichever zones are open.
const zones = await page.$$('button[aria-label^="Bet "]')
console.log('zones found:', zones.length)
for (const [i, z] of zones.entries()) {
  try {
    await z.click({ timeout: 2000 })
    await page.waitForTimeout(320)
    if (i === 0) await z.click({ timeout: 2000 })
  } catch (e) {
    issues.push(`zone click ${i}: ${e.message}`)
  }
}
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/02-bets.png` })
console.log('02-bets')

// Wait for the lock, then the reveal.
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(500)
  const label = await page.textContent('body').catch(() => '')
  if (label?.includes('ROLLING')) break
}
await page.screenshot({ path: `${OUT}/03-rolling.png` })
console.log('03-rolling')

for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(400)
  const body = await page.textContent('body').catch(() => '')
  if (body?.includes('YOU WIN') || body?.includes('LUCKY 7') || /−[\d,]/.test(body ?? '')) break
}
await page.screenshot({ path: `${OUT}/04-result.png` })
console.log('04-result')

await page.waitForTimeout(4000)
await page.screenshot({ path: `${OUT}/05-next.png` })
console.log('05-next')

if (issues.length) console.log('ISSUES:\n' + [...new Set(issues)].slice(0, 30).join('\n'))
await browser.close()
