/*  ▸▸▸  первые строки script.js  ▸▸▸  */
import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls }      from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

// импорт (ставим рядом с three-импортами)
import SimplexNoise from
  'https://cdn.jsdelivr.net/npm/simplex-noise@3.0.1/+esm';   //  ← v3!





/* ---------- EMOJI FALL & SPIN ---------- */
const cvs  = document.getElementById('matrix'),
      ctx  = cvs.getContext('2d');

const size        = 48;                       // размер эмодзи
const speed       = 1.2;                      // px/кадр
const chars       = [...'😍🤪🥴🤠😎🤓😲🥺😈💩👽👾'];
let W, H, drops = [];

function resize(){
  W = innerWidth;
  H = innerHeight;
  cvs.width  = W;
  cvs.height = H;

  // одна «капля» на каждый столбец
  const cols = Math.ceil(W / size);
  drops = Array.from({length: cols}, (_, i) => ({
    x: i * size + size / 2,   // центр столбца
    y: Math.random() * H,     // случайное старт-Y
    char: chars[i % chars.length],
    angle: Math.random() * Math.PI * 2        // стартовый угол
  }));
}
addEventListener('resize', resize);
resize();

function rain(){
  ctx.clearRect(0, 0, W, H);                  // ① нет шлейфа

  ctx.font         = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  drops.forEach(d => {
    // ② рисуем с поворотом
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.fillText(d.char, 0, 0);
    ctx.restore();

    // обновляем состояние
    d.y     += speed;
    d.angle += 0.05;          // скорость вращения (рад/кадр)

    // если вышли за низ ― возвращаем наверх с новым смайлом
    if (d.y > H + size){
      d.y    = -size;
      d.char = chars[Math.random() * chars.length | 0];
    }
  });

  requestAnimationFrame(rain);
}
rain();
/* ---------- /EMOJI FALL & SPIN ---------- */



/* ============================================================= *
 *  SKILL-PIANO — заливка 0→lvl и один семпл с изменением высоты  *
 * ============================================================= */

/* 1. данные (lvl = % уверенности, note = желаемая нота) */
const skills = [
  { txt:'HTML / CSS', clr:'#00ff88', note:'C4', lvl:90 },
  { txt:'JavaScript', clr:'#00ff66', note:'D4', lvl:85 },
  { txt:'TypeScript', clr:'#00ffcc', note:'E4', lvl:70 },
  { txt:'React',      clr:'#00ffaa', note:'F4', lvl:80 },
  { txt:'Node.js',    clr:'#00ff44', note:'G4', lvl:75 },
  { txt:'C# / SQL',   clr:'#00ffbb', note:'A4', lvl:60 }
];

/* один и тот же звук для всех клавиш */
const SAMPLE_URL = 'ekh.mp3';          // положи файл рядом с index.html
const HOT_KEYS   = ['a','s','d','f','g','h'];   // быстрые клавиши

/* 2. рисуем клавиши */
const piano = document.getElementById('pianoWrap');
piano.innerHTML = skills.map((s,i)=>`
  <div class="skill-key flex-shrink-0"
       data-idx="${i}"
       style="--clr:${s.clr}; --lvl:${s.lvl/100}; --prog:0">
    <span>${s.txt}</span>
    <div class="lvl-tip">${s.lvl}%</div>
  </div>`).join('');



/* ---------- Web-Audio ------------------------------------ */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
try {
  audioCtx = new AudioCtx({ latencyHint: 'interactive' });
} catch {
  audioCtx = new AudioCtx();
}

let unlocked = false;
addEventListener('pointerdown', () => {
  if (!unlocked) { audioCtx.resume(); unlocked = true; }
}, { once: true });

/* загружаем семпл один раз */
let sampleBuf = null;
fetch('ekh.mp3')
  .then(r => r.arrayBuffer())
  .then(b => audioCtx.decodeAudioData(b))
  .then(buf => sampleBuf = buf)
  .catch(e => console.error('sample load', e));

/* note -> playbackRate относительно C4 */
function rateFromNote(note) {
  const map = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 };
  const [, letter, oct] = note.match(/^([A-G]#?)(\d)$/);
  const semis = map[letter] + 12 * (oct - 4);
  return Math.pow(2, semis / 12);
}

/* проигрываем семпл с нужным тоном */
function play(idx) {
  if (!sampleBuf) return;                 // ещё не загрузился
  const src = audioCtx.createBufferSource();   // ← audioCtx!
  src.buffer = sampleBuf;
  src.playbackRate.value = rateFromNote(skills[idx].note);
  src.connect(audioCtx.destination);           // ← audioCtx!
  src.start();
}
function flash(el){
  /* 1. сброс → мгновенный подъём до lvl */
  el.style.setProperty('--prog', 0);
  void el.offsetHeight;                             // перезапуск transition
  el.style.setProperty('--prog', el.style.getPropertyValue('--lvl'));

  /* 2. проценты */
  const tip = el.querySelector('.lvl-tip');
  tip.classList.add('show');
  clearTimeout(tip.hideT);
  tip.hideT = setTimeout(()=>tip.classList.remove('show'), 900);

  /* 3. волна (если была) */
  el.classList.add('playing');
  clearTimeout(el.waveT);
  el.waveT = setTimeout(()=>el.classList.remove('playing'), 500);

  /* 4. ЧЕРЕЗ СЕКУНДУ опускаем прогресс обратно до 0  */
  clearTimeout(el.dropT);               // cбиваем старый таймер, если был
  el.dropT = setTimeout(()=>{
    el.style.setProperty('--prog', 0);  // плавно спустится тем же transition
  }, 1000);                             // ← 1 000 мс
}


/* 5. нажали клавишу */
function press(idx){
  const el = piano.children[idx];
  play(idx); flash(el);
}

/* 6. события мышь + клавиатура */
piano.addEventListener('pointerdown',e=>{
  const key=e.target.closest('.skill-key');
  if(key) press(+key.dataset.idx);
});
addEventListener('keydown',e=>{
  const i = HOT_KEYS.indexOf(e.key.toLowerCase());
  if(i>-1) press(i);
});

/* ----------------------------------------------------------------------- */
/* 3.  GitHub репозитории + VanillaTilt                                    */
/* ----------------------------------------------------------------------- */
const username = 'darkkaktus',
      maxRepos = 6,
      list     = document.getElementById('repoList');

async function fetchRepos() {
  try {
    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=${maxRepos}&sort=pushed`,
      { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    const res = await fetch(`https://gh-pinned-repos.egoist.dev/?username=${username}`);
    if (!res.ok) throw new Error('fallback-fail');
    const data = await res.json();
    return data.slice(0, maxRepos).map(r => ({
      name: r.repo,
      html_url: `https://github.com/${username}/${r.repo}`,
      description: r.description,
      language: r.language,
      stargazers_count: r.stars
    }));
  }
}

async function loadRepos() {
  try {
    const repos = await fetchRepos();
    if (!repos.length) throw new Error('empty');

    repos.forEach(r => {
      list.insertAdjacentHTML('beforeend', `
        <div class="col-md-6 col-lg-4">
          <div class="glass p-3 h-100 repo-card" data-tilt data-tilt-max="5">
            <h3 class="h6 fw-bold mb-1">
              <a href="${r.html_url}" target="_blank" class="link-light text-decoration-none">
                <i class="bi-github"></i> ${r.name}
              </a>
            </h3>
            <p class="small text-secondary flex-grow-1">${r.description ?? '— no description —'}</p>
            <div class="d-flex justify-content-between small">
              <span><i class="bi-circle-fill text-neo me-1"></i>${r.language ?? '–'}</span>
              <span><i class="bi-star me-1"></i>${r.stargazers_count ?? 0}</span>
            </div>
          </div>
        </div>`);
    });

    if (window.VanillaTilt) {
      VanillaTilt.init(document.querySelectorAll('[data-tilt]'), {
        max: 5, speed: 400, glare: true, 'max-glare': .15
      });
    }

  } catch (err) {
    list.innerHTML = `<p class="small text-danger">
      не удалось получить репозитории (${err.message}).</p>`;
  }
}
loadRepos();

/* ----------------------------------------------------------------------- */
/* 4.  IntersectionObserver – плавное появление секций                     */
/* ----------------------------------------------------------------------- */
const io = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('show'); }),
  { threshold: 0.25 }
);
document.querySelectorAll('.fade-in').forEach(s => io.observe(s));

const keySeq = [];
addEventListener('keydown', e=>{
  keySeq.push(e.key.toLowerCase());
  keySeq.splice(0, keySeq.length - 10);    // храним 10 последних

  const str = keySeq.join('');

  if(str.endsWith('matrix')){
    const m = document.getElementById('matrix');
    m.style.opacity = m.style.opacity === '0' ? '.14' : '0';
  }

  if(str.endsWith('tilt')){
    document.querySelectorAll('.repo-card').forEach(card=>{
      card.dataset.tilt ? card.removeAttribute('data-tilt')
                        : card.setAttribute('data-tilt','');
    });
    if(window.VanillaTilt) VanillaTilt.init('[data-tilt]');
  }
});

(function(){
  const cvs = document.getElementById('stars');
  const ctx = cvs.getContext('2d');
  const stars=[], links=[];                  // точки и рёбра
  const N = 45;                              // звёзд
  let w,h, mouse={x:0,y:0};

  function resize(){
    w = cvs.width  = innerWidth;
    h = cvs.height = innerHeight;
  }
  resize(); addEventListener('resize',resize);

  // генерим звёзды: каждая с привязанным «скиллом» (рандом сейчас)
  const skillNames = ['HTML','CSS','JS','React','Three','Node','SQL','Docker','AWS'];
  for(let i=0;i<N;i++){
    stars.push({
      x:Math.random()*w,
      y:Math.random()*h,
      vx:(Math.random()-.5)*.3,
      vy:(Math.random()-.5)*.3,
      txt: skillNames[i%skillNames.length]
    });
  }
  // пред-связываем ближайших соседей (3 ребра на звезду)
  stars.forEach(s=>{
    links.push(...stars
      .filter(o=>o!==s)
      .sort((a,b)=>dist2(s,a)-dist2(s,b))
      .slice(0,3)
      .map(o=>[s,o]));
  });

  addEventListener('pointermove',e=> mouse={x:e.clientX,y:e.clientY});

  requestAnimationFrame(loop);
  function loop(){
    requestAnimationFrame(loop);
    ctx.clearRect(0,0,w,h);

    // движение
    for(const s of stars){
      s.x += s.vx; s.y += s.vy;
      if(s.x<0||s.x>w) s.vx*=-1;
      if(s.y<0||s.y>h) s.vy*=-1;
    }

    // линии
    ctx.strokeStyle='rgba(0,255,180,.25)'; ctx.lineWidth=1;
    ctx.beginPath();
    for(const [a,b] of links){
      if(dist2(a,b)<6000) { ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); }
    }
    ctx.stroke();

    // звёзды + текст
    ctx.font='12px Share Tech Mono'; ctx.textAlign='center';
    for(const s of stars){
      const d = Math.hypot(s.x-mouse.x,s.y-mouse.y);
      const r = d<120 ? 4 : 2;                     // ближе к курсору — ярче
      ctx.fillStyle=`rgba(0,255,140,${d<120?.9:.4})`;
      ctx.beginPath(); ctx.arc(s.x,s.y,r,0,6.28); ctx.fill();
      if(d<100){ ctx.fillText(s.txt,s.x,s.y-8); }
    }
  }

  function dist2(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; }
})();
