/* ==========================================================================
   ANARKY DAW v2.0 — BEAT SEQUENCER MODULE
   16-step grid, Web Audio synthesis, MediaRecorder export
   Includes custom instrument presets and a playable gothic synthesizer keyboard.
   ========================================================================== */

import AudioEngine from '../../components/AudioEngine.js';
import { WASM_SIM } from '../../../wasm/wasm_sim.js';

// ── State ────────────────────────────────────────────────────────────────────
const ROWS = [
  { name: 'ROW 1', color: '#ff003c' },
  { name: 'ROW 2', color: '#8c00ff' },
  { name: 'ROW 3', color: '#00ff66' },
  { name: 'ROW 4', color: '#00d4ff' },
  { name: 'ROW 5', color: '#ff6600' },
  { name: 'ROW 6', color: '#ff00d0' },
];
const STEPS = 16;

const KEYS = [
  { note: 'C4',  freq: 261.63, class: 'white', char: 'A' },
  { note: 'C#4', freq: 277.18, class: 'black', char: 'W' },
  { note: 'D4',  freq: 293.66, class: 'white', char: 'S' },
  { note: 'D#4', freq: 311.13, class: 'black', char: 'E' },
  { note: 'E4',  freq: 329.63, class: 'white', char: 'D' },
  { note: 'F4',  freq: 349.23, class: 'white', char: 'F' },
  { note: 'F#4', freq: 369.99, class: 'black', char: 'T' },
  { note: 'G4',  freq: 392.00, class: 'white', char: 'G' },
  { note: 'G#4', freq: 415.30, class: 'black', char: 'Y' },
  { note: 'A4',  freq: 440.00, class: 'white', char: 'H' },
  { note: 'A#4', freq: 466.16, class: 'black', char: 'U' },
  { note: 'B4',  freq: 493.88, class: 'white', char: 'J' },
  { note: 'C5',  freq: 523.25, class: 'white', char: 'K' },
];

const PRESETS = {
  KICK: { name: '⛧ KICK', type: 'drum', trigger: triggerKick },
  SNARE: { name: '⛧ SNARE', type: 'drum', trigger: triggerSnare },
  'HI-HAT': { name: '⛧ HI-HAT', type: 'drum', trigger: triggerHihat },
  CLAP: { name: '⛧ CLAP', type: 'drum', trigger: triggerClap },
  BASS: { name: '⛧ BASS DRUM', type: 'drum', trigger: triggerBassDrum },
  PERC: { name: '⛧ PERC', type: 'drum', trigger: triggerPerc },
  
  CHOIR: { name: '🜏 GOTHIC CHOIR', type: 'instrument', trigger: triggerChoir },
  ORGAN: { name: '🜎 CHURCH ORGAN', type: 'instrument', trigger: triggerOrgan },
  LEAD: { name: '🜍 OCCULT LEAD', type: 'instrument', trigger: triggerLead },
  DOOMBASS: { name: '🜌 DOOM BASS', type: 'instrument', trigger: triggerDoomBass },
  BELL: { name: '🜋 GOTHIC BELL', type: 'instrument', trigger: triggerBell },
};

const STATE = {
  bpm      : 128,
  playing  : false,
  recording: false,
  currentStep: 0,
  stepTimerId: null,
  grid: ROWS.map(() => Array(STEPS).fill(false)),
  rowPresets: ['KICK', 'SNARE', 'HI-HAT', 'CLAP', 'BASS', 'PERC'],
  currentInstrument: 'CHOIR',

  // Synth params
  attack : 0.005,
  release: 0.3,
  reverb : 0.2,
  drive  : 0.0,

  // Recording
  recorderNode   : null,
  leftBuffers    : [],
  rightBuffers   : [],
  recordedBlob   : null,
};

// ── Init ──────────────────────────────────────────────────────────────────────
export function initModule(container) {
  container.innerHTML = buildHTML();
  WASM_SIM.allocateBlock('BeatStepBuffer', 256, 'BeatStep[16]');
  WASM_SIM.log('Beat module loaded — 16-step sequencer & instrument synth', 'success');
  loadFromStorage();
  bindEvents();
}

// ── HTML Build ────────────────────────────────────────────────────────────────
function buildHTML() {
  return `
  <div class="beat-container">
    <div class="beat-header">
      <h2>SEQUENCER GRID</h2>
      <div class="beat-bpm-wrap">
        <span class="beat-bpm-label">BPM</span>
        <input class="beat-bpm-input" id="bpm-input" type="number" min="60" max="200" value="${STATE.bpm}">
      </div>
      <div class="beat-transport">
        <button class="beat-transport-btn play" id="seq-play">▶ PLAY</button>
        <button class="beat-transport-btn" id="seq-clear">CLEAR</button>
        <button class="beat-transport-btn" id="seq-save">SAVE</button>
        <button class="beat-transport-btn rec" id="seq-rec">⏺ REC</button>
      </div>
    </div>

    <!-- Step number row -->
    <div class="beat-sequencer">
      <div class="beat-grid-row" style="height:22px;">
        <div class="beat-row-label" style="font-size:8px;color:var(--text-dark);display:flex;align-items:center;padding:0 14px;">STEP</div>
        <div class="beat-step-numbers">
          ${Array.from({length:STEPS},(_,i)=>`<div class="beat-step-num">${i+1}</div>`).join('')}
        </div>
      </div>

      ${ROWS.map((row, ri) => `
      <div class="beat-grid-row">
        <div class="beat-row-label" style="display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;padding:8px 14px;">
          <div style="display:flex;align-items:center;font-size:9px;font-weight:bold;">
            <span style="background:${row.color};"></span>
            ROW ${ri+1}
          </div>
          <select class="beat-row-preset-select" id="row-select-${ri}" data-row="${ri}">
            ${Object.keys(PRESETS).map(key => `
              <option value="${key}" ${STATE.rowPresets[ri] === key ? 'selected' : ''}>
                ${PRESETS[key].name}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="beat-steps">
          ${Array.from({length:STEPS},(_,si) => `
            <div class="beat-step ${STATE.grid[ri][si]?'active':''}"
              data-row="${ri}" data-step="${si}" id="step-${ri}-${si}">
            </div>
          `).join('')}
        </div>
      </div>
      `).join('')}
    </div>

    <!-- Synth Knobs -->
    <div class="beat-synth-panel">
      ${[
        {id:'knob-attack', label:'ATTACK',  val:'5ms',  deg:-120},
        {id:'knob-release',label:'RELEASE', val:'300ms', deg:0},
        {id:'knob-reverb', label:'REVERB',  val:'20%',  deg:-60},
        {id:'knob-drive',  label:'DRIVE',   val:'0%',   deg:-120},
      ].map(k=>`
        <div class="synth-knob-group">
          <div class="synth-knob-label">${k.label}</div>
          <div class="synth-knob" id="${k.id}" data-deg="${k.deg}" style="cursor:grab;">
            <div class="synth-knob-tick" style="transform:translateX(-50%) rotate(${k.deg}deg);transform-origin:bottom center;"></div>
          </div>
          <div class="synth-knob-value" id="${k.id}-val">${k.val}</div>
        </div>
      `).join('')}
    </div>

    <!-- ⛧ Coven Synthesizer Panel ⛧ -->
    <div class="beat-keyboard-panel">
      <div class="beat-keyboard-title">⛧ &nbsp; COVEN SYNTHESIZER — MELODIC INSTRUMENT &nbsp; ⛧</div>
      
      <!-- Instrument select buttons -->
      <div class="beat-instrument-select-row">
        ${['CHOIR', 'ORGAN', 'LEAD', 'DOOMBASS', 'BELL'].map(inst => `
          <button class="beat-inst-btn ${STATE.currentInstrument === inst ? 'active' : ''}" 
                  id="inst-btn-${inst}" data-inst="${inst}">
            ${PRESETS[inst].name}
          </button>
        `).join('')}
      </div>
      
      <!-- Virtual piano keys -->
      <div class="beat-keyboard-keys-wrap">
        <div class="beat-keyboard-keys">
          ${KEYS.map(key => `
            <div class="kb-key ${key.class}" id="kb-key-${key.note}" data-freq="${key.freq}" data-note="${key.note}">
              <span class="key-note">${key.note}</span>
              <span class="key-char">${key.char}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Recording Panel -->
    <div class="beat-record-panel">
      <div class="beat-record-status" id="rec-status">RECORDER READY</div>
      <button class="beat-download-btn" id="dl-btn">⬇ DOWNLOAD .WAV</button>
    </div>
  </div>
  `;
}

// ── Event Binding ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Play/Stop
  document.getElementById('seq-play').addEventListener('click', togglePlay);
  document.getElementById('seq-clear').addEventListener('click', clearGrid);
  document.getElementById('seq-save').addEventListener('click', saveToStorage);
  document.getElementById('seq-rec').addEventListener('click', toggleRecording);
  document.getElementById('dl-btn').addEventListener('click', downloadRecording);
  document.getElementById('bpm-input').addEventListener('change', e => {
    STATE.bpm = Math.min(200, Math.max(60, parseInt(e.target.value) || 128));
    if (STATE.playing) { clearTimeout(STATE.stepTimerId); scheduleNext(); }
  });

  // Grid steps
  document.querySelectorAll('.beat-step').forEach(el => {
    el.addEventListener('click', () => {
      const ri = parseInt(el.dataset.row);
      const si = parseInt(el.dataset.step);
      STATE.grid[ri][si] = !STATE.grid[ri][si];
      el.classList.toggle('active', STATE.grid[ri][si]);
      WASM_SIM.triggerAccess('BeatStepBuffer', 'write');
    });
  });

  // Knob drag interactions
  bindKnobDrag('knob-attack',  (v)=>{ STATE.attack  = 0.001 + v*0.1;  document.getElementById('knob-attack-val').textContent  = `${Math.round(v*100)}ms`; });
  bindKnobDrag('knob-release', (v)=>{ STATE.release = 0.05 + v*0.8;  document.getElementById('knob-release-val').textContent = `${Math.round((0.05+v*0.8)*1000)}ms`; });
  bindKnobDrag('knob-reverb',  (v)=>{ STATE.reverb  = v;              document.getElementById('knob-reverb-val').textContent  = `${Math.round(v*100)}%`; });
  bindKnobDrag('knob-drive',   (v)=>{ STATE.drive   = v;              document.getElementById('knob-drive-val').textContent   = `${Math.round(v*100)}%`; });

  // Dropdown preset selectors
  document.querySelectorAll('.beat-row-preset-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const ri = parseInt(sel.dataset.row);
      STATE.rowPresets[ri] = e.target.value;
      saveToStorage();
    });
  });

  // Instrument select buttons
  document.querySelectorAll('.beat-inst-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.beat-inst-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.currentInstrument = btn.dataset.inst;
    });
  });

  // Virtual piano keys mouse interactions
  document.querySelectorAll('.kb-key').forEach(key => {
    key.addEventListener('mousedown', () => {
      if (!AudioEngine.isReady) AudioEngine.init();
      key.classList.add('active');
      const freq = parseFloat(key.dataset.freq);
      triggerInstrument(STATE.currentInstrument, freq);
    });
    key.addEventListener('mouseup', () => { key.classList.remove('active'); });
    key.addEventListener('mouseleave', () => { key.classList.remove('active'); });
  });

  // Computer keyboard play triggers
  const keyMap = {};
  KEYS.forEach(k => { keyMap[k.char.toLowerCase()] = k; });
  const activeComputerKeys = new Set();

  window.addEventListener('keydown', e => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    
    const char = e.key.toLowerCase();
    const keyData = keyMap[char];
    if (keyData && !activeComputerKeys.has(char)) {
      if (!AudioEngine.isReady) AudioEngine.init();
      activeComputerKeys.add(char);
      const el = document.getElementById(`kb-key-${keyData.note}`);
      if (el) el.classList.add('active');
      triggerInstrument(STATE.currentInstrument, keyData.freq);
    }
  });

  window.addEventListener('keyup', e => {
    const char = e.key.toLowerCase();
    if (activeComputerKeys.has(char)) {
      activeComputerKeys.delete(char);
      const keyData = keyMap[char];
      if (keyData) {
        const el = document.getElementById(`kb-key-${keyData.note}`);
        if (el) el.classList.remove('active');
      }
    }
  });
}

function bindKnobDrag(id, onChange) {
  const el = document.getElementById(id);
  const tick = el.querySelector('.synth-knob-tick');
  let dragging = false;
  let startY = 0;
  let startDeg = parseInt(el.dataset.deg);
  let curDeg = startDeg;

  el.addEventListener('mousedown', e => { dragging = true; startY = e.clientY; e.preventDefault(); });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = (startY - e.clientY) * 1.5;
    curDeg = Math.max(-135, Math.min(135, startDeg + delta));
    tick.style.transform = `translateX(-50%) rotate(${curDeg}deg)`;
    tick.style.transformOrigin = 'bottom center';
    const norm = (curDeg + 135) / 270;
    onChange(norm);
  });
  window.addEventListener('mouseup', () => { if (dragging) { dragging = false; startDeg = curDeg; } });
}

// ── Sequencer Play Loop ───────────────────────────────────────────────────────
function togglePlay() {
  const btn = document.getElementById('seq-play');
  if (STATE.playing) {
    STATE.playing = false;
    clearTimeout(STATE.stepTimerId);
    highlightStep(-1);
    btn.textContent = '▶ PLAY';
    btn.classList.remove('active');
  } else {
    if (!AudioEngine.isReady) AudioEngine.init();
    if (AudioEngine.isReady && AudioEngine.ctx.state === 'suspended') {
      AudioEngine.ctx.resume();
    }
    STATE.playing = true;
    STATE.currentStep = 0;
    btn.textContent = '⏹ STOP';
    btn.classList.add('active');
    scheduleNext();
  }
}

function scheduleNext() {
  if (!STATE.playing) return;
  fireStep(STATE.currentStep);
  highlightStep(STATE.currentStep);
  STATE.currentStep = (STATE.currentStep + 1) % STEPS;
  const interval = (60000 / STATE.bpm) / 4; // 16th notes
  STATE.stepTimerId = setTimeout(scheduleNext, interval);
}

function fireStep(si) {
  ROWS.forEach((_, ri) => {
    if (STATE.grid[ri][si]) {
      const presetKey = STATE.rowPresets[ri];
      const stepTime = AudioEngine.ctx.currentTime;
      triggerPreset(presetKey, stepTime);
    }
  });
}

// ── Sentezleyici Tetikleyicileri ──────────────────────────────────────────────
function triggerPreset(presetKey, time) {
  if (!AudioEngine.isReady) return;
  const conf = PRESETS[presetKey];
  if (!conf) return;

  if (conf.type === 'drum') {
    conf.trigger(time);
  } else {
    // Default pitch assignment for sequencer instruments
    let freq = 261.63; // C4
    if (presetKey === 'CHOIR') freq = 440.0; // A4
    else if (presetKey === 'ORGAN') freq = 261.63;
    else if (presetKey === 'LEAD') freq = 329.63; // E4
    else if (presetKey === 'DOOMBASS') freq = 110.0; // A2
    else if (presetKey === 'BELL') freq = 440.0;
    
    conf.trigger(freq, time);
  }
}

function triggerInstrument(instKey, freq, time) {
  if (!AudioEngine.isReady) return;
  const now = time || AudioEngine.ctx.currentTime;
  const conf = PRESETS[instKey];
  if (conf && conf.type === 'instrument') {
    conf.trigger(freq, now);
  }
}

// ── DSP Rack Connection Helper ──────────────────────────────────────────────
function connectMasterWithEffects(gainNode, time, decay) {
  const ctx = AudioEngine.ctx;
  let target = AudioEngine.masterGain;

  // Drive/Distortion
  if (STATE.drive > 0.05) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(STATE.drive * 40);
    shaper.oversample = '4x';
    gainNode.connect(shaper);
    gainNode = shaper;
  }

  // Reverb Send
  if (STATE.reverb > 0.05) {
    const convolver = ctx.createConvolver();
    const len  = ctx.sampleRate * 1.2 * STATE.reverb;
    const buf  = ctx.createBuffer(2, len, ctx.sampleRate);
    [0,1].forEach(ch => {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * (1 - i/len);
    });
    convolver.buffer = buf;

    const revGain = ctx.createGain();
    revGain.gain.setValueAtTime(STATE.reverb * 0.35, time);

    gainNode.connect(revGain);
    revGain.connect(convolver);
    convolver.connect(target);
  }

  gainNode.connect(target);
}

function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function createNoiseBufferSource() {
  if (!AudioEngine.isReady) return null;
  const ctx = AudioEngine.ctx;
  const bufferSize = ctx.sampleRate * 0.4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

// ── Drum Synths ──
function triggerKick(time) {
  const ctx = AudioEngine.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(55 * (1 + STATE.drive * 0.4), time);
  osc.frequency.exponentialRampToValueAtTime(25, time + 0.35);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.75, time + STATE.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35 * STATE.release * 3);

  osc.connect(gain);
  connectMasterWithEffects(gain, time, 0.35);
  osc.start(time);
  osc.stop(time + 0.4);
}

function triggerSnare(time) {
  const ctx = AudioEngine.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, time);
  osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.5, time + STATE.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18 * STATE.release * 3);

  const noise = createNoiseBufferSource();
  if (noise) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, time);
    noiseGain.gain.linearRampToValueAtTime(0.4, time + STATE.attack);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15 * STATE.release * 3);

    noise.connect(filter);
    filter.connect(noiseGain);
    connectMasterWithEffects(noiseGain, time, 0.15);
    noise.start(time);
    noise.stop(time + 0.2);
  }

  osc.connect(gain);
  connectMasterWithEffects(gain, time, 0.15);
  osc.start(time);
  osc.stop(time + 0.2);
}

function triggerHihat(time) {
  const ctx = AudioEngine.ctx;
  const noise = createNoiseBufferSource();
  if (!noise) return;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(7000, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.22, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06 * STATE.release * 2);

  noise.connect(filter);
  filter.connect(gain);
  connectMasterWithEffects(gain, time, 0.06);

  noise.start(time);
  noise.stop(time + 0.08);
}

function triggerClap(time) {
  const ctx = AudioEngine.ctx;
  const noise = createNoiseBufferSource();
  if (!noise) return;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.4, time + 0.005);
  gain.gain.setValueAtTime(0.05, time + 0.015);
  gain.gain.linearRampToValueAtTime(0.35, time + 0.022);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12 * STATE.release * 3);

  noise.connect(filter);
  filter.connect(gain);
  connectMasterWithEffects(gain, time, 0.12);

  noise.start(time);
  noise.stop(time + 0.15);
}

function triggerBassDrum(time) {
  const ctx = AudioEngine.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, time);
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.45);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(150, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.55, time + STATE.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45 * STATE.release * 3);

  osc.connect(lp);
  lp.connect(gain);
  connectMasterWithEffects(gain, time, 0.45);

  osc.start(time);
  osc.stop(time + 0.5);
}

function triggerPerc(time) {
  const ctx = AudioEngine.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(320, time);
  osc.frequency.exponentialRampToValueAtTime(150, time + 0.08);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.3, time + STATE.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08 * STATE.release * 3);

  osc.connect(gain);
  connectMasterWithEffects(gain, time, 0.08);

  osc.start(time);
  osc.stop(time + 0.1);
}

// ── Instrument Synth Patches ──
function triggerChoir(freq, time) {
  const ctx = AudioEngine.ctx;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(freq, time);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 1.006, time);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(350, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.42, time + STATE.attack + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.65 * STATE.release * 4);

  osc1.connect(lp);
  osc2.connect(lp);
  lp.connect(gain);
  connectMasterWithEffects(gain, time, 0.65);

  osc1.start(time);
  osc2.start(time);
  const stopTime = time + 0.8 * STATE.release * 4;
  osc1.stop(stopTime);
  osc2.stop(stopTime);
}

function triggerOrgan(freq, time) {
  const ctx = AudioEngine.ctx;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, time);

  osc2.type = 'square';
  osc2.frequency.setValueAtTime(freq * 2.0, time);

  osc3.type = 'triangle';
  osc3.frequency.setValueAtTime(freq * 0.5, time);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1100, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.38, time + STATE.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5 * STATE.release * 3);

  osc1.connect(lp);
  osc2.connect(lp);
  osc3.connect(lp);
  lp.connect(gain);
  connectMasterWithEffects(gain, time, 0.5);

  osc1.start(time);
  osc2.start(time);
  osc3.start(time);
  const stopTime = time + 0.6 * STATE.release * 3;
  osc1.stop(stopTime);
  osc2.stop(stopTime);
  osc3.stop(stopTime);
}

function triggerLead(freq, time) {
  const ctx = AudioEngine.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);

  const filter = ctx.createBiquadFilter();
  filter.type = 'peaking';
  filter.frequency.setValueAtTime(2200, time);
  filter.Q.value = 2.0;
  filter.gain.setValueAtTime(5, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.28, time + STATE.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4 * STATE.release * 3);

  osc.connect(filter);
  filter.connect(gain);
  connectMasterWithEffects(gain, time, 0.4);

  osc.start(time);
  osc.stop(time + 0.5 * STATE.release * 3);
}

function triggerDoomBass(freq, time) {
  const ctx = AudioEngine.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  const bassFreq = freq > 150 ? freq / 4 : freq / 2;
  osc.frequency.setValueAtTime(bassFreq, time);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(550, time);
  lp.frequency.exponentialRampToValueAtTime(90, time + 0.28);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.58, time + STATE.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.48 * STATE.release * 3);

  osc.connect(lp);
  lp.connect(gain);
  connectMasterWithEffects(gain, time, 0.48);

  osc.start(time);
  osc.stop(time + 0.6 * STATE.release * 3);
}

function triggerBell(freq, time) {
  const ctx = AudioEngine.ctx;
  const carrier = ctx.createOscillator();
  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();
  const gain = ctx.createGain();

  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(freq, time);

  modulator.type = 'sine';
  modulator.frequency.setValueAtTime(freq * 2.76, time);

  modGain.gain.setValueAtTime(freq * 2.5, time);
  modGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.42, time + STATE.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.75 * STATE.release * 4);

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);
  carrier.connect(gain);
  connectMasterWithEffects(gain, time, 0.75);

  modulator.start(time);
  carrier.start(time);
  const stopTime = time + 0.85 * STATE.release * 4;
  modulator.stop(stopTime);
  carrier.stop(stopTime);
}

// ── Highlight / Helpers ──
function highlightStep(si) {
  document.querySelectorAll('.beat-step').forEach(el => {
    el.classList.remove('current-step');
  });
  if (si >= 0) {
    ROWS.forEach((_, ri) => {
      const el = document.getElementById(`step-${ri}-${si}`);
      if (el) el.classList.add('current-step');
    });
  }
}

function clearGrid() {
  STATE.grid = ROWS.map(() => Array(STEPS).fill(false));
  document.querySelectorAll('.beat-step').forEach(el => el.classList.remove('active'));
  WASM_SIM.log('Beat grid cleared', 'warn');
}

function saveToStorage() {
  localStorage.setItem('anarky_beat_grid', JSON.stringify(STATE.grid));
  localStorage.setItem('anarky_beat_presets', JSON.stringify(STATE.rowPresets));
  WASM_SIM.log('Beat pattern and instruments saved to localStorage', 'success');
}

function loadFromStorage() {
  try {
    const savedGrid = localStorage.getItem('anarky_beat_grid');
    if (savedGrid) {
      STATE.grid = JSON.parse(savedGrid);
      STATE.grid.forEach((row, ri) => {
        row.forEach((on, si) => {
          const el = document.getElementById(`step-${ri}-${si}`);
          if (el) el.classList.toggle('active', on);
        });
      });
    }

    const savedPresets = localStorage.getItem('anarky_beat_presets');
    if (savedPresets) {
      STATE.rowPresets = JSON.parse(savedPresets);
      STATE.rowPresets.forEach((preset, ri) => {
        const el = document.getElementById(`row-select-${ri}`);
        if (el) el.value = preset;
      });
    }
  } catch {}
}

// ── Recording ──
function toggleRecording() {
  const btn    = document.getElementById('seq-rec');
  const status = document.getElementById('rec-status');

  if (STATE.recording) {
    STATE.recording = false;
    btn.classList.remove('recording');
    btn.textContent = '⏺ REC';
    status.textContent = 'PROCESSING...';
    status.classList.remove('recording');

    // Stop recording and process WAV
    const recorderNode = STATE.recorderNode;
    if (recorderNode) {
      AudioEngine.masterGain.disconnect(recorderNode);
      recorderNode.disconnect();
    }

    setTimeout(() => {
      // Merge buffers
      const leftBuffers = STATE.leftBuffers;
      const rightBuffers = STATE.rightBuffers;
      
      const totalLength = leftBuffers.reduce((acc, buf) => acc + buf.length, 0);
      const mergedLeft = new Float32Array(totalLength);
      const mergedRight = new Float32Array(totalLength);

      let offset = 0;
      for (let i = 0; i < leftBuffers.length; i++) {
        mergedLeft.set(leftBuffers[i], offset);
        mergedRight.set(rightBuffers[i], offset);
        offset += leftBuffers[i].length;
      }

      const sampleRate = AudioEngine.ctx.sampleRate;
      const wavBytes = bufferToWav(mergedLeft, mergedRight, sampleRate);
      STATE.recordedBlob = new Blob([wavBytes], { type: 'audio/wav' });

      status.textContent = `RECORDED ${(STATE.recordedBlob.size/1024).toFixed(1)}KB — READY`;
      document.getElementById('dl-btn').classList.add('visible');
      WASM_SIM.log(`Beat WAV recording complete (${(STATE.recordedBlob.size/1024).toFixed(0)}KB)`, 'success');
    }, 100);

  } else {
    if (!AudioEngine.isReady) AudioEngine.init();
    if (AudioEngine.isReady && AudioEngine.ctx.state === 'suspended') {
      AudioEngine.ctx.resume();
    }
    if (!AudioEngine.isReady) return;
    const ctx = AudioEngine.ctx;

    // Reset buffers
    STATE.leftBuffers = [];
    STATE.rightBuffers = [];
    STATE.recordedBlob = null;

    // Create ScriptProcessorNode
    const bufferSize = 4096;
    const recorderNode = ctx.createScriptProcessor(bufferSize, 2, 2);

    recorderNode.onaudioprocess = (e) => {
      if (!STATE.recording) return;
      const left = e.inputBuffer.getChannelData(0);
      const right = e.inputBuffer.getChannelData(1);
      STATE.leftBuffers.push(new Float32Array(left));
      STATE.rightBuffers.push(new Float32Array(right));
    };

    // Connect nodes
    AudioEngine.masterGain.connect(recorderNode);
    recorderNode.connect(ctx.destination);

    STATE.recorderNode = recorderNode;
    STATE.recording = true;
    btn.classList.add('recording');
    btn.textContent = '⏹ STOP REC';
    status.textContent = 'RECORDING...';
    status.classList.add('recording');

    if (!STATE.playing) togglePlay();
  }
}

function downloadRecording() {
  if (!STATE.recordedBlob) return;
  const url = URL.createObjectURL(STATE.recordedBlob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download= `anarky_beat_${Date.now()}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// WAV Encoder Helpers
function bufferToWav(leftChannel, rightChannel, sampleRate) {
  const bufferLength = leftChannel.length;
  const buffer = new ArrayBuffer(44 + bufferLength * 4);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLength * 4, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw 16-bit PCM is 1) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 2, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 4, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 4, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bufferLength * 4, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < bufferLength; i++) {
    // Left channel
    let sL = Math.max(-1, Math.min(1, leftChannel[i]));
    view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
    offset += 2;

    // Right channel
    let sR = Math.max(-1, Math.min(1, rightChannel[i]));
    view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
