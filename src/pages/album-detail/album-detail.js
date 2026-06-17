/* ==========================================================================
   ANARKY DAW v2.0 — ALBUM DETAIL MODULE
   ========================================================================== */

import { ALBUM_DB } from '../discography/discography.js';
import AudioEngine   from '../../components/AudioEngine.js';
import { WASM_SIM } from '../../../wasm/wasm_sim.js';

let _album           = null;
let _canvasAnimId    = null;
let _synthInterval   = null;
let _playingTrackIdx = -1;

const COLLAGE = {
  'eminem-mmlp': [],
  'ye-graduation': [
    { cls:'info', html:`<b style="color:var(--theme-accent)">THE BEAR</b><br><br>Takashi Murakami visual assets. Star dust layers.` },
    { cls:'center big', html:`<span style="font-size:24px;font-weight:bold;color:var(--theme-accent);">GRADUATE</span>` },
    { cls:'mono', html:`<h4 style="color:#fff;margin-bottom:6px;">STRONGER.WAV</h4>Synth Mode: Daft Punk vocoder<br>BPM: 104` },
    { cls:'quote', html:`"I WONDER IF YOU KNOW WHAT IT MEANS TO FIND YOUR DREAMS"` },
  ],
  'mavi-veritas': [
    { cls:'info', html:`<b style="color:var(--theme-accent)">VERITAS STACK</b><br><br>Marble carvings mixed with raw digital drum patterns.` },
    { cls:'center big', html:`<span style="font-size:40px;">🏛</span>` },
    { cls:'mono', html:`<h4 style="color:#fff;margin-bottom:6px;">ANILAR.DSP</h4>Buffer allocation: 1024B<br>Sample scale: 32-bit Float` },
    { cls:'quote', html:`"Gerçekler ağır gelir, hayaller ise uçup gider."` },
  ],
  'hayko-sandik': [
    { cls:'info', html:`<b style="color:var(--theme-accent)">SANDIK BLOCK</b><br><br>Industrial gothic metal elements with sharp distorted feedback.` },
    { cls:'center big', html:`<span style="font-size:44px;color:var(--theme-accent);">⚔</span>` },
    { cls:'mono', html:`<h4 style="color:#fff;margin-bottom:6px;">BALIK.C</h4>struct AudioChannel<br>Distortion: 45x overdrive` },
    { cls:'quote', html:`"BİR KİLİT VURDUM SANDIĞIMA, KİMSE AÇAMAZ"` },
  ],
  'slipknot-verses': [
    { cls:'info', html:`<b style="color:var(--theme-accent)">SUBLIMINAL</b><br><br>Rusted steel bars, distressed strings, high volume sweeps.` },
    { cls:'center big', html:`<span style="font-size:32px;color:var(--theme-accent);font-weight:900;">[ 9 ]</span>` },
    { cls:'mono', html:`<h4 style="color:#fff;margin-bottom:6px;">DUALITY.DSP</h4>Heap sector: 0x09FCA<br>Filter: Lowpass 600Hz` },
    { cls:'quote', html:`"I PUSH MY FINGERS INTO MY EYES"` },
  ],
  'motive-taycan': [
    { cls:'info', html:`<b style="color:var(--theme-accent)">CHROME SHIELD</b><br><br>Luxury speed slides, sport dashboard lines, and heavy sub bass.` },
    { cls:'center big', html:`<span style="font-size:26px;color:#fff;font-weight:bold;letter-spacing:4px;">V 12</span>` },
    { cls:'mono', html:`<h4 style="color:#fff;margin-bottom:6px;">TAYCAN.WAV</h4>Sub frequency: 32Hz<br>Comp threshold: -12dB` },
    { cls:'quote', html:`"Altımda Taycan, arkamda sirenler, gidiyoruz son gaz."` },
  ],
  'ezhel-muptezhel': [
    { cls:'info', html:`<b style="color:var(--theme-accent)">ANATOLIAN URBAN</b><br><br>Concrete brick designs, smoke outlines, and reggae-rap delays.` },
    { cls:'center big', html:`<span style="font-size:40px;color:var(--theme-accent);">☀</span>` },
    { cls:'mono', html:`<h4 style="color:#fff;margin-bottom:6px;">GECELER.DSP</h4>Delay time: 0.38s<br>Vocal AutoTune: 90%` },
    { cls:'quote', html:`"GECELER SENSİZ BİR MÜPTEZEL OLUR"` },
  ],
  'kendrick-damn': [
    { cls:'info', html:`<b style="color:var(--theme-accent)">PULITZER SECTOR</b><br><br>Conscious hip-hop, direct clean mix, and heavy thematic topics.` },
    { cls:'center big', html:`<span style="font-size:44px;font-weight:bold;color:var(--theme-accent);font-family:serif;">D.</span>` },
    { cls:'mono', html:`<h4 style="color:#fff;margin-bottom:6px;">HUMBLE.C</h4>WASM Vector: active<br>LFO sweep: disengaged` },
    { cls:'quote', html:`"BE HUMBLE. SIT DOWN."` },
  ],
};

const SYNTH_PRESETS = {
  'eminem-mmlp':    { scale:[55,65.4,73.4,82.4,98.0,110.0],  type:'sawtooth', bpm:95 },
  'ye-graduation':  { scale:[130.8,146.8,164.8,196.0,220.0,261.6], type:'triangle', bpm:104 },
  'mavi-veritas':   { scale:[146.8,164.8,174.6,220.0,293.7,329.6], type:'triangle', bpm:130 },
  'hayko-sandik':   { scale:[82.4,87.3,110.0,116.5,123.5],    type:'sawtooth', bpm:115 },
  'slipknot-verses':{ scale:[41.2,55.0,73.4,77.8,82.4],       type:'sawtooth', bpm:140 },
  'motive-taycan':  { scale:[32.7,36.7,41.2,55.0],            type:'sine',     bpm:135 },
  'ezhel-muptezhel':{ scale:[110.0,123.5,130.8,164.8,220.0],  type:'triangle', bpm:90 },
  'kendrick-damn':  { scale:[110,146.8,196,220,293.7],         type:'sine',     bpm:84 },
};

export function initModule(container, params) {
  const albumId = params[1];
  _album = ALBUM_DB.find(a => a.id === albumId);

  if (!_album) {
    container.innerHTML = `<div style="padding:50px;text-align:center;font-family:var(--font-mono);"><h2 style="color:var(--accent-red)">ALBUM NOT FOUND</h2><a href="#discography" style="display:inline-block;margin-top:30px;border:1px solid var(--accent-red);padding:10px 20px;text-decoration:none;color:#fff;">RETURN TO ARCHIVE</a></div>`;
    return;
  }

  const themeLink = document.getElementById('album-theme-styles');
  if (themeLink) {
    const themeName = _album.themeFile || `theme-${_album.id.split('-')[1]}`;
    themeLink.href = `src/styles/${themeName}.css?v=${Date.now()}`;
  }

  if (_album.id === 'eminem-mmlp') {
    container.innerHTML = buildMMLPHTML();
    bindMMLPTracks();
    initBgCanvas();
  } else if (_album.id === 'ye-graduation') {
    container.innerHTML = buildGraduationHTML();
    bindGraduationTracks();
    initBgCanvas();
  } else if (_album.id === 'mavi-veritas') {
    container.innerHTML = buildVeritasHTML();
    bindVeritasTracks();
    initBgCanvas();
  } else if (_album.id === 'hayko-sandik') {
    container.innerHTML = buildSandikHTML();
    bindSandikTracks();
    initBgCanvas();
  } else if (_album.id === 'slipknot-verses') {
    container.innerHTML = buildSlipknotHTML();
    bindSlipknotTracks();
    initBgCanvas();
  } else {
    container.innerHTML = buildHTML();
    renderTracks();
    renderCollage();
    initBgCanvas();
  }

  WASM_SIM.allocateBlock(`AlbumData_${albumId.replace('-','_')}`, 1024, 'AlbumData*');
  WASM_SIM.triggerAccess(`AlbumData_${albumId.replace('-','_')}`, 'read');
  WASM_SIM.log(`Album detail loaded: ${_album.title}`, 'success');
  window.addEventListener('hashchange', _cleanup, { once: true });
}

/* ══════════════════════════════════════════════════════════════════
   MMLP — Chaotic Scrawl Page
══════════════════════════════════════════════════════════════════ */
function buildMMLPHTML() {
  // All scattered text fragments
  const scrawls = [
    // Top-left area
    { text: 'MY NAME IS...', x:3,  y:5,  rot:-8,  size:28, op:0.9, bold:true },
    { text: 'will the real slim shady', x:1,  y:9,  rot:2,   size:13, op:0.6 },
    { text: 'please stand up', x:5,  y:12, rot:-3,  size:13, op:0.55 },
    { text: 'DETROIT', x:2,  y:17, rot:-12, size:42, op:0.12, bold:true },
    { text: 'I am whatever you say I am', x:1,  y:22, rot:4,   size:11, op:0.7, italic:true },
    { text: 'if I wasn\'t then why would you say I am', x:2,  y:25, rot:-2,  size:10, op:0.5, italic:true },
    { text: 'KILL YOU', x:3,  y:31, rot:7,   size:16, op:0.85, bold:true },
    { text: 'STAN', x:3,  y:42, rot:-1,  size:14, op:0.8, bold:true },
    { text: 'May 23, 2000', x:2,  y:47, rot:-6,  size:10, op:0.45 },
    { text: '1.76 MILLION', x:1,  y:51, rot:5,   size:14, op:0.7, bold:true },
    { text: 'first week sales', x:4,  y:54, rot:-2,  size:9,  op:0.4 },
    { text: 'CRIMINAL', x:2,  y:59, rot:9,   size:17, op:0.8, bold:true },
    { text: 'I\'m not afraid', x:1,  y:64, rot:-4,  size:13, op:0.6 },
    { text: 'AFTERMATH', x:3,  y:70, rot:-7,  size:11, op:0.4 },
    { text: 'DR. DRE', x:1,  y:74, rot:3,   size:13, op:0.55, bold:true },
    { text: 'the way I am', x:2,  y:79, rot:-5,  size:16, op:0.75, italic:true },
    { text: '18× PLATINUM', x:1,  y:84, rot:6,   size:11, op:0.5, bold:true },
    { text: 'BEST RAP ALBUM', x:2,  y:89, rot:-3,  size:10, op:0.45 },
    { text: 'GRAMMY 2001', x:3,  y:93, rot:4,   size:10, op:0.4 },

    // Right area
    { text: 'MARSHALL BRUCE MATHERS III', x:58, y:4,  rot:3,   size:11, op:0.5 },
    { text: 'EMINEM', x:65, y:8,  rot:-5,  size:36, op:0.9, bold:true },
    { text: 'slim shady', x:62, y:15, rot:8,   size:15, op:0.55, italic:true },
    { text: 'DRUG BALLAD', x:60, y:21, rot:-4,  size:14, op:0.7, bold:true },
    { text: 'AMITYVILLE', x:68, y:26, rot:6,   size:12, op:0.65, bold:true },
    { text: 'STAN', x:63, y:31, rot:-9,  size:22, op:0.85, bold:true },
    { text: 'I\'m back', x:72, y:37, rot:4,   size:18, op:0.7, bold:true },
    { text: 'BITCH PLEASE II', x:58, y:43, rot:-6,  size:12, op:0.75, bold:true },
    { text: 'Snoop · Xzibit · Nate Dogg', x:60, y:47, rot:3,   size:9,  op:0.45 },
    { text: 'KIM', x:70, y:53, rot:-11, size:30, op:0.9, bold:true },
    { text: 'WHO KNEW', x:60, y:61, rot:5,   size:14, op:0.7, bold:true },
    { text: 'UNDER THE INFLUENCE', x:58, y:67, rot:-3,  size:11, op:0.65, bold:true },
    { text: 'D12', x:72, y:72, rot:7,   size:20, op:0.7, bold:true },
    { text: 'REMEMBER ME?', x:60, y:79, rot:-5,  size:12, op:0.65, bold:true },
    { text: 'RBX · Sticky Fingaz', x:61, y:82, rot:2,   size:9,  op:0.4 },
    { text: 'NME 9.9/10', x:63, y:87, rot:-7,  size:11, op:0.5 },
    { text: 'Metacritic 96', x:68, y:91, rot:4,   size:10, op:0.45 },
    { text: '#279 Rolling Stone', x:60, y:95, rot:-2,  size:9,  op:0.4 },

    // Middle sparse
    { text: 'THE REAL SLIM SHADY', x:30, y:3,  rot:-2,  size:14, op:0.7, bold:true },
    { text: 'marshall mathers', x:28, y:7,  rot:4,   size:11, op:0.5, italic:true },
    { text: 'WHO KNEW', x:35, y:75, rot:-8,  size:13, op:0.6, bold:true },
    { text: 'public service announcement', x:28, y:80, rot:3,   size:9,  op:0.4 },
    { text: 'INTERSCOPE', x:33, y:85, rot:-5,  size:10, op:0.35 },
    { text: 'hardcore hip-hop', x:30, y:90, rot:6,   size:9,  op:0.35, italic:true },
    { text: '70 MINUTES', x:34, y:94, rot:-3,  size:10, op:0.4 },
    { text: '16 TRACKS', x:28, y:97, rot:5,   size:10, op:0.4 },

    // Extra clutter
    { text: 'hailie', x:7,  y:3,  rot:15,  size:10, op:0.3, italic:true },
    { text: 'Detroit, Michigan', x:55, y:97, rot:-3,  size:9,  op:0.3 },
    { text: '#1 BILLBOARD 200', x:48, y:5,  rot:7,   size:11, op:0.5, bold:true },
    { text: '32 million copies', x:46, y:9,  rot:-4,  size:10, op:0.4 },
    { text: 'PARENTAL ADVISORY', x:45, y:13, rot:2,   size:9,  op:0.3 },
  ];

  const scrawlHTML = scrawls.map(s => `
    <div class="mmlp-scrawl" style="
      left:${s.x}%;
      top:${s.y}%;
      transform:rotate(${s.rot}deg);
      font-size:${s.size}px;
      opacity:${s.op};
      font-weight:${s.bold ? '900' : '400'};
      font-style:${s.italic ? 'italic' : 'normal'};
    ">${s.text}</div>
  `).join('');

  const tracks = [
    { title:'Kill You',              spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'Stan',                  spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'Who Knew',              spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'The Way I Am',          spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'The Real Slim Shady',   spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:"Remember Me?",          spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:"I'm Back",              spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'Marshall Mathers',      spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'Drug Ballad',           spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'Amityville',            spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'Bitch Please II',       spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'Kim',                   spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'Under the Influence',   spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
    { title:'Criminal',              spotify:'https://open.spotify.com/intl-tr/album/6t7956yu5zYf5A829XRiHC' },
  ];

  // positions for tracks - scattered in the center-right area
  const trackPositions = [
    { x:29, y:20, rot:-3  }, { x:32, y:25, rot:5   }, { x:27, y:30, rot:-7  },
    { x:34, y:35, rot:2   }, { x:28, y:40, rot:-4  }, { x:33, y:45, rot:8   },
    { x:26, y:50, rot:-2  }, { x:35, y:55, rot:-6  }, { x:29, y:60, rot:4   },
    { x:31, y:65, rot:-5  }, { x:27, y:68, rot:3   }, { x:33, y:71, rot:-8  },
    { x:28, y:74, rot:6   }, { x:32, y:77, rot:-3  },
  ];

  const trackHTML = tracks.map((t, i) => {
    const p = trackPositions[i] || { x: 28 + (i%3)*4, y: 20 + i*4, rot: (i%5)-2 };
    return `
      <div class="mmlp-track-scrawl" data-index="${i}" style="
        left:${p.x}%;
        top:${p.y}%;
        transform:rotate(${p.rot}deg);
      ">
        <span class="mmlp-track-num">${String(i+1).padStart(2,'0')}</span>
        <span class="mmlp-track-name">${t.title}</span>
        <button class="mmlp-play-btn" data-index="${i}" data-spotify="${t.spotify}">▶</button>
      </div>
    `;
  }).join('');

  return `
  <div class="mmlp-page">

    <!-- ═══ PART 1: CHAOS ZONE (viewport height) ═══ -->
    <div class="mmlp-chaos">
      <canvas class="detail-bg-canvas" id="detail-bg-canvas"></canvas>

      <a href="#discography" class="mmlp-back-btn">← BACK</a>

      ${scrawlHTML}

      <!-- Album cover -->
      <div class="mmlp-cover-block">
        <img src="assets/images/cover-mmlp.jpg" alt="MMLP" class="mmlp-cover-img"/>
        <div class="mmlp-parental-badge">
          <span>PARENTAL</span>
          <span style="font-size:4px;font-weight:900">ADVISORY</span>
          <span style="font-size:3.5px">EXPLICIT CONTENT</span>
        </div>
      </div>

      <!-- Scattered track list -->
      <div class="mmlp-tracks-chaos" id="mmlp-tracks">
        <div class="mmlp-tracklist-label">TRACKLIST</div>
        ${trackHTML}
      </div>

      <div class="mmlp-big-stamp">MMLP</div>

      <!-- Scroll hint -->
      <div class="mmlp-scroll-hint">↓ scroll</div>
    </div>

    <!-- ═══ PART 2: CONTENT (scrollable below) ═══ -->
    <div class="mmlp-content">

      <!-- Photo strip row 1 -->
      <div class="mmlp-photo-strip">
        <div class="mmlp-photo-frame mmlp-pf-lg" style="transform:rotate(-2deg)">
          <img src="assets/images/mmlp-photo-1.jpg" alt="Eminem"/>
        </div>
        <div class="mmlp-photo-frame" style="transform:rotate(3deg)">
          <img src="assets/images/mmlp-photo-2.jpg" alt="Eminem"/>
        </div>
        <div class="mmlp-photo-frame mmlp-pf-lg" style="transform:rotate(-1deg)">
          <img src="assets/images/mmlp-photo-3.jpg" alt="Eminem"/>
        </div>
        <div class="mmlp-photo-frame" style="transform:rotate(4deg)">
          <img src="assets/images/mmlp-photo-4.jpg" alt="Eminem"/>
        </div>
      </div>

      <!-- BACKGROUND section -->
      <div class="mmlp-wiki-section">
        <div class="mmlp-wiki-label">— BACKGROUND</div>
        <div class="mmlp-wiki-body">
          <p>
            Inspired by the disappointment of his debut album <em>Infinite</em> (1996), Eminem created the alter ego 
            <strong>Slim Shady</strong>, introduced on the <em>Slim Shady EP</em> (1997). After placing second in the 
            annual Rap Olympics, Eminem was noticed by Interscope CEO <strong>Jimmy Iovine</strong>, who played 
            the EP for Dr. Dre — and the rest is history.
          </p>
          <p>
            <em>The Marshall Mathers LP</em> delivers introspective lyricism reflecting Eminem's thoughts on his 
            sudden rise to fame, harsh criticism of his music, and estrangement from his family. As a transgressive 
            work, it incorporates hardcore hip-hop, satirical hip-hop, and horrorcore.
          </p>
        </div>
        <div class="mmlp-wiki-photo-right">
          <div class="mmlp-photo-frame" style="transform:rotate(-3deg)">
            <img src="assets/images/mmlp-photo-5.jpg" alt="Eminem"/>
          </div>
        </div>
      </div>

      <!-- Photo row 2 -->
      <div class="mmlp-photo-strip mmlp-strip-reversed">
        <div class="mmlp-photo-frame" style="transform:rotate(2deg)">
          <img src="assets/images/mmlp-photo-6.jpg" alt="Eminem"/>
        </div>
        <div class="mmlp-photo-frame mmlp-pf-lg" style="transform:rotate(-4deg)">
          <img src="assets/images/mmlp-photo-7.jpg" alt="Eminem"/>
        </div>
      </div>

      <!-- RECORDING section -->
      <div class="mmlp-wiki-section mmlp-wiki-alt">
        <div class="mmlp-wiki-label">— RECORDING</div>
        <div class="mmlp-wiki-body">
          <p>
            Recorded over a <strong>10-month period</strong> from September 1998 through March 2000, sessions 
            took place at The Mix Room and Encore in Burbank, Larrabee Sound in Hollywood, 
            Chung King in New York, Record Plant in Los Angeles, and 54 Sound in <strong>Detroit</strong>.
          </p>
          <p>
            Production was handled by <strong>Dr. Dre</strong>, <strong>Mel-Man</strong>, <strong>F.B.T.</strong> (Bass Brothers), 
            <strong>Eminem</strong>, and <strong>The 45 King</strong>. The album features guest appearances from Dido, RBX, 
            Sticky Fingaz, Dina Rae, Bizarre, Dr. Dre, Snoop Dogg, Xzibit, Nate Dogg, and D12.
          </p>
        </div>
        <div class="mmlp-wiki-stats">
          <div class="mmlp-stat-pill"><span class="mmlp-sp-val">10</span><span class="mmlp-sp-lab">MONTHS RECORDED</span></div>
          <div class="mmlp-stat-pill"><span class="mmlp-sp-val">6</span><span class="mmlp-sp-lab">STUDIOS</span></div>
          <div class="mmlp-stat-pill"><span class="mmlp-sp-val">5</span><span class="mmlp-sp-lab">PRODUCERS</span></div>
        </div>
      </div>

      <!-- BIG QUOTE -->
      <div class="mmlp-big-quote">
        <span class="mmlp-bq-mark">"</span>
        <blockquote>I am whatever you say I am. If I wasn't, then why would you say I am?</blockquote>
        <cite>— The Way I Am</cite>
      </div>

      <!-- COMMERCIAL + CRITICAL -->
      <div class="mmlp-wiki-section">
        <div class="mmlp-wiki-label">— COMMERCIAL PERFORMANCE</div>
        <div class="mmlp-wiki-body">
          <p>
            The album debuted at <strong>#1 on the Billboard 200</strong>, staying atop for eight consecutive weeks. 
            It sold <strong>1.76 million copies</strong> in its first week — the second-most first-week sales in 
            US history at the time, and fastest-selling rap album.
          </p>
          <p>
            Widely regarded as Eminem's best work, it has sold <strong>25+ million copies worldwide</strong> and is 
            certified <strong>12× Platinum</strong> by the RIAA. It was nominated for Grammy Album of the Year and 
            won <strong>Best Rap Album at the 2001 Grammy Awards</strong>, while "The Real Slim Shady" won 
            Best Rap Solo Performance.
          </p>
        </div>
        <div class="mmlp-big-numbers">
          <div class="mmlp-bn"><span>1.76M</span>first week copies</div>
          <div class="mmlp-bn"><span>25M+</span>worldwide sales</div>
          <div class="mmlp-bn"><span>12×</span>RIAA Platinum</div>
          <div class="mmlp-bn"><span>8</span>weeks #1</div>
        </div>
      </div>

      <!-- Photo row 3 -->
      <div class="mmlp-photo-strip">
        <div class="mmlp-photo-frame mmlp-pf-lg" style="transform:rotate(1deg)">
          <img src="assets/images/mmlp-photo-8.jpg" alt="Eminem"/>
        </div>
        <div class="mmlp-photo-frame" style="transform:rotate(-3deg)">
          <img src="assets/images/mmlp-photo-9.jpg" alt="Eminem"/>
        </div>
      </div>

      <!-- LEGACY section -->
      <div class="mmlp-wiki-section mmlp-wiki-alt">
        <div class="mmlp-wiki-label">— LEGACY & CONTROVERSIES</div>
        <div class="mmlp-wiki-body">
          <p>
            Like its predecessor <em>The Slim Shady LP</em>, the album was surrounded by significant controversy. 
            Criticism centered on lyrics that were considered violent, homophobic, and misogynistic, as well 
            as references to the Columbine High School massacre. Future second lady <strong>Lynne Cheney</strong> 
            criticized the lyrics at a United States Senate hearing; the Canadian government considered 
            refusing Eminem entry into the country.
          </p>
          <p>
            Despite the controversies, <em>The Marshall Mathers LP</em> received positive reviews, and in the years 
            since has received even greater critical acclaim. It was included in <em>Rolling Stone</em>'s list of the 
            <strong>500 Greatest Albums of All Time</strong> just three years after release. The word <strong>"stan"</strong> — 
            coined by the song about an obsessive fan — is now officially in the Oxford English Dictionary.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mmlp-footer-strip">
        AFTERMATH ENTERTAINMENT · INTERSCOPE RECORDS · MAY 23, 2000 · DETROIT, MICHIGAN
      </div>

    </div>
  </div>
  `;
}

function bindMMLPTracks() {
  document.getElementById('mmlp-tracks')?.querySelectorAll('.mmlp-track-scrawl').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation();
      const btn = row.querySelector('.mmlp-play-btn');
      if (btn) {
        toggleTrack(parseInt(btn.dataset.index), btn.dataset.spotify);
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   KANYE WEST — Graduation Pop Page
   ══════════════════════════════════════════════════════════════════ */
function buildGraduationHTML() {
  const tracks = [
    { title: 'Good Morning',          spotify: 'https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3' },
    { title: 'Champion',              spotify: 'https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3' },
    { title: 'Stronger',              spotify: 'https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3' },
    { title: 'I Wonder',              spotify: 'https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3' },
    { title: 'Good Life',             spotify: 'https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3' },
    { title: "Can't Tell Me Nothing", spotify: "https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3" },
    { title: 'Barry Bonds',           spotify: 'https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3' },
    { title: 'Flashing Lights',       spotify: 'https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3' },
    { title: 'Everything I Am',       spotify: 'https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3' },
    { title: 'Homecoming',            spotify: 'https://open.spotify.com/intl-tr/album/4SZko61aMnmgvNhfhgTuD3' },
  ];

  // Easter eggs scattered left/right fixed relative to screen margins
  const trackPositions = [
    { side: 'left',  offset: 2, y: 15, rot: -3 },  // Good Morning
    { side: 'right', offset: 2, y: 22, rot: 4  },  // Champion
    { side: 'left',  offset: 3, y: 32, rot: -5 },  // Stronger
    { side: 'right', offset: 3, y: 40, rot: 2  },  // I Wonder
    { side: 'left',  offset: 2, y: 50, rot: -2 },  // Good Life
    { side: 'right', offset: 2, y: 58, rot: 5  },  // Can't Tell Me Nothing
    { side: 'left',  offset: 4, y: 68, rot: -4 },  // Barry Bonds
    { side: 'right', offset: 3, y: 76, rot: 3  },  // Flashing Lights
    { side: 'left',  offset: 3, y: 84, rot: -6 },  // Everything I Am
    { side: 'right', offset: 4, y: 90, rot: 1  },  // Homecoming
  ];

  const trackHTML = tracks.map((t, i) => {
    const p = trackPositions[i];
    const sideAttr = p.side === 'left' ? `left: ${p.offset}vw;` : `right: ${p.offset}vw;`;
    return `
      <div class="ye-track-scrawl" data-index="${i}" data-spotify="${t.spotify}" style="
        ${sideAttr}
        top: ${p.y}vh;
        transform: rotate(${p.rot}deg);
      ">
        <span class="ye-track-num-lbl">${String(i + 1).padStart(2, '0')}</span>
        <span class="ye-track-name-lbl">${t.title}</span>
        <button class="ye-track-btn">▶</button>
      </div>
    `;
  }).join('');

  return `
  <div class="ye-page" id="ye-tracks">
    <a href="#discography" class="ye-back-btn">← BACK TO ARCHIVE</a>
    
    <div class="ye-easter-egg-container">
      ${trackHTML}
    </div>

    <!-- ═══ CONTENT ZONE ═══ -->
    <div class="ye-content">
      
      <div class="ye-header-simple">
        <div class="ye-artist-lbl">Kanye West</div>
        <h1 class="ye-album-lbl">Graduation</h1>
      </div>

      <!-- Responsive Tracklist Grid (Visible on smaller viewports) -->
      <div class="ye-responsive-tracklist">
        <h2 class="ye-section-title">ALBUM TRACKS</h2>
        <div class="ye-tracks-grid">
          ${tracks.map((t, i) => `
            <div class="ye-grid-track-row" data-index="${i}" data-spotify="${t.spotify}">
              <span class="ye-grid-track-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="ye-grid-track-name">${t.title}</span>
              <button class="ye-grid-play-btn">▶ PLAY</button>
            </div>
          `).join('')}
        </div>
      </div>

      <h2 class="ye-section-title">THE COLLEGE TRILOGY CULMINATION</h2>
      <div class="ye-info-card">
        <p>
          Released on <strong>September 11, 2007</strong>, <em>Graduation</em> is the legendary third studio album by rapper-producer <strong>Kanye West</strong>. 
          It represents the final conceptual installment of his school-themed trilogy, completing the educational arc started with <em>The College Dropout</em> (2004) 
          and continued through <em>Late Registration</em> (2005).
        </p>
        <p>
          Lyrically, the album focuses on West's transition into global superstardom, grappling with media attention, creative freedom, 
          and his place in culture. It is a celebratory victory lap capturing his graduation into an legendary icon.
        </p>
      </div>

      <!-- Photo strip row 1 -->
      <div class="ye-photo-strip">
        <div class="ye-photo-frame ye-pf-lg" style="transform:rotate(-4deg)">
          <img src="assets/images/grad-photo-1.jpg" alt="Ye"/>
        </div>
        <div class="ye-photo-frame" style="transform:rotate(5deg)">
          <img src="assets/images/grad-photo-2.jpg" alt="Ye"/>
        </div>
        <div class="ye-photo-frame ye-pf-lg" style="transform:rotate(-2deg)">
          <img src="assets/images/grad-photo-3.jpg" alt="Ye"/>
        </div>
        <div class="ye-photo-frame" style="transform:rotate(6deg)">
          <img src="assets/images/grad-photo-4.jpg" alt="Ye"/>
        </div>
      </div>

      <div class="ye-split-grid">
        <div>
          <h2 class="ye-section-title">THE STADIUM SYNTH SHIFT</h2>
          <div class="ye-info-card" style="margin-bottom:0;">
            <p>
              Seeking to step away from his signature pitch-shifted soul sampling, Kanye designed <em>Graduation</em> specifically to be played in massive sports stadiums. 
              He drew inspiration from arena rock bands like <strong>U2</strong> and the <strong>Rolling Stones</strong>, as well as electronic dance music and house (collaborating with <strong>Daft Punk</strong> on the hit single <em>Stronger</em>).
            </p>
            <p>
              Integrating synthesizers, vocoders, and driving beats, the album single-handedly brought electronic music into mainstream American rap.
            </p>
          </div>
        </div>

        <div>
          <h2 class="ye-section-title">COMMERCIAL STRENGTH</h2>
          <div class="ye-mini-stats">
            <div class="ye-mini-stat-badge">
              <span class="ye-ms-val">957K</span>
              <span class="ye-ms-lbl">FIRST WEEK COPIES</span>
            </div>
            <div class="ye-mini-stat-badge">
              <span class="ye-ms-val">7× Platinum</span>
              <span class="ye-ms-lbl">RIAA CERTIFICATE</span>
            </div>
            <div class="ye-mini-stat-badge">
              <span class="ye-ms-val">3 Grammy</span>
              <span class="ye-ms-lbl">AWARDS WINNER</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Photo strip row 2 -->
      <div class="ye-photo-strip ye-strip-reversed">
        <div class="ye-photo-frame" style="transform:rotate(-3deg)">
          <img src="assets/images/grad-photo-5.jpg" alt="Ye"/>
        </div>
        <div class="ye-photo-frame ye-pf-lg" style="transform:rotate(2deg)">
          <img src="assets/images/grad-photo-6.jpg" alt="Ye"/>
        </div>
      </div>

      <div class="ye-pop-quote">
        <blockquote>"I wonder if you know what it means to find your dreams."</blockquote>
        <cite>— I Wonder</cite>
      </div>

      <!-- Photo strip row 3 -->
      <div class="ye-photo-strip">
        <div class="ye-photo-frame ye-pf-lg" style="transform:rotate(4deg)">
          <img src="assets/images/grad-photo-7.jpg" alt="Ye"/>
        </div>
        <div class="ye-photo-frame" style="transform:rotate(-5deg)">
          <img src="assets/images/grad-photo-8.jpg" alt="Ye"/>
        </div>
      </div>

      <h2 class="ye-section-title">THE SEPTEMBER 11 SALES FACE-OFF</h2>
      <div class="ye-info-card">
        <p>
          The release of <em>Graduation</em> is famous for the sales battle against gangsta rap giant <strong>50 Cent</strong>'s album <em>Curtis</em>. 
          Released on the same day, the event was treated as a historic showdown for the direction of hip-hop.
        </p>
        <p>
          Kanye's victory (selling <strong>957,000</strong> copies in the first week) marked a turning point in the music industry. It shifted hip-hop away from gangsta themes and opened the door for introspective, pop-friendly rap sounds.
        </p>
      </div>

      <!-- Footer strip -->
      <div class="ye-footer-strip">
        ROC-A-FELLA RECORDS · DEF JAM RECORDINGS · SEPTEMBER 11, 2007 · ILLUSTRATIONS BY TAKASHI MURAKAMI
      </div>
    </div>
  </div>
  `;
}

function bindGraduationTracks() {
  const container = document.getElementById('ye-tracks');
  if (!container) return;

  container.querySelectorAll('.ye-track-scrawl, .ye-grid-track-row').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation();
      const index = parseInt(row.getAttribute('data-index'));
      const spotify = row.getAttribute('data-spotify');
      toggleTrack(index, spotify);
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   MAVI — Veritas Aqua Page
   ══════════════════════════════════════════════════════════════════ */
function buildVeritasHTML() {
  const tracks = [
    { title: 'VVL EMPIRE',          spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'maalesef',            spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'chosen one',          spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'şimşekler',           spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'ama hala',            spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'sağdan sola',         spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'mississippi',         spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'fanus (feat. Defa)',  spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'bipo-love',           spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'senden uzak (feat. Kum)', spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'saydam',              spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: 'rüzgarlar savrulsun', spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
    { title: "bi'tanem (feat. Diego)", spotify: 'https://open.spotify.com/intl-tr/album/4vNXXqeF28A2yAqsxGVn1r' },
  ];

  // Easter egg track positions
  const trackPositions = [
    { side: 'left',  offset: 2, y: 15, rot: -3 }, // VVL EMPIRE
    { side: 'right', offset: 2, y: 18, rot: 4  }, // maalesef
    { side: 'left',  offset: 3, y: 32, rot: -5 }, // chosen one
    { side: 'right', offset: 3, y: 38, rot: 2  }, // şimşekler
    { side: 'left',  offset: 2, y: 43, rot: -2 }, // ama hala
    { side: 'right', offset: 2, y: 48, rot: 5  }, // sağdan sola
    { side: 'left',  offset: 4, y: 62, rot: -4 }, // mississippi
    { side: 'right', offset: 3, y: 68, rot: 3  }, // fanus
    { side: 'left',  offset: 3, y: 72, rot: -6 }, // bipo-love
    { side: 'right', offset: 4, y: 78, rot: 1  }, // senden uzak
    { side: 'left',  offset: 2, y: 90, rot: 3  }, // saydam
    { side: 'right', offset: 3, y: 88, rot: -4 }, // rüzgarlar savrulsun
    { side: 'left',  offset: 4, y: 95, rot: -2 }, // bi'tanem
  ];

  const trackHTML = tracks.map((t, i) => {
    const p = trackPositions[i];
    const sideAttr = p.side === 'left' ? `left: ${p.offset}vw;` : `right: ${p.offset}vw;`;
    return `
      <div class="mv-track-scrawl" data-index="${i}" data-spotify="${t.spotify}" style="
        ${sideAttr}
        top: ${p.y}vh;
        transform: rotate(${p.rot}deg);
      ">
        <span class="mv-track-num-lbl">${String(i + 1).padStart(2, '0')}</span>
        <span class="mv-track-name-lbl">${t.title}</span>
        <button class="mv-track-btn">▶</button>
      </div>
    `;
  }).join('');

  return `
  <div class="mv-page" id="mv-tracks" style="background: url('assets/images/bg-veritas.png?v=${Date.now()}') center top / cover no-repeat fixed;">
    <a href="#discography" class="mv-back-btn">← BACK TO ARCHIVE</a>

    <!-- Scattered Tracklist Container (Desktop) -->
    <div class="mv-scrawl-container">
      ${trackHTML}
    </div>

    <!-- ═══ CONTENT ZONE (Organic / Non-boxy) ═══ -->
    <div class="mv-organic-content">
      
      <div class="mv-hero-header">
        <div class="mv-artist-title">MAVI</div>
        <h1 class="mv-album-title">VERITAS</h1>
        <div class="mv-subtitle">RELEASED 2022 • TRAP & HIP-HOP • INDEPENDENT</div>
      </div>

      <!-- Photo 1: Before the main text stream -->
      <div class="mv-inline-photo-single" style="transform: rotate(-2deg); margin: 20px auto 35px;">
        <div class="mv-photo-frame">
          <img src="assets/images/veritas-photo-1.jpg" alt="Mavi Veritas 1"/>
        </div>
      </div>

      <!-- Mobile Playlist Grid (Hidden on Desktop, Visible on smaller screens) -->
      <div class="mv-responsive-tracklist">
        <h2 class="mv-grid-title">ALBUM TRACKS</h2>
        <div class="mv-tracks-grid">
          ${tracks.map((t, i) => `
            <div class="mv-grid-track-row" data-index="${i}" data-spotify="${t.spotify}">
              <span class="mv-grid-track-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="mv-grid-track-name">${t.title}</span>
              <button class="mv-grid-play-btn">▶ PLAY</button>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="mv-text-stream">
        <div class="mv-card-free">
          <h2 class="mv-card-header">THE VERITAS SOUND</h2>
          <p>
            <strong>Mavi</strong>, born in 2004, is one of the most promising and distinctive voices in Turkish alternative trap and hip-hop. 
            Her debut album, <em>VERITAS</em>, serves as a powerful testament to her raw lyrical talent and genre-blending production.
          </p>
        </div>

        <!-- Photos 2 & 3: Inline after the first paragraph -->
        <div class="mv-inline-photo-row" style="margin: 35px 0;">
          <div class="mv-photo-frame" style="transform: rotate(3deg); margin-right: 15px;">
            <img src="assets/images/veritas-photo-2.jpg" alt="Mavi Veritas 2"/>
          </div>
          <div class="mv-photo-frame mv-pf-lg" style="transform: rotate(-3deg);">
            <img src="assets/images/veritas-photo-3.jpg" alt="Mavi Veritas 3"/>
          </div>
        </div>

        <div class="mv-card-free">
          <h2 class="mv-card-header">SPOTIFY PLAYLIST SUCCESS</h2>
          <p>
            Upon its release, the album showed exceptional commercial performance on digital platforms. 
            On the day of its release, <strong>Mavi</strong> became the cover artist for Spotify Turkey’s popular <strong>"0 Km"</strong> playlist.
          </p>
          <p>
            The track <strong>"bipo-love"</strong> entered the playlist at <strong>#3</strong>, while <strong>"ama hala"</strong> was positioned at <strong>#102</strong>.
          </p>
          <p>
            In another popular Turkish Rap playlist, <strong>"NKVT"</strong>, the track <strong>"mississippi"</strong> debuted at <strong>#11</strong>, and <strong>"VVL EMPIRE"</strong> entered at <strong>#49</strong>.
          </p>
        </div>
      </div>

      <!-- Photos 4 & 5: Inline before stats/end -->
      <div class="mv-inline-photo-row" style="margin: 35px auto 40px;">
        <div class="mv-photo-frame mv-pf-lg" style="transform: rotate(2deg); margin-right: 15px;">
          <img src="assets/images/veritas-photo-4.jpg" alt="Mavi Veritas 4"/>
        </div>
        <div class="mv-photo-frame" style="transform: rotate(-4deg);">
          <img src="assets/images/veritas-photo-5.jpg" alt="Mavi Veritas 5"/>
        </div>
      </div>

      <!-- Stats display -->
      <div class="mv-stats-stream">
        <div class="mv-stat-pill">
          <span class="mv-stat-num">#03</span>
          <span class="mv-stat-desc">Bipo-Love on "0 Km"</span>
        </div>
        <div class="mv-stat-pill">
          <span class="mv-stat-num">#11</span>
          <span class="mv-stat-desc">Mississippi on NKVT</span>
        </div>
        <div class="mv-stat-pill">
          <span class="mv-stat-num">2004</span>
          <span class="mv-stat-desc">Artist Birth Year</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="mv-footer-stream">
        VERITAS • MAVI ENTERTAINMENT • ALL RIGHTS RESERVED • C/WASM POWERED DAW
      </div>
    </div>
  </div>
  `;
}

function bindVeritasTracks() {
  const container = document.getElementById('mv-tracks');
  if (!container) return;

  container.querySelectorAll('.mv-track-scrawl, .mv-grid-track-row').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation();
      const index = parseInt(row.getAttribute('data-index'));
      const spotify = row.getAttribute('data-spotify');
      toggleTrack(index, spotify);
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   HAYKO CEPKIN — Sandık Gothic Page
   ══════════════════════════════════════════════════════════════════ */
function buildSandikHTML() {
  const tracks = [
    { title: 'Sandık',            spotify: 'https://open.spotify.com/intl-tr/album/4e4RrbiSdAY3FbUDy2uHK2' },
    { title: 'Yol Gözümü Dağlıyor', spotify: 'https://open.spotify.com/intl-tr/album/4e4RrbiSdAY3FbUDy2uHK2' },
    { title: 'Gelin Olmuş',        spotify: 'https://open.spotify.com/intl-tr/album/4e4RrbiSdAY3FbUDy2uHK2' },
    { title: 'Balık Olsaydım',     spotify: 'https://open.spotify.com/intl-tr/album/4e4RrbiSdAY3FbUDy2uHK2' },
    { title: 'Sahibi Yok',        spotify: 'https://open.spotify.com/intl-tr/album/4e4RrbiSdAY3FbUDy2uHK2' },
    { title: 'Doymadınız',         spotify: 'https://open.spotify.com/intl-tr/album/4e4RrbiSdAY3FbUDy2uHK2' },
    { title: 'Açtırdınız Kutuyu',   spotify: 'https://open.spotify.com/intl-tr/album/4e4RrbiSdAY3FbUDy2uHK2' },
    { title: 'Sandığım Hazır',     spotify: 'https://open.spotify.com/intl-tr/album/4e4RrbiSdAY3FbUDy2uHK2' },
    { title: 'Yolun Sonu',         spotify: 'https://open.spotify.com/intl-tr/album/4e4RrbiSdAY3FbUDy2uHK2' },
  ];

  const trackHTML = tracks.map((t, i) => `
    <div class="hs-track-row" data-index="${i}" data-spotify="${t.spotify}">
      <span class="hs-track-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="hs-track-name">${t.title}</span>
      <button class="hs-play-btn">▶</button>
    </div>
  `).join('');

  return `
  <div class="hs-page" id="hs-tracks">
    <a href="#discography" class="hs-back-btn">← BACK TO ARCHIVE</a>

    <!-- Lightning Columns on Sides -->
    <div class="hs-lightning-col hs-left-col">
      <svg class="hs-lightning-svg" viewBox="0 0 100 1000" preserveAspectRatio="none">
        <defs>
          <filter id="hs-glow-left" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path class="hs-bolt-glow hs-bgg-1" d="M 50,0 L 40,120 L 60,280 L 38,450 L 58,620 L 40,800 L 55,920 L 50,1000" filter="url(#hs-glow-left)" />
        <path class="hs-bolt-glow hs-bgg-2" d="M 50,0 L 58,100 L 42,250 L 62,420 L 40,600 L 58,780 L 45,900 L 50,1000" filter="url(#hs-glow-left)" />
        <path class="hs-bolt-glow hs-bgg-3" d="M 50,0 L 45,150 L 55,320 L 35,480 L 65,650 L 45,820 L 52,950 L 50,1000" filter="url(#hs-glow-left)" />
        <path class="hs-bolt-core hs-core-1" d="M 50,0 L 40,120 L 60,280 L 38,450 L 58,620 L 40,800 L 55,920 L 50,1000" />
        <path class="hs-bolt-core hs-core-2" d="M 50,0 L 58,100 L 42,250 L 62,420 L 40,600 L 58,780 L 45,900 L 50,1000" />
        <path class="hs-bolt-core hs-core-3" d="M 50,0 L 45,150 L 55,320 L 35,480 L 65,650 L 45,820 L 52,950 L 50,1000" />
      </svg>
    </div>
    <div class="hs-lightning-col hs-right-col">
      <svg class="hs-lightning-svg" viewBox="0 0 100 1000" preserveAspectRatio="none">
        <defs>
          <filter id="hs-glow-right" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path class="hs-bolt-glow hs-bgg-1" d="M 50,0 L 55,150 L 42,320 L 60,480 L 38,650 L 55,820 L 45,950 L 50,1000" filter="url(#hs-glow-right)" />
        <path class="hs-bolt-glow hs-bgg-2" d="M 50,0 L 42,100 L 58,280 L 38,420 L 58,600 L 40,780 L 52,900 L 50,1000" filter="url(#hs-glow-right)" />
        <path class="hs-bolt-glow hs-bgg-3" d="M 50,0 L 55,120 L 45,300 L 65,450 L 40,620 L 58,800 L 48,950 L 50,1000" filter="url(#hs-glow-right)" />
        <path class="hs-bolt-core hs-core-1" d="M 50,0 L 55,150 L 42,320 L 60,480 L 38,650 L 55,820 L 45,950 L 50,1000" />
        <path class="hs-bolt-core hs-core-2" d="M 50,0 L 42,100 L 58,280 L 38,420 L 58,600 L 40,780 L 52,900 L 50,1000" />
        <path class="hs-bolt-core hs-core-3" d="M 50,0 L 55,120 L 45,300 L 65,450 L 40,620 L 58,800 L 48,950 L 50,1000" />
      </svg>
    </div>

    <!-- Background Satanic/Pagan Symbol Overlays -->
    <div class="hs-bg-symbols">
      <div class="hs-symbol hs-symbol-1">⛧</div>
      <div class="hs-symbol hs-symbol-2">⛧</div>
      <div class="hs-symbol hs-symbol-3">🜏</div>
      <div class="hs-symbol hs-symbol-4">⛤</div>
      <div class="hs-symbol hs-symbol-5">⛧</div>
    </div>

    <!-- Content Area -->
    <div class="hs-organic-content">
      <div class="hs-hero-header">
        <div class="hs-artist-title">HAYKO CEPKİN</div>
        <h1 class="hs-album-title">SANDIK</h1>
        <div class="hs-subtitle">RELEASED FEB 2010 • EMI MUSIC • STÜDYO ALBÜMÜ</div>
      </div>

      <!-- Photo 1: Large Gothic Intro Photo -->
      <div class="hs-photo-center" style="margin: 25px auto 40px;">
        <div class="hs-tarot-frame" style="transform: rotate(-1.5deg);">
          <img src="assets/images/sandik-photo-1.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 1"/>
        </div>
      </div>

      <!-- Section 1: The Gothic Manifesto -->
      <div class="hs-text-stream">
        <div class="hs-text-block">
          <h2 class="hs-block-header">THE GOTHIC MANIFESTO</h2>
          <p>
            Released in <strong>February 2010</strong>, <em>Sandık</em> (Turkish for "Chest") is the dark and majestic third studio album by the pioneer of Turkish gothic metal and industrial rock, <strong>Hayko Cepkin</strong>. 
            Following the concepts of fear, death, and human nature, this album delivers heavy guitar riffs blended with traditional Turkish motifs and industrial electronics.
          </p>
        </div>

        <!-- Photos 2 & 3: Inline Tarot Frames -->
        <div class="hs-photo-row" style="margin: 35px 0;">
          <div class="hs-tarot-frame" style="transform: rotate(2deg); margin-right: 15px;">
            <img src="assets/images/sandik-photo-2.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 2"/>
          </div>
          <div class="hs-tarot-frame hs-pf-lg" style="transform: rotate(-3deg);">
            <img src="assets/images/sandik-photo-3.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 3"/>
          </div>
        </div>

        <!-- Section 2: Home Studio & Visual Craft -->
        <div class="hs-text-block">
          <h2 class="hs-block-header">HOME STUDIO & VISUAL CRAFT</h2>
          <p>
            The production of the album was highly intimate and experimental, recorded entirely in Hayko Cepkin's **home studio**. 
            To match the dark themes, the physical release features striking illustrations created by **Behnan Shabbir**, capturing pagan, mythological, and existential imagery.
          </p>
          <p>
            The album packaging and layout were executed by **Berat Kösemen**, while the official photography was taken by Umut Töre. Evrim İşbilir handled the mix at Studio CANNI.
          </p>
        </div>

        <!-- Photos 4, 5 & 6: Triple Tarot Strip -->
        <div class="hs-photo-row hs-photo-strip-3" style="margin: 35px 0;">
          <div class="hs-tarot-frame" style="transform: rotate(-2deg); margin-right: 10px;">
            <img src="assets/images/sandik-photo-4.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 4"/>
          </div>
          <div class="hs-tarot-frame hs-pf-lg" style="transform: rotate(1deg); margin-right: 10px;">
            <img src="assets/images/sandik-photo-5.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 5"/>
          </div>
          <div class="hs-tarot-frame" style="transform: rotate(-1deg);">
            <img src="assets/images/sandik-photo-6.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 6"/>
          </div>
        </div>

        <!-- Section 3: Personnel & Dark Waves -->
        <div class="hs-text-block">
          <h2 class="hs-block-header">PERSONNEL & DARK WAVES</h2>
          <p>
            The instrumentation of <em>Sandık</em> is characterized by distorted guitars, heavy basslines, and traditional Anatolian delays. 
            The team behind this record includes:
          </p>
          <ul class="hs-personnel-list">
            <li><strong>Guitars:</strong> Umut Töre</li>
            <li><strong>Bass Guitar:</strong> Poyraz Kılıç</li>
            <li><strong>Davul:</strong> Murat Cem Ergül</li>
            <li><strong>Keyboards, Programming & Samplings:</strong> Hayko Cepkin</li>
          </ul>
        </div>
      </div>

      <!-- Photos 7 & 8: Double Tarot Strip -->
      <div class="hs-photo-row" style="margin: 35px 0;">
        <div class="hs-tarot-frame hs-pf-lg" style="transform: rotate(3deg); margin-right: 15px;">
          <img src="assets/images/sandik-photo-7.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 7"/>
        </div>
        <div class="hs-tarot-frame" style="transform: rotate(-2deg);">
          <img src="assets/images/sandik-photo-8.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 8"/>
        </div>
      </div>

      <!-- Tracklist Section -->
      <div class="hs-tracklist-section">
        <h2 class="hs-tracklist-title">THE NINE DECREES</h2>
        <div class="hs-symbol-divider">⛧ ⛧ ⛧</div>
        <div class="hs-tracks-list">
          ${trackHTML}
        </div>
      </div>

      <!-- Photos 9, 10 & 11: Final Triple Strip -->
      <div class="hs-photo-row hs-photo-strip-3" style="margin: 40px 0 20px;">
        <div class="hs-tarot-frame" style="transform: rotate(-3deg); margin-right: 10px;">
          <img src="assets/images/sandik-photo-9.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 9"/>
        </div>
        <div class="hs-tarot-frame" style="transform: rotate(2deg); margin-right: 10px;">
          <img src="assets/images/sandik-photo-10.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 10"/>
        </div>
        <div class="hs-tarot-frame hs-pf-lg" style="transform: rotate(-1deg);">
          <img src="assets/images/sandik-photo-11.jpg?v=${Date.now()}" alt="Hayko Cepkin Sandik 11"/>
        </div>
      </div>

      <!-- Footer -->
      <div class="hs-footer">
        SANDIK • EMI MUSIC TURKEY • ALL RITUALS OBSERVED
      </div>
    </div>
  </div>
  `;
}

function bindSandikTracks() {
  const container = document.getElementById('hs-tracks');
  if (!container) return;

  container.querySelectorAll('.hs-track-row').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation();
      const index = parseInt(row.getAttribute('data-index'));
      const spotify = row.getAttribute('data-spotify');
      toggleTrack(index, spotify);
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   Generic album page (unchanged for other albums)
   ══════════════════════════════════════════════════════════════════ */
/* ==========================================================================
   Slipknot Vol. 3 - Brutal C Core Ritual Page
   ========================================================================== */
function buildSlipknotHTML() {
  const spotifyAlbum = 'https://open.spotify.com/intl-tr/album/4ZDBQSIDIZRUBOG2OHcN3T';
  const tracks = [
    { title: 'Prelude 3.0', length: '3:57' },
    { title: 'The Blister Exists', length: '5:19' },
    { title: 'Three Nil', length: '4:48' },
    { title: 'Duality', length: '4:12', single: true },
    { title: 'Opium of the People', length: '3:12' },
    { title: 'Circle', length: '4:22' },
    { title: 'Welcome', length: '3:15' },
    { title: 'Vermilion', length: '5:16', single: true },
    { title: 'Pulse of the Maggots', length: '4:19' },
    { title: 'Before I Forget', length: '4:38', single: true },
    { title: 'Vermilion Pt. 2', length: '3:44', single: true },
    { title: 'The Nameless', length: '4:28', single: true },
    { title: 'The Virus of Life', length: '5:25' },
    { title: 'Danger - Keep Away', length: '3:13' },
  ];

  const photos = [
    'vol 3 photos/WhatsApp Image 2026-06-17 at 16.24.35.jpeg',
    'vol 3 photos/WhatsApp Image 2026-06-17 at 16.24.35 (1).jpeg',
    'vol 3 photos/WhatsApp Image 2026-06-17 at 16.24.36.jpeg',
    'vol 3 photos/WhatsApp Image 2026-06-17 at 16.24.36 (1).jpeg',
    'vol 3 photos/WhatsApp Image 2026-06-17 at 16.24.36 (2).jpeg',
    'vol 3 photos/WhatsApp Image 2026-06-17 at 16.24.36 (3).jpeg',
    'vol 3 photos/WhatsApp Image 2026-06-17 at 16.24.36 (4).jpeg',
    'vol 3 photos/WhatsApp Image 2026-06-17 at 16.24.36 (5).jpeg',
    'vol 3 photos/WhatsApp Image 2026-06-17 at 16.24.37.jpeg',
  ];

  const trackRows = tracks.map((track, i) => `
    <div class="sk-track-row" data-index="${i}" data-spotify="${spotifyAlbum}">
      <span class="sk-track-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="sk-track-name">${track.title}</span>
      <span class="sk-track-length">${track.length}</span>
      <button class="sk-event-btn" data-spotify="${spotifyAlbum}">OLAY</button>
      ${track.single ? '<span class="sk-single-mark">SINGLE</span>' : ''}
    </div>
  `).join('');

  const photoGrid = photos.map((src, i) => `
    <figure class="sk-photo sk-photo-${i + 1}">
      <img src="${src}" alt="Slipknot Vol. 3 visual ${i + 1}" loading="lazy">
    </figure>
  `).join('');

  return `
  <div class="sk-page" id="sk-tracks">
    <canvas class="detail-bg-canvas" id="detail-bg-canvas"></canvas>
    <a href="#discography" class="sk-back-btn">&lt; ARCHIVE</a>

    <div class="sk-symbol sk-symbol-a">⛧</div>
    <div class="sk-symbol sk-symbol-b">9</div>
    <div class="sk-symbol sk-symbol-c">☠</div>

    <section class="sk-hero">
      <div class="sk-hero-copy">
        <div class="sk-kicker">ROADRUNNER // 2004 // THE NINE ACTIVE</div>
        <h1>VOL. 3:<br><span>(THE SUBLIMINAL VERSES)</span></h1>
        <p>
          Slipknot's third studio album was released on May 25, 2004. The record
          was produced by Rick Rubin, recorded during 2003-2004, and pushed the
          band toward more melodic song structures, guitar solos and acoustic
          textures while keeping the serrated metal impact.
        </p>
        <div class="sk-fact-strip">
          <span>60:09</span>
          <span>Nu / Alternative Metal</span>
          <span>Producer: Rick Rubin</span>
          <span>US Billboard 200: #2</span>
        </div>
      </div>
      <div class="sk-cover-wrap">
        <img src="${_album.cover}" alt="Vol. 3 album cover" class="sk-cover">
        <div class="sk-cover-seal">MAGGOT MASK<br>ARTWORK NODE</div>
      </div>
    </section>

    <section class="sk-gallery">
      ${photoGrid}
    </section>

    <section class="sk-main-grid">
      <div class="sk-info-block">
        <h2>ALBUM DOSYASI</h2>
        <p>
          Vol. 3 is the band's only album produced by Rick Rubin. The album
          reached platinum certification in the United States and "Before I
          Forget" later won the Grammy Award for Best Metal Performance.
        </p>
        <p>
          The cover is built around the "maggot mask" designed by Shawn Crahan:
          stitched leather, a zipper mouth, and a fan-culture symbol turned into
          album identity.
        </p>
      </div>

      <div class="sk-c-core">
        <div class="sk-panel-title">C RITUAL ENGINE // FOR + WHILE + FUNCTION</div>
        <pre><code>typedef struct {
  char  title[32];
  int   seconds;
  float aggression;
} TrackNode;

void compile_vol3(TrackNode tracks[], int count) {
  for (int i = 0; i &lt; count; i++) {
    apply_distortion(&amp;tracks[i], 9.0f);
    if (tracks[i].seconds &gt; 260) {
      open_lowpass_gate(i);
    }
  }

  int ritual = 0;
  while (ritual &lt; 9) {
    sync_percussion_buffer(ritual);
    ritual++;
  }
}</code></pre>
        <div class="sk-c-runner">
          <button id="sk-run-c-loop">RUN C LOOP</button>
          <output id="sk-c-output">awaiting compile_vol3()</output>
        </div>
      </div>
    </section>

    <section class="sk-tracklist-section">
      <div class="sk-section-head">
        <h2>TRACKLIST BUFFER</h2>
        <span>14 SECTORS // OLAY BUTTON -> SPOTIFY ALBUM</span>
      </div>
      <div class="sk-tracks-list">
        ${trackRows}
      </div>
    </section>
  </div>
  `;
}

function bindSlipknotTracks() {
  const container = document.getElementById('sk-tracks');
  if (!container) return;

  container.querySelectorAll('.sk-track-row, .sk-event-btn').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const row = e.target.closest('.sk-track-row');
      const index = row ? parseInt(row.dataset.index, 10) : 0;
      const spotify = row?.dataset.spotify || e.currentTarget.dataset.spotify;
      toggleTrack(index, spotify);
    });
  });

  const runButton = document.getElementById('sk-run-c-loop');
  const output = document.getElementById('sk-c-output');
  runButton?.addEventListener('click', e => {
    e.stopPropagation();
    const trackSeconds = [237, 319, 288, 252, 192, 262, 195, 316, 259, 278, 224, 268, 325, 193];
    let distortionHits = 0;
    let gateOpens = 0;
    let ritual = 0;

    for (let i = 0; i < trackSeconds.length; i++) {
      distortionHits += 9;
      if (trackSeconds[i] > 260) gateOpens++;
    }

    while (ritual < 9) ritual++;

    output.textContent = `for: ${trackSeconds.length} tracks | gates: ${gateOpens} | while rituals: ${ritual} | distortion: ${distortionHits}x`;
    WASM_SIM.log('Slipknot C loop simulation executed', 'success');
  });
}

function buildHTML() {
  return `
  <div class="detail-view-container" id="detail-view-shell">
    <canvas class="detail-bg-canvas" id="detail-bg-canvas"></canvas>
    <a href="#discography" class="detail-back-btn">&#x3c; BACK TO DATABASE</a>
    <div class="detail-top-grid">
      <div class="detail-meta-panel">
        <div class="detail-artist-name">${_album.artist}</div>
        <h1 class="detail-album-title">${_album.title}</h1>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);display:flex;gap:16px;margin-top:-4px;">
          <span>RELEASE: ${_album.year}</span><span>|</span><span>${_album.label}</span>
        </div>
        <p class="detail-desc-text">${_album.description}</p>
        <div class="detail-tracks-box">
          <div class="tracks-box-header">ALBUM BUFFER INDEX [${_album.tracks.length} SECTORS]</div>
          <div class="track-list-wrapper" id="tracks-list-container"></div>
        </div>
      </div>
      <div class="collage-gallery-container">
        <div class="collage-title">ANARCHIST COLLAGE RECONSTRUCTION</div>
        <div class="collage-grid" id="collage-grid-box"></div>
      </div>
    </div>
  </div>`;
}

function renderTracks() {
  const c = document.getElementById('tracks-list-container');
  if (!c) return;
  c.innerHTML = _album.tracks.map((t, i) => {
    const query = `${_album.artist} ${t}`;
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    return `
      <div class="track-row" data-index="${i}" data-spotify="${spotifyUrl}">
        <div class="track-info-left">
          <span class="track-number">${(i+1).toString().padStart(2,'0')}</span>
          <span class="track-name">${t}</span>
        </div>
        <button class="track-play-btn" data-index="${i}" data-spotify="${spotifyUrl}">COMPILE PLAY</button>
      </div>`;
  }).join('');
  c.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation();
      toggleTrack(parseInt(row.dataset.index), row.dataset.spotify);
    });
  });
}

function renderCollage() {
  const c = document.getElementById('collage-grid-box');
  if (!c) return;
  const cards = COLLAGE[_album.id] || [];
  c.innerHTML = cards.map((card, i) => `
    <div class="collage-item ${i===0?'collage-item-1':''}" style="display:flex;align-items:center;justify-content:${card.cls.includes('center')?'center':'flex-start'};padding:16px;font-family:${card.cls.includes('mono')?'var(--font-mono)':'var(--font-sans)'};font-size:11px;color:${card.cls.includes('quote')?'var(--theme-accent)':'var(--text-main)'};font-style:${card.cls.includes('quote')?'italic':'normal'};line-height:1.6;">
      ${card.html}
    </div>`).join('');
}

/* ── Track playback ─────────────────────────────────────────── */
function toggleTrack(idx, spotifyUrl) {
  if (spotifyUrl) {
    window.open(spotifyUrl, '_blank');
    WASM_SIM.log(`Redirecting to Spotify for track ${idx + 1}`, 'info');
    return;
  }

  const isMmlp  = _album.id === 'eminem-mmlp';
  const rows    = isMmlp
    ? document.querySelectorAll('.mmlp-track-scrawl')
    : document.querySelectorAll('.track-row');

  if (_playingTrackIdx === idx) {
    stopSynth();
    rows[idx]?.classList.remove('playing');
    if (isMmlp) rows[idx]?.querySelector('.mmlp-play-btn') && (rows[idx].querySelector('.mmlp-play-btn').textContent = '▶');
    else rows[idx]?.querySelector('.track-play-btn') && (rows[idx].querySelector('.track-play-btn').textContent = 'COMPILE PLAY');
    _playingTrackIdx = -1;
  } else {
    if (_playingTrackIdx !== -1) {
      rows[_playingTrackIdx]?.classList.remove('playing');
      if (isMmlp) rows[_playingTrackIdx]?.querySelector('.mmlp-play-btn') && (rows[_playingTrackIdx].querySelector('.mmlp-play-btn').textContent = '▶');
      else rows[_playingTrackIdx]?.querySelector('.track-play-btn') && (rows[_playingTrackIdx].querySelector('.track-play-btn').textContent = 'COMPILE PLAY');
      stopSynth();
    }
    _playingTrackIdx = idx;
    rows[idx]?.classList.add('playing');
    if (isMmlp) rows[idx]?.querySelector('.mmlp-play-btn') && (rows[idx].querySelector('.mmlp-play-btn').textContent = '■');
    else rows[idx]?.querySelector('.track-play-btn') && (rows[idx].querySelector('.track-play-btn').textContent = 'STOP DISK');
    playSynth(idx);
    WASM_SIM.triggerAccess(`AlbumData_${_album.id.replace('-','_')}`, 'read');
    WASM_SIM.log(`Playing: track ${idx + 1}`, 'info');
  }
}

function playSynth(trackIdx) {
  if (!AudioEngine.isReady) return;
  const ctx = AudioEngine.ctx;
  const preset = SYNTH_PRESETS[_album.id] || SYNTH_PRESETS['eminem-mmlp'];
  const { scale, type, bpm } = preset;
  const stepTime = 60 / bpm / 2;
  let step = 0, playTime = ctx.currentTime;
  const tick = () => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    let note = scale[(step + trackIdx * 3) % scale.length];
    if (step % 4 === 0) note *= 2;
    osc.type = type;
    osc.frequency.setValueAtTime(note, playTime);
    gain.gain.setValueAtTime(0.1, playTime);
    if (_album.id === 'slipknot-verses' || _album.id === 'hayko-sandik') {
      const shaper = ctx.createWaveShaper(); shaper.curve = makeCurve(18);
      osc.connect(shaper); shaper.connect(gain);
    } else { osc.connect(gain); }
    gain.gain.exponentialRampToValueAtTime(0.0001, playTime + stepTime - 0.02);
    gain.connect(AudioEngine.masterGain);
    osc.start(playTime); osc.stop(playTime + stepTime);
    step++; playTime += stepTime;
  };
  tick();
  _synthInterval = setInterval(tick, stepTime * 1000);
}

function stopSynth() { clearInterval(_synthInterval); _synthInterval = null; }
function makeCurve(k) {
  const n = 44100, c = new Float32Array(n);
  for (let i=0;i<n;i++) { const x=(i*2)/n-1; c[i]=((3+k)*x)/(Math.PI+k*Math.abs(x)); }
  return c;
}

/* ── Canvas BG ─────────────────────────────────────────────── */
function initBgCanvas() {
  const canvas = document.getElementById('detail-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = canvas.parentElement?.clientWidth || innerWidth; canvas.height = canvas.parentElement?.clientHeight || innerHeight; };
  resize(); window.addEventListener('resize', resize);
  let active = true;

  if (_album.id === 'eminem-mmlp') {
    const drops = Array.from({length:150}, () => ({
      x: Math.random() * (canvas.width || innerWidth),
      y: Math.random() * (canvas.height || innerHeight),
      vy: 6 + Math.random() * 10,
      len: 12 + Math.random() * 20,
      a: 0.02 + Math.random() * 0.06,
    }));
    const draw = () => {
      if (!active) return;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drops.forEach(d => {
        ctx.strokeStyle = `rgba(255,255,255,${d.a})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x-1, d.y+d.len); ctx.stroke();
        d.y += d.vy;
        if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
      });
      if (Math.random() < 0.05) {
        ctx.fillStyle = 'rgba(255,0,60,0.03)';
        ctx.fillRect(0, Math.random()*canvas.height, canvas.width, 1 + Math.random()*3);
      }
      _canvasAnimId = requestAnimationFrame(draw);
    };
    draw();
  } else if (_album.id === 'ye-graduation') {
    const stars = Array.from({length:50}, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, sz: Math.random()*2+0.5, a: Math.random(), da: 0.008+Math.random()*0.015 }));
    const draw = () => { if (!active) return; ctx.clearRect(0,0,canvas.width,canvas.height); stars.forEach(s => { ctx.fillStyle=`rgba(255,0,208,${s.a*0.35})`; ctx.beginPath(); ctx.arc(s.x,s.y,s.sz*2,0,Math.PI*2); ctx.fill(); s.a+=s.da; if(s.a>0.9||s.a<0.05) s.da*=-1; }); _canvasAnimId=requestAnimationFrame(draw); }; draw();
  } else if (_album.id === 'mavi-veritas') {
    const bubbles = Array.from({length:40}, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*4+1, vy: -(Math.random()*0.4+0.1), a: Math.random()*0.3+0.1, da: 0.002+Math.random()*0.005 }));
    const draw = () => { if (!active) return; ctx.clearRect(0,0,canvas.width,canvas.height); bubbles.forEach(b => { ctx.fillStyle = `rgba(0,180,216,${b.a*0.4})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill(); b.y += b.vy; b.a += b.da; if (b.a > 0.9 || b.a < 0.05) b.da *= -1; if (b.y < -10) { b.y = canvas.height + 10; b.x = Math.random()*canvas.width; } }); _canvasAnimId = requestAnimationFrame(draw); }; draw();
  } else if (_album.id === 'kendrick-damn') {
    const draw = () => { if (!active) return; ctx.clearRect(0,0,canvas.width,canvas.height); if(Math.random()<0.02){ctx.fillStyle='rgba(217,4,41,0.04)'; ctx.fillRect(0,Math.random()*canvas.height,canvas.width,2+Math.random()*3);} _canvasAnimId=requestAnimationFrame(draw); }; draw();
  } else if (_album.id === 'hayko-sandik') {
    const pts = Array.from({length:25}, () => ({ x: Math.random()*canvas.width, y: canvas.height+20, vx:(Math.random()-0.5)*0.5, vy:-(0.3+Math.random()*0.6), a:0.3+Math.random()*0.3 }));
    const draw = () => { if(!active) return; ctx.clearRect(0,0,canvas.width,canvas.height); pts.forEach(p=>{ctx.fillStyle=`rgba(199,0,57,${p.a*0.1})`; ctx.beginPath(); ctx.arc(p.x,p.y,30,0,Math.PI*2); ctx.fill(); p.x+=p.vx; p.y+=p.vy; p.a-=0.001; if(p.y<-60||p.a<=0){p.x=Math.random()*canvas.width; p.y=canvas.height+20; p.a=0.3+Math.random()*0.3;}}); _canvasAnimId=requestAnimationFrame(draw); }; draw();
  } else if (_album.id === 'slipknot-verses') {
    const cuts = Array.from({length:42}, () => ({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      len: 30 + Math.random()*180,
      vx: -0.4 + Math.random()*0.8,
      a: 0.05 + Math.random()*0.18,
    }));
    const draw = () => {
      if (!active) return;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      cuts.forEach(c => {
        ctx.strokeStyle = `rgba(255,38,0,${c.a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + c.len, c.y + Math.sin(c.x * 0.01) * 18);
        ctx.stroke();
        c.x += c.vx;
        if (c.x < -c.len || c.x > canvas.width + c.len) {
          c.x = Math.random()*canvas.width;
          c.y = Math.random()*canvas.height;
        }
      });
      if (Math.random() < 0.08) {
        ctx.fillStyle = 'rgba(255,38,0,0.055)';
        ctx.fillRect(0, Math.random()*canvas.height, canvas.width, 2 + Math.random()*6);
      }
      _canvasAnimId = requestAnimationFrame(draw);
    };
    draw();
  }

  window._anarkyResizeCleanup = () => window.removeEventListener('resize', resize);
  window._anarkyCanvasStop    = () => { active = false; };
}

function _cleanup() {
  stopSynth();
  if (_canvasAnimId) cancelAnimationFrame(_canvasAnimId);
  if (window._anarkyCanvasStop) window._anarkyCanvasStop();
  _canvasAnimId = null; _playingTrackIdx = -1;
  if (window._anarkyResizeCleanup) window._anarkyResizeCleanup();
  const themeLink = document.getElementById('album-theme-styles');
  if (themeLink) themeLink.href = '';
}
