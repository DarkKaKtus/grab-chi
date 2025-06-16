import express         from 'express';
import { ytDlpWrap }   from 'yt-dlp-exec';
import cors            from 'cors';
import pkg from 'yt-dlp-exec';
const { ytDlpWrap } = pkg;      // ← достаём из default

import express from 'express';
import cors    from 'cors';

const app   = express();
const ytdlp = ytDlpWrap();
const PORT  = process.env.PORT || 8080;

/* ... остальной код без изменений ... */


app.use(cors()); // GitHub-Pages фронт сможет достучаться

app.get('/api/grab', async (req,res)=>{
  const url = req.query.url;
  if(!url) return res.status(400).json({error:'missing url'});
  try{
    const info = JSON.parse(
      await ytdlp.execPromise([url,'-J','--no-playlist','--no-warnings'])
    );
    const f = (info.formats||[])
              .filter(v=>v.filesize && v.ext!=='webm')
              .sort((a,b)=> (b.height||0)-(a.height||0))[0];
    if(!f) throw new Error('no format');
    res.json({
      filename : (info.title||'download')+'.'+f.ext,
      download : f.url,
      thumbnail: info.thumbnail,
      width    : f.width,
      height   : f.height
    });
  }catch(err){
    res.status(500).json({error:err.message});
  }
});

app.listen(PORT,()=>console.log('API on :'+PORT));
