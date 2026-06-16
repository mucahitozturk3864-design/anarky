/* ==========================================================================
   ANARKY DAW v2.0 — TRANSITION ENGINE
   Handles 5-second category + album transitions.
   Supports: real .mp4 video (via AssetManager) OR canvas fallback animation.
   ========================================================================== */

import AssetManager from './AssetManager.js';
import AudioEngine  from './AudioEngine.js';

const TransitionEngine = (() => {
  // DOM refs (set on init)
  let _screen    = null;
  let _videoEl   = null;
  let _canvasBg  = null;
  let _studioBg  = null;
  let _title     = null;
  let _subtext   = null;
  let _progress  = null;
  let _graphic   = null;
  let _loaderEl  = null;  // transition-loader-container

  let _canvasActive = false;
  let _stopCanvas   = null;

  // Module visual configs
  const MODULE_CONFIG = {
    mix: {
      title   : 'MIXER CONSOLE',
      sub     : 'Compiling virtual turntable buffer pointers...',
      color   : 'var(--accent-red)',
    },
    beat: {
      title   : 'SEQUENCER GRID',
      sub     : 'Initializing step clock and synthesizing audio channels...',
      color   : 'var(--accent-purple)',
    },
    vokal: {
      title   : 'VOCAL BOOTH',
      sub     : 'Wiring inputs to dynamic DSP effect chain...',
      color   : 'var(--accent-green)',
    },
    discography: {
      title   : 'DISCOGRAPHY DB',
      sub     : 'Mapping album track structures to Heap buffers...',
      color   : 'var(--accent-cyan)',
    },
    'album-detail': {
      title   : 'ALBUM MATRIX',
      sub     : 'Injecting custom stylesheet & layout buffers...',
      color   : 'var(--accent-purple)',
    },
  };

  // ── Canvas Particle / Scanline Fallback ──────────────────────────────────
  function _runCanvasFallback(colorCss) {
    const canvas = _canvasBg;
    const ctx    = canvas.getContext('2d');
    _canvasActive = true;

    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    window.addEventListener('resize', resize);
    resize();

    const particles = Array.from({ length: 70 }, () => ({
      x : Math.random() * canvas.width,
      y : Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.5) * 2.5,
      sz: Math.random() * 3 + 1,
    }));

    const render = () => {
      if (!_canvasActive) return;
      ctx.fillStyle = 'rgba(5,5,7,0.22)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // scanlines
      ctx.strokeStyle = 'rgba(255,255,255,0.012)';
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 36) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
      }

      // particles
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.fillStyle = colorCss;
        ctx.shadowBlur = 10; ctx.shadowColor = colorCss;
        ctx.fillRect(p.x, p.y, p.sz * 2, p.sz);
      }
      ctx.shadowBlur = 0;

      // random glitch bar
      if (Math.random() < 0.14) {
        ctx.fillStyle = 'rgba(255,0,60,0.08)';
        ctx.fillRect(0, Math.random() * canvas.height, canvas.width, Math.random() * 45);
      }

      requestAnimationFrame(render);
    };
    render();

    return () => {
      _canvasActive = false;
      window.removeEventListener('resize', resize);
    };
  }

  // ── Progress Bar (5 seconds) ─────────────────────────────────────────────
  function _runProgressBar(duration = 5000) {
    return new Promise(resolve => {
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const pct = Math.min(((ts - start) / duration) * 100, 100);
        _progress.style.width = `${pct}%`;
        if (pct < 100) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────
  return {
    init(domRefs) {
      _screen   = domRefs.screen;
      _videoEl  = domRefs.video;
      _canvasBg = domRefs.canvas;
      _studioBg = domRefs.studioBg;
      _title    = domRefs.title;
      _subtext  = domRefs.subtext;
      _progress = domRefs.progress;
      _graphic  = domRefs.graphic;
      _loaderEl = domRefs.loader || null;
    },

    /**
     * Play a full transition for a module or album.
     * @param {string} moduleName  - route name
     * @param {object} albumData   - optional: { id, title, artist, themeColor, svgArt }
     */
    async play(moduleName, albumData = null) {
      const cfg = MODULE_CONFIG[moduleName] || MODULE_CONFIG['mix'];
      let color = cfg.color;

      // ── Configure titles ──────────────────────────────
      if (albumData) {
        _title.textContent   = albumData.title;
        _subtext.textContent = `[DECOMPRESSING DIGITAL ARCHIVE: ${albumData.artist.toUpperCase()}]`;
        color = albumData.themeColor;
        // Show SVG art
        if (albumData.svgArt) {
          _graphic.innerHTML = `<svg viewBox="0 0 300 300" style="width:100%;height:100%;">${albumData.svgArt}</svg>`;
          _graphic.style.display     = 'block';
          _graphic.style.borderColor = color;
          _studioBg.style.backgroundImage = 'none';
        }
      } else {
        _title.textContent   = cfg.title;
        _subtext.textContent = cfg.sub;
        _graphic.style.display = 'none';
        _studioBg.style.backgroundImage = '';
      }

      _title.style.color      = color;
      _title.style.textShadow = `0 0 12px ${color}`;

      // Progress bar CSS transition kaldır (rAF ile çakışır)
      _progress.style.transition = 'none';
      _progress.style.width      = '0%';

      // ── Show screen ───────────────────────────────────
      _screen.classList.add('active');

      // ── Resolve video path (direkt, HEAD request yok) ─
      const videoPath = albumData
        ? `assets/videos/album_intros/${albumData.id}.mp4`
        : `assets/videos/transitions/${moduleName}_transition.mp4`;

      let _loadTimeout = null;

      // ── Direkt video yükle, hata olursa canvas fallback─
      await new Promise(resolve => {
        let videoLoaded = false;
        let stopCanvas  = null;

        const fallbackToCanvas = () => {
          if (videoLoaded) return;
          if (_loadTimeout) { clearTimeout(_loadTimeout); _loadTimeout = null; }
          _videoEl.style.display  = 'none';
          _videoEl.style.zIndex   = '';
          _canvasBg.style.display = '';
          _studioBg.style.display = '';
          if (_loaderEl) _loaderEl.style.display = '';
          AudioEngine.playTransitionSweep();
          if (!stopCanvas) stopCanvas = _runCanvasFallback(color);
        };

        // Reset video element
        _videoEl.pause();
        _videoEl.onerror      = fallbackToCanvas;
        _videoEl.onabort      = fallbackToCanvas;
        _videoEl.onstalled    = null;
        _videoEl.onloadeddata = () => {
          videoLoaded = true;
          if (_loadTimeout) { clearTimeout(_loadTimeout); _loadTimeout = null; }
          _videoEl.play().catch(() => {});
        };

        // Video görünür yap — canvas, bg ve loader'i gizle (sadece video)
        _videoEl.style.display  = 'block';
        _videoEl.style.zIndex   = '5';
        _canvasBg.style.display = 'none';
        _studioBg.style.display = 'none';
        if (_loaderEl) _loaderEl.style.display = 'none';

        // src'yi ata ve yükle
        _videoEl.src = videoPath;
        _videoEl.load();

        // 1.5s içinde video yüklenmezse canvas fallback'e geç
        _loadTimeout = setTimeout(() => {
          if (!videoLoaded) fallbackToCanvas();
        }, 1500);

        // 5 saniyelik progress bar — bittikten sonra resolve
        _runProgressBar(5000).then(() => {
          if (stopCanvas) stopCanvas();
          resolve();
        });
      });

      if (_loadTimeout) { clearTimeout(_loadTimeout); _loadTimeout = null; }

      // ── Cleanup: event listener'ları temizle (stale callback önle) ────
      _videoEl.onerror      = null;
      _videoEl.onabort      = null;
      _videoEl.onstalled    = null;
      _videoEl.onloadeddata = null;

      // ── Video temizle ─────────────────────────────────
      _videoEl.pause();
      _videoEl.src = '';
      _videoEl.load();
      _videoEl.style.display  = 'none';
      _videoEl.style.zIndex   = '';
      _canvasBg.style.display = '';
      _studioBg.style.display = '';
      if (_loaderEl) _loaderEl.style.display = '';

      // ── Hide screen after short pause ─────────────────
      await new Promise(r => setTimeout(r, 280));
      _screen.classList.remove('active');
      _graphic.style.display = 'none';
      _progress.style.width  = '0%';
    }
  };
})();

export default TransitionEngine;
