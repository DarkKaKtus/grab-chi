// server.js

const express = require('express');
const cors = require('cors');
const ytdlp = require('yt-dlp-exec'); // ← теперь правильно!

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

app.get('/api/grab', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'missing url' });

  try {
    const info = JSON.parse(
      await ytdlp(url, ['-J', '--no-playlist', '--no-warnings'])
    );

    const best = (info.formats || [])
      .filter(f => f.filesize && f.ext !== 'webm')
      .sort((a, b) => (b.height || 0) - (a.height || 0))[0];

    if (!best) throw new Error('no suitable format');

    res.json({
      filename:  (info.title || 'download') + '.' + best.ext,
      download:  best.url,
      thumbnail: info.thumbnail,
      width:     best.width,
      height:    best.height
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log('API on :' + PORT));
