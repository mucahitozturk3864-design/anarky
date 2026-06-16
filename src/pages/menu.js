/* ==========================================================================
   ANARKY DAW v2.0 — MENU PAGE (Ouija / Occult Edition)
   ========================================================================== */

import AudioEngine from '../../src/components/AudioEngine.js';

// ── Şeytani/Paganist sembol havuzu ───────────────────────────────────────
const DARK_GLYPHS = [
  // Elder Futhark runları
  'ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ',
  'ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ',
  // Okült semboller
  '⛧','⛤','☠','✠','⸸','☿','♄','♆','♅','Ψ','Ω','𓂀','𓆩','𓆪',
  // Alchemical
  '🜏','🜎','🜍','🜌','🜋','🜊','🜉','🜈','🜇','🜆','🜅','🜄','🜃','🜂','🜁','🜀',
  // Diğer karanlık
  '꙰','ꕥ','᛭','᚛','᚜','ᛝ','ᛣ','ᛤ','ᛥ',
  // Geometric occult
  '△','▽','◇','◈','⬡','⬢','✦','✧','⟁','⌘','⎊','⎋',
];

const ITEMS = [
  { href: '#mix',         label: 'MIX',         len: 3  },
  { href: '#beat',        label: 'BEAT',        len: 4  },
  { href: '#vokal',       label: 'VOKAL',       len: 5  },
  { href: '#discography', label: 'DISCOGRAPHY', len: 11 },
];

// Arka plana dağıtılacak okült semboller ve metinler
const BOARD_SYMBOLS = [
  '⛧','⛤','☠','⸸','☿','♄','Ψ','Ω','𓂀','ᚠ','ᚦ','ᛟ','ᛞ','ᛏ','ᛒ',
  '✠','♰','𖤐','△▽','◇◈','ᛝ','᛭','ꕥ','꙰','🜏','🜎','🜍',
  'IGNIS','AQUA','TERRA','AETHER','CAOS','TENEBRAE',
  'XIII','VII','IXXI','III','DCLXVI',
  'ᚠᚢᚦᚨ','ᚱᚲᚷᚹ','ᚺᚾᛁᛃ','ᛇᛈᛉᛊ',
  'SVB UMBRA','IN NOMINE','EX OBSCVRIS',
  '∞','⟁','⌘','⎊',
];

export function initModule(container) {
  container.innerHTML = `
    <div class="ouija-view" id="ouija-view">

      <!-- Ouija tahtası canvas arka planı -->
      <canvas class="ouija-canvas" id="ouija-canvas"></canvas>

      <!-- İçerik katmanı -->
      <div class="ouija-board-wrap">

        <!-- Üst başlık -->
        <div class="ouija-top">
          <div class="ouija-sun">☀</div>
          <div class="ouija-title-block">
            <div class="ouija-brand">ANARKY</div>
            <div class="ouija-subtitle">⛧ MYSTIFYING SOUND ORACLE ⛧</div>
          </div>
          <div class="ouija-moon">☽⛤</div>
        </div>

        <!-- Alfabe satırı -->
        <div class="ouija-alphabet">A B C D E F G H I J K L M</div>
        <div class="ouija-alphabet">N O P Q R S T U V W X Y Z</div>

        <!-- Ayırıcı -->
        <div class="ouija-divider">
          <span class="ouija-div-line"></span>
          <span class="ouija-div-orn">⛧ ᛟ ⛧</span>
          <span class="ouija-div-line"></span>
        </div>

        <!-- Navigasyon — glitchli semboller -->
        <nav class="ouija-nav">
          ${ITEMS.map((item, i) => `
            <a href="${item.href}" class="ouija-item" id="ouija-item-${i}"
               data-label="${item.label}" data-len="${item.len}"
               style="--delay:${i * 90}ms">
              <span class="ouija-item-label" id="ouija-label-${i}"></span>
            </a>
          `).join('')}
        </nav>

        <!-- Alt ayırıcı -->
        <div class="ouija-divider">
          <span class="ouija-div-line"></span>
          <span class="ouija-div-orn">⛧ ᛟ ⛧</span>
          <span class="ouija-div-line"></span>
        </div>

        <!-- Sayılar -->
        <div class="ouija-numbers">1 &nbsp;2 &nbsp;3 &nbsp;4 &nbsp;5 &nbsp;6 &nbsp;7 &nbsp;8 &nbsp;9 &nbsp;0</div>

      </div>
    </div>
  `;

  injectStyles();
  drawBoard();
  startGlitch();
  animateIn();
  bindHover();
}

/* ── Glitch motoru ──────────────────────────────────────────────────────── */
const glitchTimers   = {};
const hoverState     = {};

function randomGlyph() {
  return DARK_GLYPHS[Math.floor(Math.random() * DARK_GLYPHS.length)];
}

function scrambledText(len) {
  return Array.from({ length: len }, () => randomGlyph()).join('');
}

function startGlitch() {
  ITEMS.forEach((item, i) => {
    hoverState[i] = false;
    const el = document.getElementById(`ouija-label-${i}`);
    if (!el) return;

    // Sürekli karışık sembol döngüsü
    const tick = () => {
      if (!el.isConnected) return;
      if (!hoverState[i]) {
        el.textContent = scrambledText(item.len);
        // Bazen kısmi reveal — daha ürkütücü
        if (Math.random() < 0.06) {
          el.textContent = item.label;
          setTimeout(() => {
            if (!hoverState[i] && el.isConnected)
              el.textContent = scrambledText(item.len);
          }, 80 + Math.random() * 120);
        }
      }
      glitchTimers[i] = setTimeout(tick, 60 + Math.random() * 100);
    };
    tick();
  });
}

/* ── Hover: asıl yazıyı göster ─────────────────────────────────────────── */
function bindHover() {
  ITEMS.forEach((item, i) => {
    const link = document.getElementById(`ouija-item-${i}`);
    const el   = document.getElementById(`ouija-label-${i}`);
    if (!link || !el) return;

    link.addEventListener('mouseenter', () => {
      hoverState[i] = true;
      // Hızlı reveal animasyonu — harf harf açılıyor
      let step = 0;
      const reveal = setInterval(() => {
        let out = '';
        for (let c = 0; c < item.label.length; c++) {
          out += c <= step ? item.label[c] : randomGlyph();
        }
        el.textContent = out;
        step += 1;
        if (step >= item.label.length) {
          el.textContent = item.label;
          clearInterval(reveal);
        }
      }, 30);
      AudioEngine.playGlitchBlip?.();
    });

    link.addEventListener('mouseleave', () => {
      hoverState[i] = false;
      // Yeniden karanlığa gömülüyor
      let step = item.label.length;
      const hide = setInterval(() => {
        let out = '';
        for (let c = 0; c < item.label.length; c++) {
          out += c < step ? item.label[c] : randomGlyph();
        }
        el.textContent = out;
        step -= 1;
        if (step < 0) clearInterval(hide);
      }, 25);
    });
  });
}

/* ── Giriş animasyonu ───────────────────────────────────────────────────── */
function animateIn() {
  requestAnimationFrame(() => {
    const view = document.getElementById('ouija-view');
    if (view) setTimeout(() => view.classList.add('ouija-view--in'), 50);
    document.querySelectorAll('.ouija-item').forEach((el, i) => {
      setTimeout(() => el.classList.add('ouija-item--in'), 200 + i * 110);
    });
  });
}

/* ── Canvas: Ahşap tahta + pentagram + okült semboller ──────────────────── */
function drawBoard() {
  const canvas = document.getElementById('ouija-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const draw = () => {
    if (!canvas.isConnected) return;
    const W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    const H = canvas.height = canvas.offsetHeight || (window.innerHeight - 62);

    // ── Ahşap arka plan
    ctx.fillStyle = '#a06800';
    ctx.fillRect(0, 0, W, H);

    const woodGrad = ctx.createLinearGradient(0, 0, W, 0);
    woodGrad.addColorStop(0,    '#7a4800');
    woodGrad.addColorStop(0.08, '#b07a10');
    woodGrad.addColorStop(0.18, '#c49020');
    woodGrad.addColorStop(0.3,  '#a06800');
    woodGrad.addColorStop(0.42, '#b87818');
    woodGrad.addColorStop(0.5,  '#d0a030');
    woodGrad.addColorStop(0.6,  '#b07010');
    woodGrad.addColorStop(0.72, '#9a5e08');
    woodGrad.addColorStop(0.85, '#c08820');
    woodGrad.addColorStop(1,    '#7a4800');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Ahşap damarları
    const rng = seededRng(77);
    for (let i = 0; i < 140; i++) {
      const y     = rng() * H;
      const alpha = 0.03 + rng() * 0.1;
      const dark  = rng() > 0.55;
      ctx.strokeStyle = dark ? `rgba(30,12,0,${alpha})` : `rgba(255,220,80,${alpha * 0.5})`;
      ctx.lineWidth = 0.4 + rng() * 2.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 50) {
        ctx.lineTo(x, y + (rng() - 0.5) * 8);
      }
      ctx.stroke();
    }

    // ── Grain
    const imgData = ctx.getImageData(0, 0, W, H);
    const rng2 = seededRng(13);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (rng2() - 0.5) * 22;
      imgData.data[i]   = clamp(imgData.data[i]   + n);
      imgData.data[i+1] = clamp(imgData.data[i+1] + n * 0.85);
      imgData.data[i+2] = clamp(imgData.data[i+2] + n * 0.2);
    }
    ctx.putImageData(imgData, 0, 0);

    // ── Pentagram (büyük, ortada arka plan) ──────────────────
    drawPentagram(ctx, W / 2, H / 2, Math.min(W, H) * 0.35, 'rgba(30,8,0,0.09)');

    // ── Küçük pentagramlar köşelerde
    drawPentagram(ctx, W * 0.12, H * 0.25, 55, 'rgba(30,8,0,0.12)');
    drawPentagram(ctx, W * 0.88, H * 0.25, 55, 'rgba(30,8,0,0.12)');
    drawPentagram(ctx, W * 0.12, H * 0.75, 44, 'rgba(30,8,0,0.1)');
    drawPentagram(ctx, W * 0.88, H * 0.75, 44, 'rgba(30,8,0,0.1)');

    // ── Dağınık okült semboller / metinler
    const rng3 = seededRng(42);
    BOARD_SYMBOLS.forEach((sym) => {
      const x     = rng3() * W;
      const y     = rng3() * H;
      const angle = (rng3() - 0.5) * 0.7;
      const size  = 9 + rng3() * 22;
      const alpha = 0.06 + rng3() * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = `${rng3() > 0.4 ? 700 : 400} ${size}px "Cinzel Decorative", serif`;
      ctx.fillStyle = `rgba(20,5,0,${alpha})`;
      ctx.fillText(sym, 0, 0);
      ctx.restore();
    });

    // ── Alchemical dairesi (göz) — merkez
    drawEye(ctx, W / 2, H * 0.18, 28, 'rgba(30,8,0,0.14)');

    // ── Serpent / yılan hatları
    drawSerpent(ctx, W, H, 'rgba(30,8,0,0.07)');

    // ── Çerçeve
    const margin = 16;
    ctx.strokeStyle = 'rgba(20,6,0,0.88)';
    ctx.lineWidth   = 6;
    ctx.strokeRect(margin, margin, W - margin * 2, H - margin * 2);
    ctx.strokeStyle = 'rgba(20,6,0,0.35)';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(margin + 10, margin + 10, W - (margin + 10) * 2, H - (margin + 10) * 2);

    // ── Köşe rozetleri (genişletilmiş)
    const corners = [
      [margin + 22, margin + 22],
      [W - margin - 22, margin + 22],
      [margin + 22, H - margin - 22],
      [W - margin - 22, H - margin - 22],
    ];
    corners.forEach(([cx, cy]) => {
      drawOrnament(ctx, cx, cy, 'rgba(20,6,0,0.7)');
    });

    // ── Vignette
    const vig = ctx.createRadialGradient(W/2, H/2, H * 0.25, W/2, H/2, W * 0.72);
    vig.addColorStop(0,   'rgba(0,0,0,0)');
    vig.addColorStop(0.65,'rgba(15,5,0,0.18)');
    vig.addColorStop(1,   'rgba(5,2,0,0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  };

  draw();
  window.addEventListener('resize', draw);
}

/* ── Pentagram çizici ───────────────────────────────────────────────────── */
function drawPentagram(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.2;

  // Dış daire
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // İç daire
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // 5 köşeli yıldız (ters pentagram)
  const points = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI / 5) - Math.PI / 2; // 4/5 = ters pentagram
    points.push([cx + Math.cos(angle) * r * 0.82, cy + Math.sin(angle) * r * 0.82]);
  }
  ctx.beginPath();
  points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
  ctx.stroke();
}

/* ── Göz çizici (Eye of Horus tarzı) ───────────────────────────────────── */
function drawEye(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Işınlar
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r * 1.1, cy + Math.sin(angle) * r * 1.1);
    ctx.lineTo(cx + Math.cos(angle) * r * 1.5, cy + Math.sin(angle) * r * 1.5);
    ctx.stroke();
  }
}

/* ── Yılan / serpent eğrisi ─────────────────────────────────────────────── */
function drawSerpent(ctx, W, H, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  // Sol kenar yılanı
  ctx.beginPath();
  for (let y = H * 0.15; y < H * 0.85; y += 2) {
    const x = W * 0.06 + Math.sin((y / H) * Math.PI * 6) * 18;
    y === H * 0.15 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Sağ kenar yılanı
  ctx.beginPath();
  for (let y = H * 0.15; y < H * 0.85; y += 2) {
    const x = W * 0.94 - Math.sin((y / H) * Math.PI * 6) * 18;
    y === H * 0.15 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/* ── Köşe rozet / ornament ───────────────────────────────────────────────── */
function drawOrnament(ctx, cx, cy, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  for (let r of [18, 11, 5]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 11, cy + Math.sin(angle) * 11);
    ctx.lineTo(cx + Math.cos(angle) * 18, cy + Math.sin(angle) * 18);
    ctx.stroke();
  }
}

/* ── Yardımcılar ────────────────────────────────────────────────────────── */
function clamp(v) { return Math.min(255, Math.max(0, v)); }

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/* ── Stiller ────────────────────────────────────────────────────────────── */
function injectStyles() {
  if (!document.getElementById('ouija-font')) {
    const link = document.createElement('link');
    link.id   = 'ouija-font';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;600;900&display=swap';
    document.head.appendChild(link);
  }
  if (document.getElementById('ouija-styles')) return;
  const s = document.createElement('style');
  s.id = 'ouija-styles';
  s.textContent = `
    .ouija-view {
      position: relative;
      width: 100%;
      height: calc(100vh - 62px);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      opacity: 0;
      transition: opacity 1s ease;
    }
    .ouija-view--in { opacity: 1; }

    .ouija-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    .ouija-board-wrap {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 100%;
      max-width: 920px;
      padding: 16px 60px;
    }

    /* ── Üst ── */
    .ouija-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 2px;
    }
    .ouija-sun, .ouija-moon {
      font-size: 48px;
      line-height: 1;
      color: #1a0800;
      opacity: 0.8;
      filter: drop-shadow(0 2px 5px rgba(0,0,0,0.4));
    }
    .ouija-moon { letter-spacing: -6px; }

    .ouija-title-block { text-align: center; }

    .ouija-brand {
      font-family: 'Cinzel Decorative', Georgia, serif;
      font-size: clamp(26px, 4.2vw, 50px);
      font-weight: 900;
      color: #1a0800;
      letter-spacing: 12px;
      text-shadow:
        1px 1px 0 rgba(255,200,60,0.25),
        0 2px 8px rgba(0,0,0,0.35);
    }
    .ouija-subtitle {
      font-family: 'Cinzel', Georgia, serif;
      font-size: clamp(8px, 1vw, 12px);
      letter-spacing: 3px;
      color: #1a0800;
      opacity: 0.65;
      margin-top: 2px;
    }

    /* ── Alfabe ── */
    .ouija-alphabet {
      font-family: 'Cinzel Decorative', Georgia, serif;
      font-size: clamp(13px, 2vw, 22px);
      font-weight: 700;
      letter-spacing: clamp(4px, 1vw, 11px);
      color: #1a0800;
      opacity: 0.5;
      text-align: center;
      width: 100%;
      line-height: 1.1;
    }

    /* ── Ayırıcı ── */
    .ouija-divider {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 10px;
      margin: 4px 0;
    }
    .ouija-div-line {
      flex: 1;
      height: 1.5px;
      background: rgba(26,8,0,0.5);
    }
    .ouija-div-orn {
      font-size: 13px;
      color: rgba(26,8,0,0.55);
      letter-spacing: 5px;
      white-space: nowrap;
    }

    /* ── Nav ── */
    .ouija-nav {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    /* ── Satır ── */
    .ouija-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 8px 0;
      text-decoration: none;
      border-bottom: 1px solid rgba(26,8,0,0.2);
      position: relative;
      cursor: pointer;
      opacity: 0;
      transform: translateY(10px);
      transition:
        opacity 0.55s cubic-bezier(0.16,1,0.3,1),
        transform 0.55s cubic-bezier(0.16,1,0.3,1),
        background 0.3s ease;
      transition-delay: var(--delay, 0ms);
    }
    .ouija-item:first-child { border-top: 1px solid rgba(26,8,0,0.2); }
    .ouija-item--in { opacity: 1; transform: translateY(0); }

    .ouija-item::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(26,8,0,0.1);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .ouija-item:hover::before { opacity: 1; }

    /* ── Glitch / Sembol yazısı ── */
    .ouija-item-label {
      font-family: 'Cinzel Decorative', Georgia, serif;
      font-size: clamp(20px, 3.2vw, 40px);
      font-weight: 900;
      letter-spacing: clamp(4px, 1.2vw, 12px);
      color: #1a0800;
      text-align: center;
      min-width: 320px;
      min-height: 1.2em;
      display: inline-block;
      text-shadow:
        0 1px 0 rgba(255,200,60,0.15),
        0 2px 6px rgba(0,0,0,0.25);
      transition:
        letter-spacing 0.4s cubic-bezier(0.16,1,0.3,1),
        text-shadow 0.3s ease;
      /* Glitch animasyonu */
      animation: glitchShake 4s infinite;
    }

    /* Hover: asıl yazı — daha büyük ve belirgin */
    .ouija-item:hover .ouija-item-label {
      letter-spacing: clamp(8px, 2vw, 20px);
      text-shadow:
        1px 1px 0 rgba(255,220,100,0.35),
        0 0 18px rgba(255,180,40,0.25),
        0 4px 14px rgba(0,0,0,0.3);
      animation: none;
    }

    @keyframes glitchShake {
      0%,90%,100% { transform: translate(0); filter: none; }
      91%  { transform: translate(-1px, 1px); filter: hue-rotate(10deg); }
      92%  { transform: translate(1px, -1px); }
      93%  { transform: translate(-2px, 0);   filter: brightness(1.1); }
      94%  { transform: translate(2px, 1px); }
      95%  { transform: translate(0, 0); filter: none; }
    }

    /* ── Sayılar ── */
    .ouija-numbers {
      font-family: 'Cinzel Decorative', Georgia, serif;
      font-size: clamp(12px, 1.7vw, 20px);
      font-weight: 700;
      letter-spacing: clamp(3px, 0.9vw, 9px);
      color: #1a0800;
      opacity: 0.48;
      text-align: center;
    }
  `;
  document.head.appendChild(s);
}
