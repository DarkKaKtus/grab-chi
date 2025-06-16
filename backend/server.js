// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdlp = require('yt-dlp-exec');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

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
      download:  `/api/proxy?url=${encodeURIComponent(best.url)}`,
      thumbnail: info.thumbnail,
      width:     best.width,
      height:    best.height
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Прокси-обработчик, чтобы обойти CORS и отдавать видео через сервер
app.get('/api/proxy', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('Missing video URL');

  try {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error('Failed to fetch video');

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
    response.body.pipe(res);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('API on :' + PORT));