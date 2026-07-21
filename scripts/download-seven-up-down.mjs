#!/usr/bin/env node
/**
 * Download sevenUpDown (7 Up Down) assets from complete cocos export JSON.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MANIFEST = path.join(ROOT, 'cocos-complete-export-2026-07-20T22-15-40-461Z.json')
const OUT = path.join(ROOT, 's9-cocos-assets')
const GAMES = new Set(['sevenUpDown'])
const CONCURRENCY = 8
const RETRIES = 3

function gameFromUrl(url) {
  const m = String(url).match(/\/assets\/([^/]+)\//)
  return m?.[1] ?? null
}

function relPathFromUrl(url) {
  const u = new URL(url)
  const m = u.pathname.match(/\/assets\/([^/]+)\/(.+)$/)
  if (!m) return path.basename(u.pathname) || 'index'
  return m[2]
}

async function fetchBuffer(url) {
  let lastErr
  for (let i = 0; i < RETRIES; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://super9.bet/',
          Accept: '*/*',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 8 && buf.toString() === 'OK') throw new Error('Got placeholder OK')
      return buf
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 400 * (i + 1)))
    }
  }
  throw lastErr
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

async function main() {
  const data = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  const allUrls = data.urls || []
  const urls = allUrls.filter((u) => {
    if (u.endsWith('/')) return false
    const g = gameFromUrl(u)
    return g && GAMES.has(g)
  })

  console.log(`Manifest: ${data.totalUrls ?? allUrls.length} total URLs`)
  console.log(`Downloading ${urls.length} sevenUpDown files → ${OUT}`)

  fs.mkdirSync(OUT, { recursive: true })
  const game = 'sevenUpDown'
  const gameDir = path.join(OUT, game)
  fs.mkdirSync(gameDir, { recursive: true })

  const stats = { ok: 0, fail: 0, bytes: 0, byExt: {}, files: [], errors: [] }

  await mapPool(urls, CONCURRENCY, async (url) => {
    const rel = relPathFromUrl(url)
    const dest = path.join(gameDir, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    try {
      if (fs.existsSync(dest) && fs.statSync(dest).size > 16) {
        const sz = fs.statSync(dest).size
        stats.ok++
        stats.bytes += sz
        const ext = path.extname(dest).toLowerCase() || '(none)'
        stats.byExt[ext] = (stats.byExt[ext] || 0) + 1
        stats.files.push({ rel, bytes: sz, skipped: true })
        process.stdout.write('.')
        return
      }
      const buf = await fetchBuffer(url)
      fs.writeFileSync(dest, buf)
      stats.ok++
      stats.bytes += buf.length
      const ext = path.extname(dest).toLowerCase() || '(none)'
      stats.byExt[ext] = (stats.byExt[ext] || 0) + 1
      stats.files.push({ rel, bytes: buf.length })
      process.stdout.write('.')
    } catch (e) {
      stats.fail++
      stats.errors.push({ url, error: String(e.message || e) })
      process.stdout.write('x')
    }
  })

  console.log(`\nsevenUpDown: ok=${stats.ok} fail=${stats.fail} bytes=${stats.bytes}`)

  const preview = path.join(OUT, '_preview', game)
  fs.mkdirSync(preview, { recursive: true })
  let i = 0
  for (const f of stats.files) {
    if (!/\.(png|webp|jpg|jpeg)$/i.test(f.rel)) continue
    i++
    const src = path.join(gameDir, f.rel)
    const ext = path.extname(f.rel)
    fs.copyFileSync(src, path.join(preview, `${String(i).padStart(2, '0')}${ext}`))
  }

  // Also copy media into public/games/7up-down/cocos/ for later UI work
  const pub = path.join(ROOT, 'public', 'games', '7up-down', 'cocos')
  fs.mkdirSync(pub, { recursive: true })
  let pubN = 0
  for (const f of stats.files) {
    if (!/\.(png|webp|jpg|jpeg|mp3|ogg|ttf|woff2?)$/i.test(f.rel)) continue
    const src = path.join(gameDir, f.rel)
    const base = path.basename(f.rel)
    // keep unique names if collisions
    let destName = base
    let dest = path.join(pub, destName)
    let n = 1
    while (fs.existsSync(dest) && fs.statSync(dest).size !== fs.statSync(src).size) {
      const e = path.extname(base)
      destName = `${path.basename(base, e)}_${n}${e}`
      dest = path.join(pub, destName)
      n++
    }
    fs.copyFileSync(src, dest)
    pubN++
  }

  const summary = {
    exportedAt: data.exportedAt,
    sourceManifest: path.basename(MANIFEST),
    downloadedAt: new Date().toISOString(),
    game,
    publicCopies: pubN,
    ...stats,
  }
  fs.writeFileSync(path.join(OUT, 'sevenUpDown-summary.json'), JSON.stringify(summary, null, 2))

  let md = `# Seven Up Down (sevenUpDown)\n\n`
  md += `- Source manifest: \`${path.basename(MANIFEST)}\`\n`
  md += `- Downloaded: ${summary.downloadedAt}\n`
  md += `- OK: **${stats.ok}** / fail: ${stats.fail} · **${(stats.bytes / 1024).toFixed(1)} KB**\n`
  md += `- Folder: \`s9-cocos-assets/sevenUpDown/\`\n`
  md += `- Preview: \`s9-cocos-assets/_preview/sevenUpDown/\`\n`
  md += `- Public copies: \`public/games/7up-down/cocos/\` (${pubN} media files)\n\n`
  md += `## By extension\n\n`
  for (const [ext, n] of Object.entries(stats.byExt).sort()) md += `- \`${ext}\`: ${n}\n`
  md += `\n## Native media\n\n`
  for (const f of stats.files.filter((x) => /\.(png|webp|jpg|jpeg|mp3|ogg|ttf|woff2?)$/i.test(x.rel))) {
    md += `- \`${f.rel}\` (${(f.bytes / 1024).toFixed(1)} KB)\n`
  }
  if (stats.errors.length) {
    md += `\n## Errors\n\n`
    for (const e of stats.errors) md += `- ${e.url}: ${e.error}\n`
  }
  fs.writeFileSync(path.join(OUT, 'SEVENUPDOWN.md'), md)
  console.log(`Wrote SEVENUPDOWN.md + summary; public media copies: ${pubN}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
