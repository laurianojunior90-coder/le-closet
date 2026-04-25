const fs = require('fs');
const path = require('path');
const vm = require('vm');

let _cache = null;

function getProds() {
  if (_cache) return _cache;
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const match = html.match(/const PRODS\s*=\s*(\[[\s\S]*\])\s*;\s*\/\/\s*##PRODS_END##/);
  if (!match) return [];
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext('PRODS = ' + match[1], ctx, { timeout: 8000 });
  _cache = ctx.PRODS;
  return _cache;
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
  try { prods = getProds(); } catch (e) {
    res.status(500).send('parse error: ' + e.message);
    return;
  }

  const items = prods
    .filter(p => p.img)
    .map(p => {
      const price = Number(p.price || 0).toFixed(2);
      const avail = (p.stock === 0) ? 'out of stock' : 'in stock';
      return `    <item>
      <g:id>${esc(p.id)}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc(p.desc || p.name)}</g:description>
      <g:link>${base}/?produto=${esc(p.id)}</g:link>
      <g:image_link>${base}/api/image?id=${esc(p.id)}</g:image_link>
      <g:availability>${avail}</g:availability>
      <g:price>${price} BRL</g:price>
      <g:brand>Lê Closet</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
    </item>`;
    })
    .join('\n');

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
