import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5177/game/mines'
const out = process.argv[3] ?? 'mines-layout-check.png'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 896, height: 414 } })
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(1500)

const metrics = await page.evaluate(() => {
  const startBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Start Game'))
  const frame = document.querySelector('.screen')
  return {
    frame: frame?.getBoundingClientRect(),
    startBtn: startBtn?.getBoundingClientRect(),
    viewport: { w: window.innerWidth, h: window.innerHeight },
  }
})

await page.screenshot({ path: out })
console.log(JSON.stringify(metrics, null, 2))
await browser.close()
