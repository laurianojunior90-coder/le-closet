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

module.exports = function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('id required');

  let prods;
  try { prods = getProds(); } catch (e) { return res.status(500).send('parse error'); }

  const p = prods.find(x => String(x.id) === String(id));
  if (!p || !p.img) return res.status(404).send('not found');

  const m = String(p.img).match(/^data:([^;]+);base64,(.+)$/s);
  if (!m) return res.status(400).send('invalid image');

  const buf = Buffer.from(m[2], 'base64');
  res.setHeader('Content-Type', m[1]);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(buf);
};
