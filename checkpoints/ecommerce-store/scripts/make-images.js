// scripts/make-images.js
// Draws the product pictures as simple flat SVG illustrations, so the shop
// has its own images (no copyright problems, tiny files, sharp on any screen).
//   node scripts/make-images.js   ->  client/public/products/*.svg

const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'client', 'public', 'products');
fs.mkdirSync(out, { recursive: true });

// Every picture: a soft background, a floor shadow, then the drawing
const frame = (bg, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bg}"/><ellipse cx="200" cy="330" rx="120" ry="14" fill="#000" opacity=".08"/>${body}</svg>\n`;

const drawings = {
  'ceramic-coffee-mug': frame('#fbe9df', `
    <path d="M250 175h22a38 38 0 0 1 0 76h-22" fill="none" stroke="#c4532b" stroke-width="18"/>
    <rect x="118" y="140" width="140" height="190" rx="22" fill="#e2683a"/>
    <rect x="118" y="140" width="140" height="26" rx="13" fill="#c4532b"/>
    <path d="M165 115c-10-18 10-28 0-48M200 115c-10-18 10-28 0-48M235 115c-10-18 10-28 0-48" fill="none" stroke="#d8b9a8" stroke-width="7" stroke-linecap="round"/>`),
  'insulated-water-bottle': frame('#dff1ee', `
    <rect x="172" y="52" width="56" height="34" rx="8" fill="#20403b"/>
    <path d="M160 100h80l12 30v190a14 14 0 0 1-14 14h-76a14 14 0 0 1-14-14V130z" fill="#2b8a7e"/>
    <rect x="164" y="86" width="72" height="18" rx="6" fill="#20403b"/>
    <rect x="148" y="190" width="104" height="70" fill="#f4f1ea"/>
    <rect x="170" y="140" width="10" height="160" rx="5" fill="#fff" opacity=".25"/>`),
  'bamboo-cutting-board': frame('#f6efd9', `
    <rect x="80" y="110" width="240" height="210" rx="24" fill="#d9a85b"/>
    <rect x="96" y="126" width="208" height="178" rx="16" fill="none" stroke="#c08c40" stroke-width="5"/>
    <circle cx="200" cy="140" r="0"/>
    <path d="M110 170h180M110 210h180M110 250h180" stroke="#c99a50" stroke-width="3"/>
    <circle cx="290" cy="90" r="0"/>
    <rect x="182" y="70" width="36" height="52" rx="18" fill="#d9a85b"/>
    <circle cx="200" cy="92" r="10" fill="#f6efd9"/>`),
  'canvas-tote-bag': frame('#efeadf', `
    <path d="M150 150V120a50 50 0 0 1 100 0v30" fill="none" stroke="#6b5a45" stroke-width="12"/>
    <path d="M100 150h200l-14 180H114z" fill="#e7dcc6"/>
    <path d="M100 150h200l-2 26H102z" fill="#d6c7aa"/>
    <circle cx="200" cy="250" r="34" fill="none" stroke="#e2683a" stroke-width="8"/>
    <path d="M186 250l10 10 20-22" fill="none" stroke="#e2683a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`),
  'everyday-backpack': frame('#e3e9f6', `
    <path d="M165 95a35 35 0 0 1 70 0" fill="none" stroke="#24345c" stroke-width="12"/>
    <rect x="110" y="95" width="180" height="235" rx="50" fill="#3a5498"/>
    <rect x="140" y="215" width="120" height="85" rx="18" fill="#2f4682"/>
    <rect x="140" y="215" width="120" height="14" rx="7" fill="#24345c"/>
    <rect x="190" y="235" width="20" height="10" rx="3" fill="#e9b949"/>
    <path d="M150 150h100" stroke="#2f4682" stroke-width="8" stroke-linecap="round"/>`),
  'wireless-headphones': frame('#e9e4f5', `
    <path d="M110 230v-40a90 90 0 0 1 180 0v40" fill="none" stroke="#2c2640" stroke-width="18" stroke-linecap="round"/>
    <rect x="88" y="200" width="56" height="100" rx="26" fill="#6c55b8"/>
    <rect x="256" y="200" width="56" height="100" rx="26" fill="#6c55b8"/>
    <rect x="128" y="214" width="20" height="72" rx="10" fill="#2c2640"/>
    <rect x="252" y="214" width="20" height="72" rx="10" fill="#2c2640"/>`),
  'portable-power-bank': frame('#e2eef8', `
    <rect x="130" y="90" width="140" height="240" rx="26" fill="#283445"/>
    <rect x="146" y="106" width="108" height="208" rx="16" fill="#344459"/>
    <path d="M208 160l-30 52h24l-10 46 32-58h-24z" fill="#4fc3a1"/>
    <rect x="186" y="80" width="28" height="14" rx="4" fill="#9aa7b8"/>
    <circle cx="170" cy="290" r="5" fill="#4fc3a1"/><circle cx="188" cy="290" r="5" fill="#4fc3a1"/><circle cx="206" cy="290" r="5" fill="#4fc3a1"/><circle cx="224" cy="290" r="5" fill="#53627a"/>`),
  'desk-lamp': frame('#f7f0dc', `
    <path d="M150 260 210 150" stroke="#3a3a3a" stroke-width="14" stroke-linecap="round"/>
    <path d="M210 150 270 120" stroke="#3a3a3a" stroke-width="14" stroke-linecap="round"/>
    <circle cx="210" cy="150" r="12" fill="#3a3a3a"/>
    <path d="M250 92l62 30-34 54-62-30z" fill="#e9b949"/>
    <path d="M276 166l-50 70h96z" fill="#fff4c4" opacity=".7"/>
    <rect x="100" y="300" width="110" height="26" rx="13" fill="#3a3a3a"/>
    <rect x="144" y="256" width="14" height="50" fill="#3a3a3a"/>`),
  'potted-succulent': frame('#e6f2df', `
    <path d="M200 225c-40-10-70-50-62-90 34 6 60 40 62 90z" fill="#6aa66b"/>
    <path d="M200 225c40-10 70-50 62-90-34 6-60 40-62 90z" fill="#5a9a5c"/>
    <path d="M200 225c-24-30-26-80 0-110 26 30 24 80 0 110z" fill="#7dbb7b"/>
    <path d="M200 228c-50 4-90-14-100-40 40-8 80 8 100 40zM200 228c50 4 90-14 100-40-40-8-80 8-100 40z" fill="#4e8a50"/>
    <path d="M128 230h144l-18 100h-108z" fill="#fafafa"/>
    <rect x="120" y="222" width="160" height="22" rx="6" fill="#ececec"/>`),
  'dotted-notebook': frame('#f3e6ea', `
    <rect x="118" y="80" width="170" height="240" rx="12" fill="#b0354f"/>
    <rect x="118" y="80" width="26" height="240" rx="8" fill="#8f2940"/>
    <rect x="250" y="80" width="12" height="270" fill="#e9b949"/>
    <path d="M250 350l6-12 6 12z" fill="#f3e6ea"/>
    <rect x="170" y="130" width="90" height="40" rx="6" fill="#f6dfe4"/>`),
  'classic-sunglasses': frame('#fdeedd', `
    <circle cx="140" cy="210" r="56" fill="#2e2a26"/>
    <circle cx="260" cy="210" r="56" fill="#2e2a26"/>
    <circle cx="140" cy="210" r="44" fill="#5a4a3c"/>
    <circle cx="260" cy="210" r="44" fill="#5a4a3c"/>
    <path d="M184 196q16-14 32 0" fill="none" stroke="#2e2a26" stroke-width="10"/>
    <path d="M118 190a26 26 0 0 1 22-16M238 190a26 26 0 0 1 22-16" fill="none" stroke="#fff" stroke-width="6" opacity=".35" stroke-linecap="round"/>
    <path d="M84 200 54 180M316 200l30-20" stroke="#2e2a26" stroke-width="10" stroke-linecap="round"/>`),
  'cotton-t-shirt': frame('#e0ecf3', `
    <path d="M160 90q40 30 80 0l80 40-30 60-30-14v154H140V176l-30 14-30-60z" fill="#4c8fbf"/>
    <path d="M160 90q40 30 80 0" fill="none" stroke="#3a7aa8" stroke-width="10"/>
    <circle cx="200" cy="200" r="22" fill="#e9f2f8" opacity=".9"/>`),
  placeholder: frame('#eeeeee', `
    <rect x="130" y="130" width="140" height="140" rx="20" fill="#cfcfcf"/>
    <path d="M150 250l40-50 30 34 20-22 30 38z" fill="#b5b5b5"/>
    <circle cx="232" cy="168" r="14" fill="#b5b5b5"/>`),
};

for (const [slug, svg] of Object.entries(drawings)) fs.writeFileSync(path.join(out, `${slug}.svg`), svg.replace(/\n\s+/g, ''));
console.log(`Wrote ${Object.keys(drawings).length} images to client/public/products/`);
