import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5178/play/fortune-gems'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 896, height: 414 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
})

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2000)

const info = await page.evaluate(() => {
  const continueBtn = [...document.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Continue'),
  )
  const spinBtn = [...document.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('SPIN'),
  )
  const rect = continueBtn?.getBoundingClientRect()
  return {
    buttons: [...document.querySelectorAll('button')]
      .map((b) => b.textContent?.trim())
      .filter(Boolean),
    hasContinue: !!continueBtn,
    continueRect: rect
      ? {
          top: rect.top,
          bottom: rect.bottom,
          h: rect.height,
          inView: rect.top >= 0 && rect.bottom <= window.innerHeight,
        }
      : null,
    hasSpin: !!spinBtn,
    text: document.body.innerText.slice(0, 400),
  }
})

console.log(JSON.stringify({ errors, info }, null, 2))

if (info.hasContinue) {
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(1000)
  const after = await page.evaluate(() => ({
    hasSpin: !! [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('SPIN')),
    text: document.body.innerText.slice(0, 200),
  }))
  console.log('after continue:', JSON.stringify(after, null, 2))
}

await page.screenshot({ path: 'fortune-gems-debug.png' })
await browser.close()
