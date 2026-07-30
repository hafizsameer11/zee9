import { chromium } from 'playwright'
import fs from 'fs'
const out = '/tmp/bt-shots'
fs.mkdirSync(out, { recursive: true })
const url = 'http://127.0.0.1:5174/preview/bounty-trail'
const sizes = [['390x844',390,844],['430x932',430,932],['360x640',360,640],['desktop',1280,900]]
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-gpu'] })
for (const [name,w,h] of sizes) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  page.on('pageerror', e => console.log('PAGEERR', name, e.message))
  page.on('console', m => { if (m.type()==='error') console.log('CON', name, m.text()) })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log('shot', name)
  await context.close()
}
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const page = await context.newPage()
await page.goto(url+'?btDebug=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(6000)
await page.screenshot({ path: `${out}/390-debug-checker.png` })
console.log('shot debug')
await context.close()
await browser.close()
console.log('done', fs.readdirSync(out))
