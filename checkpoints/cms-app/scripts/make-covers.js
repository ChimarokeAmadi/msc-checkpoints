// scripts/make-covers.js
// Draws the cover pictures as simple abstract SVGs (my own, so no copyright
// problems, and only a few KB each).
//   node scripts/make-covers.js  ->  client/public/covers/cover-1.svg ... cover-8.svg

const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'client', 'public', 'covers');
fs.mkdirSync(out, { recursive: true });

// [background, color A, color B, color C]
const palettes = [
  ['#1f3a5f', '#4f8fd6', '#f2c14e', '#e8eef7'],
  ['#f4e9dc', '#d9643a', '#2f6f6a', '#f6c9a8'],
  ['#2b2140', '#8a6be0', '#f08a5d', '#d9d0f0'],
  ['#e5f0e8', '#2f7a4a', '#9cc9a8', '#1f3d2b'],
  ['#fbf3d5', '#e0a526', '#3c5a99', '#f2dc8f'],
  ['#192428', '#3fb8a8', '#e4572e', '#c9e8e3'],
  ['#f1e4ef', '#b0447a', '#5a3d8a', '#e9b8d3'],
  ['#e8eef5', '#355c7d', '#c06c84', '#f8b195'],
];

// A few different layouts so the covers don't all look the same
const layouts = [
  ([bg, a, b, c]) => `<rect width="1200" height="630" fill="${bg}"/><circle cx="930" cy="200" r="230" fill="${a}"/><circle cx="1040" cy="430" r="140" fill="${b}"/><rect x="90" y="400" width="520" height="38" rx="19" fill="${c}" opacity=".9"/><rect x="90" y="470" width="360" height="38" rx="19" fill="${c}" opacity=".55"/>`,
  ([bg, a, b, c]) => `<rect width="1200" height="630" fill="${bg}"/><path d="M0 470 Q300 330 600 450 T1200 400 V630 H0Z" fill="${a}"/><path d="M0 540 Q300 450 620 540 T1200 520 V630 H0Z" fill="${b}"/><circle cx="930" cy="170" r="80" fill="${c}"/>`,
  ([bg, a, b, c]) => `<rect width="1200" height="630" fill="${bg}"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="${120 + i * 200}" y="${470 - i * 70}" width="150" height="${90 + i * 70}" rx="16" fill="${i % 2 ? b : a}"/>`).join('')}<circle cx="1050" cy="120" r="50" fill="${c}"/>`,
  ([bg, a, b, c]) => `<rect width="1200" height="630" fill="${bg}"/><g fill="none" stroke-width="28" stroke-linecap="round"><path d="M150 480 L420 180 L690 480" stroke="${a}"/><path d="M560 480 L830 180 L1100 480" stroke="${b}"/></g><circle cx="830" cy="180" r="30" fill="${c}"/>`,
  ([bg, a, b, c]) => `<rect width="1200" height="630" fill="${bg}"/>${Array.from({ length: 6 }, (_, r) => Array.from({ length: 10 }, (_, k) => `<circle cx="${150 + k * 100}" cy="${90 + r * 90}" r="${(r + k) % 4 === 0 ? 30 : 14}" fill="${(r + k) % 4 === 0 ? a : (r * k) % 3 === 0 ? b : c}"/>`).join('')).join('')}`,
  ([bg, a, b, c]) => `<rect width="1200" height="630" fill="${bg}"/><rect x="140" y="120" width="560" height="390" rx="28" fill="${c}"/><rect x="140" y="120" width="560" height="60" rx="28" fill="${a}"/><rect x="190" y="230" width="300" height="26" rx="13" fill="${b}"/><rect x="190" y="290" width="440" height="26" rx="13" fill="${a}" opacity=".45"/><rect x="190" y="350" width="380" height="26" rx="13" fill="${a}" opacity=".45"/><circle cx="930" cy="330" r="170" fill="${b}"/>`,
  ([bg, a, b, c]) => `<rect width="1200" height="630" fill="${bg}"/><path d="M600 80 L1000 315 L600 550 L200 315Z" fill="${a}"/><path d="M600 180 L830 315 L600 450 L370 315Z" fill="${b}"/><circle cx="600" cy="315" r="50" fill="${c}"/>`,
  ([bg, a, b, c]) => `<rect width="1200" height="630" fill="${bg}"/><circle cx="300" cy="315" r="200" fill="${a}"/><circle cx="600" cy="315" r="200" fill="${b}" opacity=".85"/><circle cx="900" cy="315" r="200" fill="${c}" opacity=".85"/>`,
];

palettes.forEach((pal, i) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">${layouts[i](pal)}</svg>\n`;
  fs.writeFileSync(path.join(out, `cover-${i + 1}.svg`), svg);
});
console.log(`Wrote ${palettes.length} covers to client/public/covers/`);
