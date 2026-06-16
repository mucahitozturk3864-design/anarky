/* ==========================================================================
   ANARKY DAW v2.0 — VOKAL MODULE
   Real-time mic processing, 8 DSP effects, waveform visualizer
   ========================================================================== */

import AudioEngine from '../../components/AudioEngine.js';
import { WASM_SIM } from '../../../wasm/wasm_sim.js';

// ── Effect Definitions ───────────────────────────────────────────────────────
const EFFECTS = [
  { id: 'autotune', name: 'AUTOTUNE',  icon: '🎵', desc: 'Chromatic pitch correction',      color: '#00ff66' },
  { id: 'robot',    name: 'ROBOTİK',   icon: '🤖', desc: 'Vocoder-style ring modulation',    color: '#00d4ff' },
  { id: 'devil',    name: 'ŞEYTANİ',   icon: '😈', desc: 'Sub-octave pitch shifting',        color: '#ff003c' },
  { id: 'void',     name: 'VOID',      icon: '🌀', desc: 'Deep reverb spatial void',         color: '#8c00ff' },
  { id: 'hellfire', name: 'HELLFIRE',  icon: '🔥', desc: 'Extreme harmonic distortion',      color: '#ff6600' },
  { id: 'ghost',    name: 'GHOST',     icon: '👻', desc: 'Chorus + delay phantom echo',      color: '#94a3b8' },
  { id: 'corrupted',name: 'CORRUPTED', icon: '💀', desc: 'Bit-crush glitch degradation',     color: '#ff00d0' },
  { id: 'whisper',  name: 'WHISPER',   icon: '💨', desc: 'Airy high-pass intimacy filter',   color: '#e2e8f0' },
];

// ── State ────────────────────────────────────────────────────────────────────
const STATE = {
  micStream      : null,
  sourceNode     : null,
  analyser       : null,
  armed          : false,
  playing        : false,
  activeEffects  : [],         // array of effect IDs
  effectIntensity: {},         // id → 0-1
  canvasAnimId   : null,
};
EFFECTS.forEach(e => { STATE.effectIntensity[e.id] = 0.6; });

export function initModule(container) {
  container.innerHTML = buildHTML();
  WASM_SIM.allocateBlock('VocalEffectChain', 512, 'VocalEffect[8]');
  WASM_SIM.log('Vokal module loaded — DSP voice processor online', 'success');
  bindEvents();
}

function buildHTML() {
  return `
  <div class="vokal-container">
    <div class="vokal-header">
      <h2>VOCAL BOOTH</h2>
      <span class="vokal-status-badge" id="vokal-status">STANDBY</span>
    </div>

    <div class="vokal-main">
      <!-- LEFT: Mic + Chain -->
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div class="vokal-mic-panel">
          <!-- Waveform visualizer -->
          <div class="mic-visualizer">
            <canvas class="mic-canvas" id="mic-canvas"></canvas>
            <div class="mic-vis-label">MIC INPUT WAVEFORM</div>
            <div class="mic-vis-level" id="mic-level">0 dB</div>
          </div>

          <!-- Controls -->
          <div class="mic-controls">
            <button class="mic-btn arm-btn" id="arm-btn">🎙 ARM MIC</button>
            <button class="mic-btn play-btn" id="monitor-btn" disabled>▶ MONITOR</button>
          </div>

          <!-- Active chain display -->
          <div class="vokal-chain-display">
            <div class="chain-title">ACTIVE EFFECT CHAIN</div>
            <div class="chain-items" id="chain-items">
              <span style="color:var(--text-dark);font-size:9px;letter-spacing:1px;">— NO EFFECTS ENGAGED —</span>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Effects grid -->
      <div class="vokal-effects-panel">
        <div class="effects-title">DSP EFFECT CHAIN // 8 PROCESSORS</div>
        <div class="effects-grid">
          ${EFFECTS.map(eff => `
            <div class="effect-card" id="eff-${eff.id}" data-id="${eff.id}"
              style="--e-color:${eff.color}">
              <div class="effect-active-dot"></div>
              <div class="effect-icon">${eff.icon}</div>
              <div class="effect-name">${eff.name}</div>
              <div class="effect-desc">${eff.desc}</div>
              <div class="effect-intensity-row">
                <span class="effect-intensity-label">INT</span>
                <input type="range" class="effect-intensity-slider"
                  min="0" max="100" value="60" data-eff="${eff.id}"
                  style="--e-color:${eff.color}">
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>
  `;
}

function bindEvents() {
  // ARM mic
  document.getElementById('arm-btn').addEventListener('click', toggleArm);
  document.getElementById('monitor-btn').addEventListener('click', toggleMonitor);

  // Effect card clicks
  document.querySelectorAll('.effect-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.type === 'range') return;
      const id = card.dataset.id;
      toggleEffect(id);
    });
  });

  // Intensity sliders
  document.querySelectorAll('.effect-intensity-slider').forEach(slider => {
    slider.addEventListener('input', e => {
      e.stopPropagation();
      const id = slider.dataset.eff;
      STATE.effectIntensity[id] = slider.value / 100;
    });
  });
}

async function toggleArm() {
  const btn    = document.getElementById('arm-btn');
  const monBtn = document.getElementById('monitor-btn');
  const status = document.getElementById('vokal-status');

  if (STATE.armed) {
    // DISARM
    if (STATE.micStream) { STATE.micStream.getTracks().forEach(t => t.stop()); STATE.micStream = null; }
    if (STATE.canvasAnimId) { cancelAnimationFrame(STATE.canvasAnimId); STATE.canvasAnimId = null; }
    STATE.armed = false;
    btn.classList.remove('armed');
    btn.textContent = '🎙 ARM MIC';
    monBtn.disabled = true;
    monBtn.classList.remove('active');
    STATE.playing = false;
    status.textContent = 'STANDBY';
    status.classList.remove('recording');
    clearCanvas();
  } else {
    // ARM — request mic
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      STATE.micStream = stream;
      STATE.armed = true;
      btn.classList.add('armed');
      btn.textContent = '⏹ DISARM';
      monBtn.disabled = false;
      status.textContent = 'MIC ARMED';
      status.classList.add('recording');
      WASM_SIM.log('Microphone access granted — stream connected', 'success');

      // Build analyser
      if (AudioEngine.isReady) {
        STATE.sourceNode = AudioEngine.ctx.createMediaStreamSource(stream);
        STATE.analyser   = AudioEngine.ctx.createAnalyser();
        STATE.analyser.fftSize = 2048;
        STATE.sourceNode.connect(STATE.analyser);
        startWaveformDraw();
      }
    } catch (err) {
      WASM_SIM.log('Mic access denied: ' + err.message, 'error');
      status.textContent = 'MIC DENIED';
    }
  }
}

function toggleMonitor() {
  const btn = document.getElementById('monitor-btn');
  if (!STATE.armed || !AudioEngine.isReady) return;

  if (STATE.playing) {
    STATE.playing = false;
    btn.textContent = '▶ MONITOR';
    btn.classList.remove('active');
    // Disconnect from output
    if (STATE.effectChainOut) {
      try { STATE.effectChainOut.disconnect(AudioEngine.masterGain); } catch {}
    }
  } else {
    STATE.playing = true;
    btn.textContent = '⏹ STOP';
    btn.classList.add('active');
    buildAndConnectEffectChain();
    WASM_SIM.log(`Monitoring with effects: [${STATE.activeEffects.join(', ') || 'NONE'}]`, 'info');
  }
}

function toggleEffect(id) {
  const card = document.getElementById(`eff-${id}`);
  const idx  = STATE.activeEffects.indexOf(id);

  if (idx === -1) {
    STATE.activeEffects.push(id);
    card.classList.add('active');
    WASM_SIM.triggerAccess('VocalEffectChain', 'write');
    WASM_SIM.log(`Effect engaged: ${id.toUpperCase()}`, 'info');
  } else {
    STATE.activeEffects.splice(idx, 1);
    card.classList.remove('active');
    WASM_SIM.log(`Effect removed: ${id.toUpperCase()}`, 'warn');
  }

  updateChainDisplay();

  // Rebuild chain live if monitoring
  if (STATE.playing) buildAndConnectEffectChain();
}

function updateChainDisplay() {
  const el = document.getElementById('chain-items');
  if (STATE.activeEffects.length === 0) {
    el.innerHTML = `<span style="color:var(--text-dark);font-size:9px;letter-spacing:1px;">— NO EFFECTS ENGAGED —</span>`;
    return;
  }
  el.innerHTML = STATE.activeEffects.map(id => {
    const eff = EFFECTS.find(e => e.id === id);
    return `<div class="chain-item" style="--e-color:${eff.color};border-color:${eff.color}40;color:${eff.color};">
      ${eff.icon} ${eff.name}
      <button onclick="document.getElementById('eff-${id}').click()">✕</button>
    </div>`;
  }).join('');
}

// Build Web Audio graph for active effects
let _effectNodes = [];
function buildAndConnectEffectChain() {
  if (!AudioEngine.isReady || !STATE.sourceNode) return;
  const ctx = AudioEngine.ctx;

  // Disconnect old chain
  _effectNodes.forEach(n => { try { n.disconnect(); } catch {} });
  _effectNodes = [];
  try { STATE.sourceNode.disconnect(AudioEngine.masterGain); } catch {}

  let current = STATE.sourceNode;

  for (const id of STATE.activeEffects) {
    const intensity = STATE.effectIntensity[id];
    let node;

    switch (id) {
      case 'autotune': {
        // Subtle pitch quantize simulation via slight vibrato LFO
        const lfo = ctx.createOscillator();
        const lfog = ctx.createGain();
        lfo.frequency.value = 5;
        lfog.gain.value = intensity * 3;
        lfo.connect(lfog);
        node = ctx.createGain();
        lfo.start();
        current.connect(node);
        _effectNodes.push(lfo, lfog, node);
        current = node;
        break;
      }
      case 'robot': {
        // Ring modulator
        const carrier = ctx.createOscillator();
        const ring    = ctx.createGain();
        carrier.frequency.value = 80 + intensity * 120;
        carrier.type = 'square';
        carrier.start();
        current.connect(ring);
        carrier.connect(ring.gain);
        _effectNodes.push(carrier, ring);
        current = ring;
        break;
      }
      case 'devil': {
        // Low octave + filter
        const bq = ctx.createBiquadFilter();
        bq.type = 'lowpass';
        bq.frequency.value = 400 - intensity * 250;
        bq.Q.value = 8;
        const gain = ctx.createGain();
        gain.gain.value = 1 + intensity * 2;
        current.connect(bq);
        bq.connect(gain);
        _effectNodes.push(bq, gain);
        current = gain;
        break;
      }
      case 'void': {
        // Long reverb
        const conv = ctx.createConvolver();
        const len  = ctx.sampleRate * 3 * intensity;
        const buf  = ctx.createBuffer(2, len, ctx.sampleRate);
        [0,1].forEach(ch => {
          const d = buf.getChannelData(ch);
          for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.exp(-3*i/len);
        });
        conv.buffer = buf;
        current.connect(conv);
        _effectNodes.push(conv);
        current = conv;
        break;
      }
      case 'hellfire': {
        // Distortion
        const shaper = ctx.createWaveShaper();
        shaper.curve = makeDistCurve(100 + intensity * 400);
        current.connect(shaper);
        _effectNodes.push(shaper);
        current = shaper;
        break;
      }
      case 'ghost': {
        // Chorus/delay
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.03 + intensity * 0.04;
        const fb = ctx.createGain();
        fb.gain.value = 0.4;
        delay.connect(fb);
        fb.connect(delay);
        current.connect(delay);
        _effectNodes.push(delay, fb);
        current = delay;
        break;
      }
      case 'corrupted': {
        // Bitcrusher via step quantize shaper
        const shaper = ctx.createWaveShaper();
        const bits   = Math.max(1, 8 - Math.floor(intensity * 6));
        const steps  = Math.pow(2, bits);
        const curve  = new Float32Array(65536);
        for (let i = 0; i < 65536; i++) {
          const x = i / 32768 - 1;
          curve[i] = Math.round(x * steps) / steps;
        }
        shaper.curve = curve;
        current.connect(shaper);
        _effectNodes.push(shaper);
        current = shaper;
        break;
      }
      case 'whisper': {
        // High-pass filter
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 200 + intensity * 2000;
        hp.Q.value = 0.7;
        current.connect(hp);
        _effectNodes.push(hp);
        current = hp;
        break;
      }
    }
  }

  STATE.effectChainOut = current;
  current.connect(AudioEngine.masterGain);
}

function makeDistCurve(amount) {
  const k = amount;
  const n = 44100;
  const curve = new Float32Array(n);
  for (let i=0;i<n;i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ── Waveform Visualizer ──────────────────────────────────────────────────────
function startWaveformDraw() {
  const canvas = document.getElementById('mic-canvas');
  const ctx2d  = canvas.getContext('2d');
  const data   = new Uint8Array(STATE.analyser.frequencyBinCount);

  const draw = () => {
    STATE.canvasAnimId = requestAnimationFrame(draw);
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    STATE.analyser.getByteTimeDomainData(data);

    ctx2d.fillStyle = '#050507';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);

    ctx2d.strokeStyle = 'rgba(0,255,102,0.8)';
    ctx2d.lineWidth   = 1.5;
    ctx2d.beginPath();

    const sliceW = canvas.width / data.length;
    let x = 0;
    for (let i=0; i<data.length; i++) {
      const v = data[i] / 128;
      const y = (v * canvas.height) / 2;
      i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
      x += sliceW;
    }
    ctx2d.stroke();

    // Level meter
    let sum = 0;
    for (let i=0;i<data.length;i++) sum += Math.abs(data[i]-128);
    const rms = sum / data.length;
    const db  = rms > 0 ? (20 * Math.log10(rms / 128)).toFixed(1) : '-∞';
    const levelEl = document.getElementById('mic-level');
    if (levelEl) levelEl.textContent = `${db} dB`;
  };
  draw();
}

function clearCanvas() {
  const canvas = document.getElementById('mic-canvas');
  if (!canvas) return;
  const ctx2d = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx2d.fillStyle = '#050507';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  const levelEl = document.getElementById('mic-level');
  if (levelEl) levelEl.textContent = '0 dB';
}
