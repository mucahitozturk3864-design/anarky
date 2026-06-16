/* ==========================================================================
   ANARKY DAW v2.0 — MAIN APPLICATION ROUTER & DRIVER
   Coordinates: Intro → Auth → Routing → Transitions → Module Loading
   ========================================================================== */

import { WASM_SIM }        from './wasm/wasm_sim.js';
import AudioEngine          from './src/components/AudioEngine.js';
import AssetManager         from './src/components/AssetManager.js';
import TransitionEngine     from './src/components/TransitionEngine.js';
import { ALBUM_DB }         from './src/pages/discography/discography.js';

// ── Global Audio Export (consumed by sub-modules) ────────────────────────────
export { AudioEngine };

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Inject WASM panel CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = 'wasm/wasm.css';
  document.head.appendChild(link);

  App.init();
});

// ═════════════════════════════════════════════════════════════════════════════
const App = {
  currentRoute        : '',
  isPlayingTransition : false,

  // ── DOM Refs ──────────────────────────────────────────────────────────────
  introScreen  : null, introLogo : null, introTerminal : null, introSkip: null,
  appShell     : null, routerView : null,
  transScreen  : null, transTitle : null, transSub : null,
  transProgress: null, transBg    : null, transCanvas  : null,
  transGraphic : null, transVideo : null, transLoader  : null,
  navLogo      : null, wasmPanel  : null, wasmPanelToggle: null,
  headerNav    : null, noiseCanvas : null,

  // ── Init ──────────────────────────────────────────────────────────────────
  async init() {
    this.bindDOM();
    await WASM_SIM.init();
    this.initWasmPanel();

    // Pre-warm AssetManager cache in background
    AssetManager.prewarm(ALBUM_DB.map(a => a.id));

    // Init TransitionEngine
    TransitionEngine.init({
      screen   : this.transScreen,
      video    : this.transVideo,
      canvas   : this.transCanvas,
      studioBg : this.transBg,
      title    : this.transTitle,
      subtext  : this.transSub,
      progress : this.transProgress,
      graphic  : this.transGraphic,
      loader   : this.transLoader,
    });

    this.runIntroSequence();
    this.runIntroNoise();

    window.addEventListener('hashchange', () => this.route());
  },

  bindDOM() {
    this.introScreen    = document.getElementById('intro-screen');
    this.introLogo      = document.getElementById('intro-logo');
    this.introTerminal  = document.getElementById('intro-terminal');
    this.introSkip      = document.getElementById('intro-skip');
    this.appShell       = document.getElementById('app-shell');
    this.routerView     = document.getElementById('router-view');
    this.transScreen    = document.getElementById('transition-screen');
    this.transTitle     = document.getElementById('transition-title');
    this.transSub       = document.getElementById('transition-subtext');
    this.transProgress  = document.getElementById('transition-progress');
    this.transBg        = document.getElementById('transition-bg');
    this.transCanvas    = document.getElementById('transition-canvas');
    this.transGraphic   = document.getElementById('transition-graphic-container');
    this.transVideo     = document.getElementById('transition-video');
    this.transLoader    = document.getElementById('transition-loader');
    this.navLogo        = document.getElementById('nav-logo');
    this.wasmPanelToggle= document.getElementById('wasm-panel-toggle');
    this.wasmPanel      = document.getElementById('wasm-sim-panel');
    this.headerNav      = document.getElementById('header-nav');
    this.noiseCanvas    = document.getElementById('intro-noise-canvas');

    // Skip / ESC
    this.introSkip.addEventListener('click', () => this.endIntro());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.introScreen.style.display !== 'none') this.endIntro();
    });

    // Logo → menu (no transition)
    this.navLogo.addEventListener('click', () => { window.location.hash = '#menu'; });

    // WASM panel toggle
    this.wasmPanelToggle.addEventListener('click', () => {
      this.wasmPanel.classList.toggle('wasm-panel-open');
      this.wasmPanel.classList.toggle('wasm-panel-closed');
    });
  },

  // ── 1. Boot Intro Sequence (7s) ───────────────────────────────────────────
  runIntroSequence() {
    // ── Play intro background video ──────────────────────────────────────
    const introVid = document.getElementById('intro-bg-video');
    if (introVid) {
      introVid.src = 'assets/videos/transitions/intro_transition.mp4';
      introVid.loop = true;
      introVid.play().catch(() => {});
    }

    const lines = [
      { text: '[*] BOOTING ANARKY SYSTEM CORE v2.0.0...', cls: '' },
      { text: '[*] DETECTING DSP AUDIO INTERFACE... DONE.', cls: 'ok' },
      { text: '[*] INTEGRATING C SOURCE LIBRARIES (libDSP, libAudio)... OK', cls: 'ok' },
      { text: '[*] INITIALIZING HEAP STRUCTURE [BASE: 0x00100000]', cls: '' },
      { text: '[*] ALLOCATING MASTER VIRTUAL CHANNEL [512 BYTES]', cls: '' },
      { text: '[*] MEMORY ALIGNMENT: 64-BYTE ALIGNED FOR AVX-512 VECTORS', cls: '' },
      { text: '[*] COMPILING MIX: TURNTABLE SCRATCH EMULATOR... DONE', cls: 'ok' },
      { text: '[*] COMPILING BEAT: 16-STEP SEQUENCER SYNTH... DONE', cls: 'ok' },
      { text: '[*] LOADING VOCAL DSP CHAIN (8 EMBEDDED EFFECTS)... OK', cls: 'ok' },
      { text: '[*] MOUNTING ASSET MANAGER & VIDEO RESOLVER...', cls: '' },
      { text: '[*] MOUNTING 8 ALBUM METADATA TEMPLATES... MOUNTED', cls: 'ok' },
      { text: '[*] SYSTEM READINESS: 100% // ENGAGING DAW SOUND ENGINE...', cls: 'ok' },
    ];

    let idx = 0;
    const printLine = () => {
      if (idx < lines.length) {
        const span = document.createElement('span');
        span.className = `intro-terminal-line ${lines[idx].cls}`;
        span.textContent = lines[idx].text;
        this.introTerminal.appendChild(span);
        this.introTerminal.scrollTop = this.introTerminal.scrollHeight;
        idx++;
        const delay = idx === lines.length ? 800 : (100 + Math.random() * 360);
        this._introTimeout = setTimeout(printLine, delay);
      } else {
        this._introTimeout = setTimeout(() => this.endIntro(), 600);
      }
    };
    printLine();
  },

  // Noise canvas for intro background
  runIntroNoise() {
    const canvas = this.noiseCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      canvas.width = innerWidth; canvas.height = innerHeight;
      const id = ctx.createImageData(canvas.width, canvas.height);
      for (let i=0;i<id.data.length;i+=4) {
        const v = Math.random()*255|0;
        id.data[i] = id.data[i+1] = id.data[i+2] = v;
        id.data[i+3] = 255;
      }
      ctx.putImageData(id, 0, 0);
      this._noiseFrame = requestAnimationFrame(draw);
    };
    draw();
  },

  endIntro() {
    clearTimeout(this._introTimeout);
    cancelAnimationFrame(this._noiseFrame);

    this.introLogo.style.animation = 'logoGlitch 0.08s infinite';
    this.introScreen.style.transition = 'all 0.5s cubic-bezier(0.16,1,0.3,1)';
    this.introScreen.style.filter  = 'blur(12px) invert(1)';
    this.introScreen.style.opacity = '0';

    setTimeout(() => {
      this.introScreen.style.display = 'none';
      this.appShell.style.display = 'flex';
      this.promptAudioAuth();
    }, 480);
  },

  // ── 2. Audio Authorization ────────────────────────────────────────────────
  promptAudioAuth() {
    const modal = document.getElementById('audio-auth-modal');
    const btn   = document.getElementById('btn-auth-audio');
    modal.style.display = 'flex';

    btn.onclick = () => {
      modal.style.display = 'none';
      AudioEngine.init();
      this.startGlobalUpdateLoops();

      if (!window.location.hash || window.location.hash === '#menu') {
        this.route();
      } else {
        window.location.hash = '#menu';
      }
    };
  },

  // Header latency + WASM chart update
  startGlobalUpdateLoops() {
    const latEl = document.getElementById('dsp-latency-label');
    setInterval(() => {
      const lat = WASM_SIM.getLatency();
      if (latEl) latEl.textContent = lat + 'ms';
      if (this.wasmPanel.classList.contains('wasm-panel-open')) {
        this.updateWasmPerformanceChart(lat);
      }
    }, 300);
  },

  // ── 3. Router ─────────────────────────────────────────────────────────────
  async route() {
    if (this.isPlayingTransition) return;

    const hash   = window.location.hash || '#menu';
    const path   = hash.substring(1);
    const parts  = path.split('/');
    const target = parts[0];

    // Update header nav active state
    this.updateNavActive(target);

    if (target === 'menu' || target === '') {
      this.loadMenu();
    } else {
      this.isPlayingTransition = true;
      await this.playTransitionAndLoad(target, parts);
      this.isPlayingTransition = false;
    }
  },

  updateNavActive(route) {
    if (!this.headerNav) return;
    this.headerNav.querySelectorAll('.header-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === route);
    });
  },

  // ── 4. Menu ───────────────────────────────────────────────────────────────
  async loadMenu() {
    this.currentRoute = 'menu';
    this.clearModuleStyles();

    const { initModule } = await import('./src/pages/menu.js');
    this.routerView.innerHTML = '';
    initModule(this.routerView);
    WASM_SIM.log('Menu rendered', 'info');
  },

  // ── 5. Transition + Module Load ───────────────────────────────────────────
  async playTransitionAndLoad(moduleName, parts) {
    let albumData = null;

    // Album detail: pass album info for custom transition graphic
    if (moduleName === 'album-detail' && parts[1]) {
      albumData = ALBUM_DB.find(a => a.id === parts[1]) || null;
    }

    // 5-second transition (video or canvas)
    await TransitionEngine.play(moduleName, albumData);

    // Load the module
    await this.loadModule(moduleName, parts);
  },

  // ── 6. Dynamic Module Import ──────────────────────────────────────────────
  async loadModule(moduleName, parts) {
    this.currentRoute = moduleName;
    this.clearModuleStyles();

    const pathMap = {
      mix           : './src/pages/mix/mix.js',
      beat          : './src/pages/beat/beat.js',
      vokal         : './src/pages/vokal/vokal.js',
      discography   : './src/pages/discography/discography.js',
      'album-detail': './src/pages/album-detail/album-detail.js',
    };
    const cssMap = {
      mix           : 'src/pages/mix/mix.css',
      beat          : 'src/pages/beat/beat.css',
      vokal         : 'src/pages/vokal/vokal.css',
      discography   : 'src/pages/discography/discography.css',
      'album-detail': 'src/pages/album-detail/album-detail.css',
    };

    const jsPath  = pathMap[moduleName];
    const cssPath = cssMap[moduleName];

    if (!jsPath) {
      this.showModuleError(`Unknown module: ${moduleName}`);
      return;
    }

    try {
      // Inject module CSS
      const link = document.createElement('link');
      link.id   = 'module-styles';
      link.rel  = 'stylesheet';
      link.href = cssPath + '?v=' + Date.now();
      document.head.appendChild(link);

      // Dynamic import
      const { initModule } = await import(jsPath + '?v=' + Date.now());
      this.routerView.innerHTML = '';
      await new Promise(r => setTimeout(r, 30)); // allow CSS parse
      initModule(this.routerView, parts);

      WASM_SIM.log(`Module ${moduleName.toUpperCase()} loaded into runtime`, 'success');
    } catch (err) {
      console.error('[App] Module load error:', err);
      this.showModuleError(err.message);
    }
  },

  clearModuleStyles() {
    document.getElementById('module-styles')?.remove();
    // Reset album theme on non-album routes
    const themeLink = document.getElementById('album-theme-styles');
    if (themeLink && this.currentRoute !== 'album-detail') themeLink.href = '';
  },

  showModuleError(msg) {
    this.routerView.innerHTML = `
      <div style="padding:60px;text-align:center;font-family:var(--font-mono);">
        <h2 style="color:var(--accent-red);letter-spacing:4px;">ERROR: MODULE INJECTION FAILED</h2>
        <p style="margin-top:20px;color:var(--text-muted);font-size:12px;">${msg}</p>
        <a href="#menu" style="display:inline-block;margin-top:36px;border:1px solid var(--accent-red);padding:10px 24px;text-decoration:none;color:#fff;font-size:11px;letter-spacing:3px;">RETURN TO BOOT MENU</a>
      </div>`;
  },

  // ── 7. Inject CSS utility ─────────────────────────────────────────────────
  injectStyles(id, css) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    el.textContent = css;
  },

  // ── 8. WASM Panel ─────────────────────────────────────────────────────────
  initWasmPanel() {
    this.wasmPanel.innerHTML = `
      <div class="wasm-header">
        <div class="wasm-title">WASM INTERNALS // C PROCESS CONTROL</div>
        <button class="wasm-close-btn" id="wasm-close">✕</button>
      </div>
      <div class="wasm-body">
        <div>
          <div class="wasm-section-title">ACTIVE INTERPRETER ENGINE</div>
          <div class="wasm-engine-switch">
            <button class="wasm-switch-btn active wasm-mode" id="btn-wasm-wasm">C / WASM COMPILER</button>
            <button class="wasm-switch-btn" id="btn-wasm-js">JS V8 ENGINE</button>
          </div>
        </div>
        <div>
          <div class="wasm-section-title">DSP C STRUCTURE INTERFACE</div>
          <pre class="wasm-code-block" id="wasm-c-code"></pre>
        </div>
        <div>
          <div class="wasm-section-title">HEAP STACK POINTER MAPPING</div>
          <div class="wasm-memory-map" id="wasm-mem-list"></div>
        </div>
        <div>
          <div class="wasm-section-title">
            <span>PERFORMANCE LATENCY STATS</span>
            <span id="wasm-perf-val" style="color:var(--accent-green);">1.2ms</span>
          </div>
          <div class="wasm-performance-chart" id="wasm-perf-chart"></div>
        </div>
        <div>
          <div class="wasm-section-title">C ENGINE STDOUT LOGS</div>
          <div class="wasm-console-logs" id="wasm-console"></div>
        </div>
      </div>
    `;

    document.getElementById('wasm-close').onclick = () => {
      this.wasmPanel.classList.add('wasm-panel-closed');
      this.wasmPanel.classList.remove('wasm-panel-open');
    };

    // Syntax-highlighted C code
    const codeEl = document.getElementById('wasm-c-code');
    let highlighted = WASM_SIM.getCSourceCode()
      .replace(/(typedef struct|struct|void|int|float|char)/g, '<span class="wasm-c-type">$1</span>')
      .replace(/(#include|#define|#pragma)/g, '<span class="wasm-c-keyword">$1</span>')
      .replace(/(malloc|calloc|create_channel|process_channel_dsp|EMSCRIPTEN_KEEPALIVE|free_channel)/g, '<span class="wasm-c-def">$1</span>')
      .replace(/(\/\/.*)/g, '<span class="wasm-c-comment">$1</span>');
    codeEl.innerHTML = highlighted;

    // Engine toggle
    const btnWasm = document.getElementById('btn-wasm-wasm');
    const btnJs   = document.getElementById('btn-wasm-js');
    btnWasm.onclick = () => { btnWasm.classList.add('active','wasm-mode'); btnJs.classList.remove('active'); WASM_SIM.setEngine('wasm'); };
    btnJs.onclick   = () => { btnJs.classList.add('active'); btnWasm.classList.remove('active','wasm-mode'); WASM_SIM.setEngine('js'); };

    // Live log callback
    WASM_SIM.onLogCallback = log => {
      const el = document.getElementById('wasm-console');
      if (!el) return;
      const line = document.createElement('div');
      line.className = `wasm-log-line wasm-${log.type}`;
      line.textContent = `[${log.timestamp}] ${log.message}`;
      el.appendChild(line);
      el.scrollTop = el.scrollHeight;
      // Cap at 150 lines
      while (el.children.length > 150) el.removeChild(el.firstChild);
    };

    WASM_SIM.onMemoryUpdateCallback = () => this.renderMemoryHeap();
    this.renderMemoryHeap();
  },

  renderMemoryHeap() {
    const el = document.getElementById('wasm-mem-list');
    if (!el) return;
    el.innerHTML = WASM_SIM.allocatedBlocks.map(b => {
      const isWrite = b.accessType==='write' && (Date.now()-b.lastAccess < 600);
      const isRead  = b.accessType==='read'  && (Date.now()-b.lastAccess < 600);
      const cls = isWrite ? 'active-write' : isRead ? 'active-read' : '';
      return `<div class="wasm-mem-cell ${cls}">
        <span style="color:var(--text-main);font-weight:600;">${b.name}</span>
        <span style="color:var(--text-muted);">0x${b.address.toString(16).toUpperCase()}</span>
        <span style="color:var(--accent-purple);font-size:9px;">${b.type}</span>
        <span style="color:var(--text-muted);font-size:9px;">${b.size}B</span>
      </div>`;
    }).join('');
  },

  updateWasmPerformanceChart(lat) {
    const chart  = document.getElementById('wasm-perf-chart');
    const valEl  = document.getElementById('wasm-perf-val');
    if (!chart) return;
    valEl.textContent = lat + ' ms';
    valEl.style.color = WASM_SIM.activeEngine === 'wasm' ? 'var(--accent-green)' : 'var(--accent-purple)';
    chart.innerHTML = WASM_SIM.latencyHistory.map(v => {
      const h = Math.min((v / 20) * 100, 100);
      const cls = WASM_SIM.activeEngine === 'wasm' ? 'wasm-run' : 'js-run';
      return `<div class="wasm-chart-bar ${cls}" style="height:${h}px;"></div>`;
    }).join('');
  }
};
