#!/usr/bin/env node
/**
 * Download Cocos frontend assets for crash2 + fortuneGems from cocos-frontend-assets.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MANIFEST = path.join(ROOT, 'cocos-frontend-assets.json')
const OUT = path.join(ROOT, 's9-cocos-assets')
const GAMES = new Set(['crash2', 'fortuneGems'])
const CONCURRENCY = 8
const RETRIES = 3

function gameFromUrl(url) {
  const m = url.match(/\/assets\/([^/]+)\//)
  return m?.[1] ?? null
}

function relPathFromUrl(url) {
  const u = new URL(url)
  // keep path after /assets/<game>/
  const m = u.pathname.match(/\/assets\/([^/]+)\/(.+)$/)
  if (!m) return path.basename(u.pathname)
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
  const urls = (data.urls || []).filter((u) => {
    const g = gameFromUrl(u)
    return g && GAMES.has(g)
  })

  console.log(`Manifest: ${data.totalFiles} total URLs`)
  console.log(`Downloading ${urls.length} files for: ${[...GAMES].join(', ')}`)
  console.log(`Output: ${OUT}`)

  fs.mkdirSync(OUT, { recursive: true })

  const summary = {
    exportedAt: data.exportedAt,
    origin: data.origin,
    downloadedAt: new Date().toISOString(),
    games: {},
  }

  const byGame = {}
  for (const url of urls) {
    const g = gameFromUrl(url)
    ;(byGame[g] ||= []).push(url)
  }

  for (const [game, list] of Object.entries(byGame)) {
    console.log(`\n== ${game}: ${list.length} files ==`)
    const gameDir = path.join(OUT, game)
    fs.mkdirSync(gameDir, { recursive: true })

    const stats = {
      ok: 0,
      fail: 0,
      bytes: 0,
      byExt: {},
      files: [],
      errors: [],
    }

    await mapPool(list, CONCURRENCY, async (url) => {
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
          stats.files.push({ rel, bytes: sz, url, skipped: true })
          process.stdout.write('.')
          return
        }
        const buf = await fetchBuffer(url)
        fs.writeFileSync(dest, buf)
        stats.ok++
        stats.bytes += buf.length
        const ext = path.extname(dest).toLowerCase() || '(none)'
        stats.byExt[ext] = (stats.byExt[ext] || 0) + 1
        stats.files.push({ rel, bytes: buf.length, url })
        process.stdout.write('.')
      } catch (e) {
        stats.fail++
        stats.errors.push({ url, error: String(e.message || e) })
        process.stdout.write('x')
      }
    })

    console.log(`\n${game}: ok=${stats.ok} fail=${stats.fail} bytes=${stats.bytes}`)
    summary.games[game] = {
      ok: stats.ok,
      fail: stats.fail,
      bytes: stats.bytes,
      byExt: stats.byExt,
      errors: stats.errors,
      files: stats.files.map((f) => ({ rel: f.rel, bytes: f.bytes })),
    }
  }

  // Inventory report
  const reportPath = path.join(OUT, 'INVENTORY.md')
  let md = `# S9 Cocos assets inventory\n\n`
  md += `- Source: \`${data.origin}\`\n`
  md += `- Manifest exported: ${data.exportedAt}\n`
  md += `- Downloaded: ${summary.downloadedAt}\n`
  md += `- Games: crash2, fortuneGems (skipped aviator/crash)\n\n`

  for (const [game, g] of Object.entries(summary.games)) {
    md += `## ${game}\n\n`
    md += `- Files OK: **${g.ok}** / fail: ${g.fail}\n`
    md += `- Total size: **${(g.bytes / 1024).toFixed(1)} KB**\n`
    md += `- By extension:\n`
    for (const [ext, n] of Object.entries(g.byExt).sort()) {
      md += `  - \`${ext}\`: ${n}\n`
    }
    md += `\n### Native media (png/webp/mp3)\n\n`
    const media = g.files.filter((f) => /\.(png|webp|jpg|jpeg|mp3|ogg)$/i.test(f.rel))
    for (const f of media) {
      md += `- \`${f.rel}\` (${(f.bytes / 1024).toFixed(1)} KB)\n`
    }
    if (g.errors?.length) {
      md += `\n### Errors\n\n`
      for (const e of g.errors) md += `- ${e.url}: ${e.error}\n`
    }
    md += `\n`
  }

  fs.writeFileSync(reportPath, md)
  fs.writeFileSync(path.join(OUT, 'download-summary.json'), JSON.stringify(summary, null, 2))
  console.log(`\nWrote ${reportPath}`)
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
