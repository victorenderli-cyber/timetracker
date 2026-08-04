import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res')
const outDir = join(__dirname, 'playstore-assets')
mkdirSync(outDir, { recursive: true })

const W = 1024
const H = 1024

// SVG do ícone: fundo gradiente + círculo de timer + ponteiro
const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="55%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e9d5ff"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="512" cy="520" r="300" fill="none" stroke="url(#rim)" stroke-width="64"/>
  <rect x="488" y="250" width="48" height="190" rx="24" fill="#ffffff"/>
  <rect x="488" y="250" width="48" height="130" rx="24" fill="#f3e8ff" opacity="0.55"/>
  <circle cx="512" cy="520" r="46" fill="#ffffff"/>
  <rect x="500" y="520" width="190" height="48" rx="24" fill="#ffffff"/>
  <rect x="500" y="520" width="140" height="48" rx="24" fill="#e9d5ff" opacity="0.5"/>
</svg>`

async function main() {
  // Play Store icon (512x512 PNG)
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(join(outDir, 'playstore-icon-512.png'))

  // Adaptive icon foreground (with safe zone padding)
  const sizes = {
    'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192,
  }
  for (const [dir, size] of Object.entries(sizes)) {
    mkdirSync(join(root, dir), { recursive: true })
    const fg = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
    await sharp(fg).png().toFile(join(root, dir, 'ic_launcher.png'))
    await sharp(fg).png().toFile(join(root, dir, 'ic_launcher_round.png'))
    await sharp(fg).png().toFile(join(root, dir, 'ic_launcher_foreground.png'))
  }

  // Feature graphic (1024x500) for Play Store
  const fgSvg = `
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="60%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#g)"/>
  <circle cx="210" cy="250" r="110" fill="none" stroke="#ffffff" stroke-width="24"/>
  <rect x="197" y="160" width="18" height="70" rx="9" fill="#ffffff"/>
  <circle cx="210" cy="250" r="17" fill="#ffffff"/>
  <rect x="206" y="250" width="70" height="18" rx="9" fill="#ffffff"/>
  <text x="420" y="250" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#ffffff">TimeTracker</text>
  <text x="420" y="310" font-family="Arial, sans-serif" font-size="34" fill="#e9d5ff">Controle seu tempo de trabalho</text>
</svg>`
  await sharp(Buffer.from(fgSvg)).png().toFile(join(outDir, 'feature-graphic-1024x500.png'))

  console.log('Ícones gerados em', outDir)
}

main().catch((e) => { console.error(e); process.exit(1) })
