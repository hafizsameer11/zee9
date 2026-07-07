import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const atlas = 'public/games/7up-down/1be40e510.c30db.png'
const outDir = 'public/games/7up-down/chips'
fs.mkdirSync(outDir, { recursive: true })

const VALUES = [10, 50, 100, 500, 1000]

// choose1 sheet: 5 chip rows stacked vertically [541,150,389,338]
const c1 = { x: 541, y: 150, w: 389, h: 338 }
const rowH = Math.floor(c1.h / 5)

for (let i = 0; i < 5; i++) {
  const out = path.join(outDir, `sel-${VALUES[i]}.png`)
  await sharp(atlas)
    .extract({ left: c1.x, top: c1.y + i * rowH, width: c1.w, height: rowH })
    .trim({ threshold: 12 })
    .resize(56, 56, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out)
  const m = await sharp(out).metadata()
  console.log('sel', VALUES[i], m.width, 'x', m.height)
}

// Table chips from xz sheet (5×2)
const xz = { x: 111, y: 504, w: 291, h: 290 }
const cw = Math.floor(xz.w / 5)
const ch = Math.floor(xz.h / 2)
const tableNames = [
  ['chip-white', 'chip-red', 'chip-blue', 'chip-green', 'chip-gold'],
  ['chip-black', 'chip-brown', 'chip-purple', 'chip-orange', 'chip-yellow'],
]
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 5; c++) {
    await sharp(atlas)
      .extract({ left: xz.x + c * cw, top: xz.y + r * ch, width: cw, height: ch })
      .trim({ threshold: 10 })
      .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outDir, `${tableNames[r][c]}.png`))
  }
}

await sharp(path.join(outDir, 'chip-green.png')).toFile(path.join(outDir, 'green-chip.png'))
await sharp(path.join(outDir, 'chip-red.png')).toFile(path.join(outDir, 'red-chip.png'))

console.log('done')
