/* ==========================================================================
   ANARKY DAW v2.0 — DISCOGRAPHY MODULE
   Full-screen album cover carousel, click to open album
   ========================================================================== */

import { WASM_SIM } from '../../../wasm/wasm_sim.js';

// ── Album Database ───────────────────────────────────────────────────────────
export const ALBUM_DB = [
  {
    id: 'eminem-mmlp', title: 'The Marshall Mathers LP', artist: 'Eminem',
    year: 2000, label: 'Aftermath / Interscope', genre: 'Hardcore Hip-Hop',
    themeColor: '#ff003c', hasParental: true,
    cover: 'assets/images/cover-mmlp.jpg',
    themeFile: 'theme-mmlp',
    tracks: ['Kill You','Stan','Who Knew','The Way I Am','The Real Slim Shady','Marshall Mathers','Drug Ballad','Bitch Please II','Kim','Under the Influence'],
  },
  {
    id: 'ye-graduation', title: 'Graduation', artist: 'Kanye West',
    year: 2007, label: 'Roc-A-Fella / Def Jam', genre: 'Synth-Rap / Pop-Rap',
    themeColor: '#ff00d0', hasParental: true,
    cover: 'assets/images/cover-graduation.jpg',
    themeFile: 'theme-graduation',
    tracks: ['Good Morning','Champion','Stronger','I Wonder','Good Life','Can\'t Tell Me Nothing','Barry Bonds','Flashing Lights','Everything I Am','Homecoming'],
  },
  {
    id: 'mavi-veritas', title: 'VERITAS', artist: 'Mavi',
    year: 2022, label: 'Independent', genre: 'Turkish Alternative Trap',
    themeColor: '#00b4d8', hasParental: false,
    cover: 'assets/images/cover-veritas.jpg',
    themeFile: 'theme-veritas',
    tracks: ['VVL EMPIRE','maalesef','chosen one','şimşekler','ama hala','sağdan sola','mississippi','fanus (feat. Defa)','bipo-love','senden uzak (feat. Kum)','saydam','rüzgarlar savrulsun','bi\'tanem (feat. Diego)'],
  },
  {
    id: 'hayko-sandik', title: 'Sandık', artist: 'Hayko Cepkin',
    year: 2010, label: 'EMI Music', genre: 'Turkish Gothic Metal / Industrial',
    themeColor: '#7b2cbf', hasParental: false,
    cover: 'assets/images/cover-sandik.jpg',
    themeFile: 'theme-sandik',
    tracks: ['Sandık','Yol Gözümü Dağlıyor','Gelin Olmuş','Balık Olsaydım','Sahibi Yok','Doymadınız','Açtırdınız Kutuyu','Sandığım Hazır','Yolun Sonu'],
  },
  {
    id: 'slipknot-verses', title: 'Vol. 3: (The Subliminal Verses)', artist: 'Slipknot',
    year: 2004, label: 'Roadrunner Records', genre: 'Nu-Metal / Alternative Metal',
    themeColor: '#e67300', hasParental: true,
    cover: 'assets/images/cover-vol3.jpg',
    themeFile: 'theme-verses',
    tracks: ['Prelude 3.0','The Blister Exists','Three Nil','Duality','Opium of the People','Circle','Welcome','Vermilion','Pulse of the Maggots','Before I Forget'],
  },
  {
    id: 'motive-taycan', title: 'Taycan', artist: 'Motive',
    year: 2023, label: 'P.G.E. / Savana', genre: 'Turkish Trap / Drill',
    themeColor: '#adb5bd', hasParental: true,
    cover: 'assets/images/cover-taycan.jpg',
    themeFile: 'theme-taycan',
    tracks: ['TAYCAN','RODEO','GLIDE','RIDE OR DIE','SIREN','CHROME','ZİNCİR','24/7'],
  },
  {
    id: 'ezhel-muptezhel', title: 'Müptezhel', artist: 'Ezhel',
    year: 2017, label: 'Koal / RedKeys', genre: 'Anatolian Trap / Reggae-Rap',
    themeColor: '#2a9d8f', hasParental: true,
    cover: 'assets/images/cover-muptezhel.jpg',
    themeFile: 'theme-muptezhel',
    tracks: ['Alo','Geceler','Benim Derdim','İmkansızım','Şehrimin Tadı','Nefret','Bırak Kadınım','Derman'],
  },
  {
    id: 'kendrick-damn', title: 'DAMN.', artist: 'Kendrick Lamar',
    year: 2017, label: 'TDE / Aftermath / Interscope', genre: 'Conscious Hip-Hop',
    themeColor: '#d90429', hasParental: true,
    cover: 'assets/images/cover-damn.jpg',
    themeFile: 'theme-damn',
    tracks: ['BLOOD.','DNA.','YAH.','ELEMENT.','FEEL.','LOYALTY.','PRIDE.','HUMBLE.','LUST.','LOVE.','XXX.','FEAR.','GOD.','DUCKWORTH.'],
  },
];

// ── State ────────────────────────────────────────────────────────────────────
let _index      = 0;
let _animating  = false;

export function initModule(container) {
  container.innerHTML = `
    <div class="dc-root">
      <button class="dc-arrow dc-arrow--left" id="dc-prev">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <a class="dc-cover-link" id="dc-link" href="#">
        <img class="dc-img" id="dc-img" src="" alt="Album Cover"/>
        <div class="dc-parental" id="dc-parental"></div>
      </a>

      <button class="dc-arrow dc-arrow--right" id="dc-next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      <div class="dc-dots" id="dc-dots">
        ${ALBUM_DB.map((_, i) => `<button class="dc-dot ${i===0?'active':''}" data-i="${i}"></button>`).join('')}
      </div>
    </div>
  `;

  renderCover('none');

  document.getElementById('dc-prev').addEventListener('click', () => go(-1));
  document.getElementById('dc-next').addEventListener('click', () => go(1));
  document.getElementById('dc-dots').addEventListener('click', e => {
    const btn = e.target.closest('.dc-dot');
    if (!btn) return;
    const i = +btn.dataset.i;
    if (i === _index) return;
    const dir = i > _index ? 'left' : 'right';
    _index = i;
    go(0, dir);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  // swipe
  const root = container.querySelector('.dc-root');
  let sx = 0;
  root.addEventListener('pointerdown', e => { sx = e.clientX; });
  root.addEventListener('pointerup',   e => {
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  });

  WASM_SIM.allocateBlock('AlbumDbIndex', 128, 'AlbumRecord*');
  WASM_SIM.log(`Loaded ${ALBUM_DB.length} album records into Heap DB`, 'info');
}

function go(delta, forcedDir) {
  if (_animating) return;
  _animating = true;
  if (delta !== 0) {
    _index = (_index + delta + ALBUM_DB.length) % ALBUM_DB.length;
    renderCover(delta > 0 ? 'left' : 'right');
  } else {
    renderCover(forcedDir);
  }
}

function renderCover(dir) {
  const album = ALBUM_DB[_index];
  const link  = document.getElementById('dc-link');

  const apply = () => {
    document.getElementById('dc-img').src = album.cover;
    document.getElementById('dc-img').alt = `${album.title} - ${album.artist}`;
    link.href = `#album-detail/${album.id}`;
    link.style.setProperty('--cover-glow', album.themeColor);

    const pa = document.getElementById('dc-parental');
    pa.innerHTML = album.hasParental
      ? `<div class="pa-badge"><span>PARENTAL</span><span style="font-size:3.5px;font-weight:900">ADVISORY</span><span style="font-size:3px">EXPLICIT CONTENT</span></div>`
      : '';

    document.querySelectorAll('.dc-dot').forEach((d,i) => d.classList.toggle('active', i === _index));
    document.documentElement.style.setProperty('--dc-accent', album.themeColor);
  };

  if (dir === 'none') {
    apply();
    _animating = false;
    return;
  }

  link.classList.add(dir === 'left' ? 'dc-exit-l' : 'dc-exit-r');
  setTimeout(() => {
    apply();
    link.classList.remove('dc-exit-l', 'dc-exit-r');
    link.classList.add(dir === 'left' ? 'dc-enter-r' : 'dc-enter-l');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      link.classList.remove('dc-enter-l', 'dc-enter-r');
      _animating = false;
    }));
  }, 200);
}
