const fs = require('fs');
const path = require('path');
const vm = require('vm');

function getProds() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

  const startMark = 'const PRODS = [';
  const endMark = ']; // ##PRODS_END##';
  const s = html.indexOf(startMark);
  const e = html.indexOf(endMark);
  if (s === -1 || e === -1) return [];

  let prodsStr = html.slice(s + startMark.length, e + 1); // include closing ]

  // Strip base64 image data so vm parses fast (images not needed here)
  prodsStr = prodsStr
    .replace(/\bimg\s*:\s*'data:[^']{0,2000000}'/g, "img:'__img__'")
    .replace(/\bimg\s*:\s*"data:[^"]{0,2000000}"/g, 'img:"__img__"')
    .replace(/\bgallery\s*:\s*\[[\s\S]*?\]/g, 'gallery:[]');

  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext('PRODS = [' + prodsStr.slice(1, -1) + ']', ctx, { timeout: 5000 });
  return ctx.PRODS;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = function handler(req, res) {
  const base = 'https://' + req.headers.host;

  let prods;
  try {
    prods = getProds();
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
    return;
  }

  const items = prods.map(p => {
    const price = Number(p.price || 0).toFixed(2);
    return `    <item>
      <g:id>${esc(p.id)}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc(p.desc || p.name)}</g:description>
      <g:link>${base}/</g:link>
      <g:image_link>${base}/api/image?id=${esc(p.id)}</g:image_link>
      <g:availability>in stock</g:availability>
      <g:price>${price} BRL</g:price>
      <g:brand>Lê Closet</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Lê Closet</title>
    <link>${base}</link>
    <description>Moda feminina — Lê Closet</description>
${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(xml);
};
