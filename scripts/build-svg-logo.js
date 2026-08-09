const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = 'C:\\Users\\sivak\\.gemini\\antigravity-ide\\brain\\ab1dc2be-1291-4b88-ad2f-6f30161c61b0';
const wordmarkJpg = path.join(brainDir, 'media__1785907046846.jpg');
const emblemPng = path.join(brainDir, 'media__1785907075498.png');

async function processImages() {
  fs.copyFileSync(wordmarkJpg, 'public/logo-wordmark.jpg');
  fs.copyFileSync(emblemPng, 'public/logo-emblem.png');
  fs.copyFileSync(emblemPng, 'public/logo.png');

  function perpendicularDistance(p, p1, p2) {
    let dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    if (dx === 0 && dy === 0) return Math.hypot(p[0] - p1[0], p[1] - p1[1]);
    let u = ((p[0] - p1[0]) * dx + (p[1] - p1[1]) * dy) / (dx * dx + dy * dy);
    u = Math.max(0, Math.min(1, u));
    let ix = p1[0] + u * dx, iy = p1[1] + u * dy;
    return Math.hypot(p[0] - ix, p[1] - iy);
  }

  function rdp(pts, epsilon) {
    if (pts.length <= 2) return pts;
    let dmax = 0, index = 0;
    let end = pts.length - 1;
    for (let i = 1; i < end; i++) {
      let d = perpendicularDistance(pts[i], pts[0], pts[end]);
      if (d > dmax) { index = i; dmax = d; }
    }
    if (dmax > epsilon) {
      let rec1 = rdp(pts.slice(0, index + 1), epsilon);
      let rec2 = rdp(pts.slice(index), epsilon);
      return rec1.slice(0, rec1.length - 1).concat(rec2);
    }
    return [pts[0], pts[end]];
  }

  async function vectorizeImage(imagePath, threshold = 180, epsilon = 0.8) {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const origW = metadata.width;
    const origH = metadata.height;

    const rawBuffer = await image
      .ensureAlpha()
      .raw()
      .toBuffer();

    const w = origW + 2;
    const h = origH + 2;
    const grid = new Uint8Array(w * h);

    let minX = origW, minY = origH, maxX = 0, maxY = 0;

    for (let y = 0; y < origH; y++) {
      for (let x = 0; x < origW; x++) {
        const idx = (y * origW + x) * 4;
        const r = rawBuffer[idx];
        const g = rawBuffer[idx + 1];
        const b = rawBuffer[idx + 2];
        const a = rawBuffer[idx + 3];
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        let isDark = a > 128 && lum < threshold;
        grid[(y + 1) * w + (x + 1)] = isDark ? 1 : 0;
        if (isDark) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    const visited = new Uint8Array(w * h);
    const contours = [];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let idx = y * w + x;
        if (grid[idx] && !visited[idx]) {
          if (!grid[idx - 1] || !grid[idx + 1] || !grid[idx - w] || !grid[idx + w]) {
            let pts = [];
            let cx = x, cy = y;
            let dir = 0;
            const dxs = [1, 1, 0, -1, -1, -1, 0, 1];
            const dys = [0, 1, 1, 1, 0, -1, -1, -1];
            let sx = cx, sy = cy;
            let loopCount = 0;

            while (loopCount++ < 100000) {
              pts.push([cx - 1, cy - 1]);
              visited[cy * w + cx] = 1;
              let found = false;
              let startDir = (dir + 5) % 8;
              for (let i = 0; i < 8; i++) {
                let ndir = (startDir + i) % 8;
                let nx = cx + dxs[ndir], ny = cy + dys[ndir];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny * w + nx]) {
                  cx = nx; cy = ny; dir = ndir;
                  found = true;
                  break;
                }
              }
              if (!found || (cx === sx && cy === sy)) break;
            }
            if (pts.length > 30) contours.push(pts);
          }
        }
      }
    }

    let svgPaths = [];
    contours.forEach((pts) => {
      let simplified = rdp(pts, epsilon);
      if (simplified.length >= 3) {
        let d = 'M ' + simplified.map(p => p[0] + ',' + p[1]).join(' L ') + ' Z';
        svgPaths.push(d);
      }
    });

    const cropW = (maxX - minX) + 2;
    const cropH = (maxY - minY) + 2;

    const svgContent = `<svg viewBox="${minX - 1} ${minY - 1} ${cropW} ${cropH}" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
  <path fill-rule="evenodd" clip-rule="evenodd" d="${svgPaths.join(' ')}" />
</svg>`;

    return { svgContent, minX, minY, cropW, cropH, pathData: svgPaths.join(' ') };
  }

  // Vectorize Emblem
  const emblemRes = await vectorizeImage(emblemPng, 180, 0.8);
  fs.writeFileSync('public/logo-emblem.svg', emblemRes.svgContent);
  fs.writeFileSync('public/icon.svg', emblemRes.svgContent);

  // Vectorize Wordmark
  const wordmarkRes = await vectorizeImage(wordmarkJpg, 180, 0.6);
  fs.writeFileSync('public/logo-wordmark.svg', wordmarkRes.svgContent);

  // Generate combined logo-full.svg (Emblem + Wordmark)
  const fullSvg = `<svg viewBox="0 0 1350 300" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
  <g transform="translate(10, 0) scale(0.48)">
    <svg viewBox="${emblemRes.minX - 1} ${emblemRes.minY - 1} ${emblemRes.cropW} ${emblemRes.cropH}" width="${emblemRes.cropW}" height="${emblemRes.cropH}">
      <path fill-rule="evenodd" clip-rule="evenodd" d="${emblemRes.pathData}" />
    </svg>
  </g>
  <g transform="translate(320, 105) scale(1.15)">
    <svg viewBox="${wordmarkRes.minX - 1} ${wordmarkRes.minY - 1} ${wordmarkRes.cropW} ${wordmarkRes.cropH}" width="${wordmarkRes.cropW}" height="${wordmarkRes.cropH}">
      <path fill-rule="evenodd" clip-rule="evenodd" d="${wordmarkRes.pathData}" />
    </svg>
  </g>
</svg>`;

  fs.writeFileSync('public/logo-full.svg', fullSvg);

  // Generate PNG icons using sharp from emblemPng
  await sharp(emblemPng).resize(32, 32).png().toFile('public/icon-light-32x32.png');
  await sharp(emblemPng).resize(32, 32).png().toFile('public/icon-dark-32x32.png');
  await sharp(emblemPng).resize(180, 180).png().toFile('public/apple-icon.png');
  console.log('Generated all SVG & PNG logo assets successfully!');
}

processImages().catch(console.error);
