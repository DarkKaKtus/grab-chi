const path    = require('path');
const express = require('express');
const cors    = require('cors');
const ytdlp   = require('yt-dlp-exec');        // ← default export-функция

const app  = express();
const PORT = process.env.PORT || 8080;

/* статические файлы + cors */
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- /api/grab ---------- */
app.get('/api/grab', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'missing url' });

  try {
    const raw  = await ytdlp.execPromise([
      url,
      '-J',
      '--no-playlist',
      '--no-warnings'
    ]);
    const info = JSON.parse(raw);

    const best = (info.formats || [])
      .filter(f => f.filesize && f.ext !== 'webm')
      .sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    if (!best) throw new Error('no suitable format');

    res.json({
      filename : (info.title || 'download') + '.' + best.ext,
      download : `/api/proxy?url=${encodeURIComponent(best.url)}&name=${encodeURIComponent(info.id)}.${best.ext}`,
      thumbnail: info.thumbnail,
      width    : best.width,
      height   : best.height
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- /api/proxy ---------- */
app.get('/api/proxy', async (req, res) => {
  const src  = req.query.url;
  const name = req.query.name || 'download';
  if (!src) return res.status(400).send('Missing url');

  try {
    const r = await fetch(src);
    if (!r.ok) throw new Error('origin returned ' + r.status);

    res.setHeader('Content-Type',
      r.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition',
      `attachment; filename="${name}"`);

    r.body.pipe(res);               // стримим клиенту
  } catch (e) {
    console.error(e);
    res.status(500).send('Proxy error: ' + e.message);
  }
});

/* fallback для SPA */
app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

/* запуск */
app.listen(PORT, () => console.log('API on :' + PORT));
