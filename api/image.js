const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('id required');

  const idStr = String(id).replace(/[^0-9]/g, '');
  if (!idStr) return res.status(400).send('invalid id');

  let html;
  try {
    html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  } catch (e) {
    return res.status(500).send('read error');
  }

  const idMarker = '{id:' + idStr + ',';
  const idIdx = html.indexOf(idMarker);
  if (idIdx === -1) return res.status(404).send('not found');

  // Find img field after the id
  const imgKey = "img:'";
  const imgStart = html.indexOf(imgKey, idIdx);
  if (imgStart === -1 || imgStart - idIdx > 500) return res.status(404).send('img not found');

  const dataStart = imgStart + imgKey.length; // points to 'data:...'
  const imgEnd = html.indexOf("',", dataStart);
  if (imgEnd === -1) return res.status(500).send('img end not found');

  const raw = html.slice(dataStart, imgEnd).replace(/[\r\n\t ]/g, '');
  const semi = raw.indexOf(';base64,');
  if (!raw.startsWith('data:') || semi === -1) return res.status(400).send('invalid image');

  const mime = raw.slice(5, semi);
  const b64 = raw.slice(semi + 8);
  const buf = Buffer.from(b64, 'base64');
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(buf);
};
