/* ==== CONFIG ===================================== */
const API_BASE = 'https://media-grabber-backend.onrender.com'; // ➜ свой домен Render / Railway
const OEMBED = {
  youtube : u => `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
  tiktok   : u => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
  twitter  : u => `https://publish.twitter.com/oembed?url=${encodeURIComponent(u)}`,
  vimeo    : u => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`
};

/* ==== вспомогалки ================================ */
const grabForm = document.getElementById('grabForm');
const mediaUrl = document.getElementById('mediaUrl');
const preview  = document.getElementById('preview');
const feedback = document.getElementById('feedback');

/* показать embed-превью */
async function renderPreview(url){
  preview.innerHTML='';
  try{
    // пытаемся через oEmbed
    const prov = Object.keys(OEMBED).find(p=>url.includes(p));
    if(!prov) return;
    const js   = await fetch(OEMBED[prov](url)).then(r=>r.json());
    if(js.html){
      preview.innerHTML = `<div class="ratio ratio-16x9 mb-3">${js.html}</div>`;
    }else if(js.thumbnail_url){
      preview.innerHTML = `<img class="img-fluid mb-3" src="${js.thumbnail_url}">`;
    }
  }catch{/* молча */}
}

/* ==== главная логика ============================= */
grabForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const link = mediaUrl.value.trim();
  if(!link) return;
  preview.innerHTML = feedback.innerHTML = '';

  // предпросмотр
  renderPreview(link);

  try{
    const res  = await fetch(`${API_BASE}/api/grab?url=`+encodeURIComponent(link));
    const data = await res.json();
    if(data.error) throw new Error(data.error);

    /* показываем результат после успешного запроса */
    feedback.innerHTML = `
      <div class="alert alert-success mt-2">
        <b>${data.filename}</b> (${(data.width||'')+'x'+(data.height||'')})
        — <a class="alert-link" href="${data.download}" download="${data.filename}">
            скачать
          </a>
      </div>`;
  }catch(err){
    feedback.innerHTML = `<div class="alert alert-danger mt-2">
      Ошибка: ${err.message}
    </div>`;
  }
});

