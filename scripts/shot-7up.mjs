import { chromium } from 'playwright'

const url = process.argv[2] ?? 'https://zee9.roadmaster.pro/preview/7up-down'
const out = process.argv[3] ?? '/tmp/7up-shot.png'
const waitMs = Number(process.argv[4] ?? 3500)

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage({
  viewport: { width: 896, height: 414 },
  deviceScaleFactor: 2,
})
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('requestfailed', (r) => errors.push(`404? ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`)
})

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(waitMs)
await page.screenshot({ path: out })
console.log('saved', out)
if (errors.length) console.log('ISSUES:\n' + [...new Set(errors)].slice(0, 40).join('\n'))
await browser.close()
