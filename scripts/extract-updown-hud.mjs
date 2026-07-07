import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const atlas = 'public/games/7up-down/18_1802d2ef6.e5697.png'
const outDir = 'public/games/7up-down/hud'
fs.mkdirSync(outDir, { recursive: true })

async function crop(name, x, y, w, h, rotate = 0) {
  let img = sharp(atlas).extract({ left: x, top: y, width: w, height: h })
  if (rotate) img = img.rotate(rotate)
  await img.png().toFile(path.join(outDir, name))
  console.log('wrote', name)
}

await crop('back.png', 933, 127, 80, 83)
await crop('menu.png', 847, 127, 80, 83)
await crop('social.png', 1019, 127, 80, 81)
await crop('shaker.png', 759, 127, 82, 82)
await crop('promo.png', 3, 127, 651, 116)
// ty_btm_add extends past atlas edge — crop visible portion
await sharp(atlas)
  .extract({ left: 1624, top: 3, width: 157, height: 83 })
  .rotate(-90)
  .png()
  .toFile(path.join(outDir, 'add.png'))
console.log('wrote add.png')
console.log('done')
