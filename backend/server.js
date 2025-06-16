// backend/server.js  (CommonJS)

const express      = require('express');
const cors         = require('cors');
const { ytDlpWrap }= require('yt-dlp-exec');   // берём класс-обёртку
const app  = express();
const ytdlp = new ytDlpWrap();                 // ← ОБЯЗАТЕЛЬНО new
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.static(__dirname + '/public'));

/* ---- API ---------------------------------------------------- */
app.get('/api/grab', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'missing url' });

  try {
    // правильный вызов: все флаги одной строкой-массивом
    const raw = await ytdlp.execPromise([
      url,
      '-J',            // dump JSON
      '--no-warnings',
      '--no-playlist'
    ]);
    const info = JSON.parse(raw);

    const best = (info.formats || [])
       .filter(f => f.filesize && f.ext !== 'webm')
       .sort((a,b)=> (b.height||0)-(a.height||0))[0];

    if (!best) throw new Error('no suitable format');

    res.json({
      filename:  (info.title || 'download') + '.' + best.ext,
      download:  `/api/proxy?url=${encodeURIComponent(best.url)}&name=${encodeURIComponent(info.id)}`,
      thumbnail: info.thumbnail,
      width:     best.width,
      height:    best.height
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ---- CORS-прокси для отдачи файла --------------------------- */
app.get('/api/proxy', async (req, res) => {
  const src = req.query.url;
  const name= req.query.name || 'download';
  if (!src) return res.status(400).send('Missing url');

  try {
    const r = await fetch(src);
    if (!r.ok) throw new Error('origin returned '+r.status);

    res.setHeader('Content-Type',  r.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    r.body.pipe(res);   // стримим клиенту
  } catch (e) {
    console.error(e);
    res.status(500).send('Proxy error: '+e.message);
  }
});

app.listen(PORT, () => console.log('API on :'+PORT));
