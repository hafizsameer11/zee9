import { chromium } from 'playwright'

const API = 'https://backend.roadmaster.pro/api/v1'
const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '03003333333', password: 'player123' }),
}).then((r) => r.json())
const { accessToken, refreshToken } = login.data

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 896, height: 414 } })
await ctx.addInitScript(([a, r]) => {
  localStorage.setItem('zee9-player-access', a)
  localStorage.setItem('zee9-player-refresh', r)
  localStorage.setItem('zee9-sound-prefs', JSON.stringify({ music: false, sfx: false, vibrate: false, volume: 0 }))
}, [accessToken, refreshToken])

const page = await ctx.newPage()
page.on('response', (r) => r.status() >= 400 && console.log('HTTP', r.status(), r.url()))
await page.goto('https://zee9.roadmaster.pro/play/7up-down', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)

const zones = await page.$$('button[aria-label^="Bet "]')
for (const z of zones) {
  try { await z.click({ timeout: 1500 }) } catch {}
  await page.waitForTimeout(250)
}
await page.waitForTimeout(1200)

const info = await page.evaluate(() => {
  const out = { zones: [] }
  document.querySelectorAll('button[aria-label^="Bet "]').forEach((b) => {
    const piles = b.querySelectorAll('span[class*="pile"]')
    const imgs = b.querySelectorAll('img')
    out.zones.push({
      label: b.getAttribute('aria-label'),
      rect: b.getBoundingClientRect().toJSON(),
      pileNodes: piles.length,
      imgs: [...imgs].map((i) => ({
        src: i.getAttribute('src')?.split('/').pop(),
        cls: i.className,
        rect: i.getBoundingClientRect().toJSON(),
        natural: [i.naturalWidth, i.naturalHeight],
        display: getComputedStyle(i).display,
        visibility: getComputedStyle(i).visibility,
        opacity: getComputedStyle(i).opacity,
      })),
    })
  })
  const pile = document.querySelector('span[class*="pile"]:not([class*="pileChip"])')
  if (pile) {
    const cs = getComputedStyle(pile)
    out.pileStyle = {
      position: cs.position, left: cs.left, top: cs.top,
      width: cs.width, height: cs.height, transform: cs.transform,
      rect: pile.getBoundingClientRect().toJSON(),
      childCount: pile.children.length,
    }
  }
  return out
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
