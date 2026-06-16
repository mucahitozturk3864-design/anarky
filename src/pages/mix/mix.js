/* ==========================================================================
   ANARKY DAW v2.0 — MIX MODULE (Turntable + Channel Panel)
   Upload → Deck entegrasyon: yüklenen dosya ilgili plağa atanır,
   tüm kontroller (PLAY, GAIN, PITCH, CUE, SCRATCH) o dosyayı yönetir.
   Parametrik EQ Panel: Her deck için LOW, MID, HIGH frekans ayar potları,
   ve gerçek zamanlı görsel EQ eğrisi (BiquadFilter response canvas) içerir.
   ========================================================================== */

import AudioEngine from '../../components/AudioEngine.js';
import { WASM_SIM } from '../../../wasm/wasm_sim.js';

// ── State ─────────────────────────────────────────────────────────────────────
const STATE = {
  decks: [
    {
      bpm: 128, gain: 0.8, playing: false, spinSpeed: 1.0,
      // Parametric EQ nodes
      lowFilter: null, midFilter: null, highFilter: null,
      // Audio nodes
      oscNode: null, gainNode: null, eqFilters: null, analyserNode: null,
      // Audio file integration
      audioEl: null, sourceNode: null,
      file: null, loop: false, progAnimId: null,
    },
    {
      bpm: 128, gain: 0.8, playing: false, spinSpeed: 1.0,
      // Parametric EQ nodes
      lowFilter: null, midFilter: null, highFilter: null,
      // Audio nodes
      oscNode: null, gainNode: null, eqFilters: null, analyserNode: null,
      audioEl: null, sourceNode: null,
      file: null, loop: false, progAnimId: null,
    },
  ],
  crossfader: 0.5,
  nextDeckToLoad: 0, // 0 = A, 1 = B
  channels: Array.from({length:6}, (_,i) => ({
    name: ['KICK','SNARE','HI-HAT','BASS','PAD','FX'][i],
    gain: 0.8, muted: false, level: 0,
  })),
  waveformAnimId: [null, null],
  meterAnimId: null,
};

// ── Init ──────────────────────────────────────────────────────────────────────
export function initModule(container) {
  container.innerHTML = buildHTML();

  WASM_SIM.allocateBlock('TurntableState[0]', 2048, 'TurntableBuffer*');
  WASM_SIM.allocateBlock('TurntableState[1]', 2048, 'TurntableBuffer*');
  WASM_SIM.log('Mix module loaded — dual-deck turntable system', 'success');

  // Initialize Web Audio Nodes immediately if AudioEngine is ready
  if (AudioEngine.isReady) {
    getOrCreateDeckNodes(0);
    getOrCreateDeckNodes(1);
  }

  bindEvents();
  startWaveformAnimations();
  startMeterAnimation();
  updateUploadHint();

  // Initial draw of EQ curves
  updateEqCurve(0);
  updateEqCurve(1);
}

// ── HTML Build ────────────────────────────────────────────────────────────────
function buildHTML() {
  return `
  <div class="mix-container">
    <div class="mix-header">
      <h2>MIXER CONSOLE</h2>
      <span class="mix-header-badge">DUAL DECK // ANALOG SIM</span>
      <div class="bpm-badge" style="margin-left:auto;">
        <div class="bpm-value" id="master-bpm">128</div>
        <div class="bpm-label">BPM SYNC</div>
      </div>
    </div>

    <div class="mix-decks">
      ${buildDeck(0, 'A')}

      <!-- Crossfader -->
      <div class="mix-crossfader-panel">
        <div class="crossfader-label">CROSS FADER</div>
        <div style="width:100%;text-align:center;font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:2px;margin-bottom:8px;">
          <span id="cf-a">A</span> ──────── <span id="cf-b">B</span>
        </div>
        <div class="crossfader-track">
          <div class="crossfader-fill" id="cf-fill" style="left:25%;width:50%;"></div>
        </div>
        <input type="range" id="crossfader" min="0" max="100" value="50" style="width:100%;margin-top:6px;">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:2px;" id="cf-val">CENTER</div>
        <div style="width:100%;border-top:1px solid var(--border-color);padding-top:14px;display:flex;flex-direction:column;gap:8px;">
          <div class="crossfader-label">MASTER VOL</div>
          <input type="range" id="master-vol" min="0" max="100" value="80"
            style="-webkit-appearance:none;width:100%;height:3px;border-radius:2px;background:var(--border-color);outline:none;cursor:pointer;">
        </div>
      </div>

      ${buildDeck(1, 'B')}
    </div>

    <!-- Channel Strip Panel -->
    <div class="mix-channel-panel">
      ${STATE.channels.map((ch, i) => `
        <div class="channel-strip" id="ch-strip-${i}">
          <div class="channel-name">${ch.name}</div>
          <div class="channel-meter">
            <div class="channel-meter-fill" id="ch-meter-${i}" style="height:0%"></div>
          </div>
          <input type="range" class="channel-fader" id="ch-fader-${i}"
            min="0" max="100" value="80"
            orient="vertical" style="writing-mode:vertical-lr;direction:rtl;">
          <button class="channel-mute" id="ch-mute-${i}" data-ch="${i}">MUTE</button>
        </div>
      `).join('')}
    </div>

    <!-- ⛧ Soul Upload Panel ⛧ -->
    <div class="mix-upload-panel">
      <div class="mix-upload-title">⛧ &nbsp; SOUL UPLOAD — FEED THE MACHINE &nbsp; ⛧</div>
      
      <!-- Unified Drag & Drop Target -->
      <div class="mix-upload-drop" id="upload-drop-unified">
        <input type="file" id="upload-input-unified" accept="audio/*" multiple>
        <span class="mix-upload-icon">🜏</span>
        <div class="mix-upload-text">
          DRAG &amp; DROP AUDIO FILES HERE (OR CLICK TO SELECT)<br>
          <span style="color:var(--sat-gold);font-size:10px;font-weight:bold;letter-spacing:1px;" id="upload-hint">
            NEXT TARGET: LEFT DECK (A)
          </span>
        </div>
      </div>

      <!-- Two slots side by side -->
      <div class="mix-upload-row">
        ${[0, 1].map(i => `
          <div class="mix-upload-deck" id="upload-slot-${i}">
            <div class="mix-upload-label" style="display:flex;justify-content:space-between;width:100%;">
              <span>DECK ${['A (LEFT)','B (RIGHT)'][i]} SLOT</span>
              <span id="upload-status-badge-${i}" style="color:var(--sat-red);font-weight:bold;display:none;">⛧ LOADED</span>
            </div>
            <div class="mix-upload-slot-card" style="border:1px solid var(--sat-border);border-radius:4px;padding:12px;background:rgba(5,2,0,0.4);display:flex;flex-direction:column;gap:8px;">
              <div class="mix-upload-filename" id="upload-name-${i}" style="font-size:10px;min-height:14px;color:rgba(200,146,10,0.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                — NO SOUL INGESTED —
              </div>
              <div class="mix-upload-progress">
                <div class="mix-upload-progress-fill" id="upload-prog-${i}"></div>
              </div>
              <div class="mix-upload-time-row" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <span class="mix-upload-time" id="upload-time-${i}">--:-- / --:--</span>
                <div style="display:flex;gap:6px;">
                  <button class="mix-upload-btn" id="upload-loop-${i}" disabled>↺ LOOP</button>
                  <button class="mix-upload-btn" id="upload-reset-${i}" disabled>⏮ RESET</button>
                  <button class="mix-upload-btn" id="upload-clear-${i}" disabled style="color:var(--sat-red);border-color:rgba(200,0,0,0.2);">❌ CLEAR</button>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
  `;
}

function buildDeck(idx, label) {
  return `
  <div class="deck" id="deck-${idx}">
    <div class="deck-label">
      DECK ${label} <span id="deck-status-${idx}">IDLE</span>
    </div>
    <!-- Yüklü dosya adı -->
    <div class="deck-track-name" id="deck-track-${idx}">— NO TRACK LOADED —</div>

    <!-- Turntable -->
    <div class="turntable-wrap">
      <div class="turntable" id="turntable-${idx}">
        <div class="turntable-grooves"></div>
        <div class="turntable-label" id="turntable-label-${idx}">ANARKY<br>RECORDS</div>
        <div class="turntable-spindle"></div>
      </div>
    </div>

    <!-- Waveform -->
    <div class="waveform-canvas-wrap">
      <canvas class="waveform-canvas" id="waveform-${idx}"></canvas>
    </div>

    <!-- Time progress -->
    <div class="deck-time-bar">
      <div class="deck-time-fill" id="deck-timefill-${idx}"></div>
    </div>
    <div class="deck-time-label">
      <span id="deck-cur-${idx}">00:00</span>
      <span id="deck-dur-${idx}">--:--</span>
    </div>

    <!-- Controls -->
    <div class="deck-controls">
      <button class="deck-btn play-btn" data-deck="${idx}" id="play-${idx}">▶ PLAY</button>
      <button class="deck-btn" data-deck="${idx}" data-action="cue">CUE</button>
      <button class="deck-btn" data-deck="${idx}" data-action="scratch">SCRATCH</button>
    </div>

    <div class="deck-slider-row">
      <div class="deck-slider-label">
        <span>GAIN</span>
        <span id="gain-val-${idx}">80%</span>
      </div>
      <input type="range" class="deck-slider" id="gain-${idx}" min="0" max="100" value="80">
    </div>

    <div class="deck-slider-row">
      <div class="deck-slider-label">
        <span>PITCH / SPEED</span>
        <span id="pitch-val-${idx}">0%</span>
      </div>
      <input type="range" class="deck-slider" id="pitch-${idx}" min="-50" max="50" value="0">
    </div>

    <!-- Frequency Shaper (Deck EQ Panel) -->
    <div class="deck-eq-panel">
      <div class="deck-eq-title">⛧ FREQUENCY SHAPER ⛧</div>
      <canvas class="eq-curve-canvas" id="eq-curve-${idx}"></canvas>
      <div class="deck-eq-knobs">
        ${[
          { name: 'low',  id: `eq-low-${idx}`,  val: '0.0dB',  label: '🜏 LOW' },
          { name: 'mid',  id: `eq-mid-${idx}`,  val: '0.0dB',  label: '🜎 MID' },
          { name: 'high', id: `eq-high-${idx}`, val: '0.0dB',  label: '🜍 HIGH' }
        ].map(eq => `
          <div class="eq-knob-group">
            <div class="eq-knob-label">${eq.label}</div>
            <div class="eq-knob" id="${eq.id}" data-deg="0" style="cursor:grab;">
              <div class="eq-knob-tick" style="transform:translateX(-50%) rotate(0deg);transform-origin:bottom center;"></div>
            </div>
            <div class="eq-knob-value" id="${eq.id}-val">${eq.val}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
  `;
}

// ── Fader / EQ DB Mapping Helper ─────────────────────────────────────────────
function mapFaderToDb(val) {
  if (val <= 80) {
    return (val - 80) * 0.5; // -40dB to 0dB
  } else {
    return (val - 80) * 0.6; // 0dB to +12dB
  }
}

// ── Web Audio Node Management ────────────────────────────────────────────────
function getOrCreateDeckNodes(i) {
  if (!AudioEngine.isReady) return null;
  const d = STATE.decks[i];

  if (!d.gainNode) {
    const ctx = AudioEngine.ctx;

    // Create 3 parametric EQ filters for the deck itself
    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = 'lowshelf';
    lowFilter.frequency.value = 150; // 150 Hz
    lowFilter.gain.setValueAtTime(0, ctx.currentTime);

    const midFilter = ctx.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1000; // 1 kHz
    midFilter.Q.value = 1.0;
    midFilter.gain.setValueAtTime(0, ctx.currentTime);

    const highFilter = ctx.createBiquadFilter();
    highFilter.type = 'highshelf';
    highFilter.frequency.value = 6000; // 6 kHz
    highFilter.gain.setValueAtTime(0, ctx.currentTime);

    d.lowFilter = lowFilter;
    d.midFilter = midFilter;
    d.highFilter = highFilter;

    // Create 6 graphic EQ filters in series (corresponds to mixer channel strips)
    const filters = [];
    const bandConfigs = [
      { type: 'lowshelf', freq: 80 },    // KICK (0)
      { type: 'peaking',  freq: 1000 },  // SNARE (1)
      { type: 'highshelf', freq: 8000 }, // HI-HAT (2)
      { type: 'peaking',  freq: 250 },   // BASS (3)
      { type: 'peaking',  freq: 3000 },  // PAD (4)
      { type: 'peaking',  freq: 5000 }   // FX (5)
    ];

    bandConfigs.forEach((cfg, idx) => {
      const filter = ctx.createBiquadFilter();
      filter.type = cfg.type;
      filter.frequency.value = cfg.freq;

      const ch = STATE.channels[idx];
      const db = mapFaderToDb(ch.gain * 100);
      filter.gain.setValueAtTime(ch.muted ? -40 : db, ctx.currentTime);

      filters.push(filter);
    });

    // Connect Deck parametric EQ filters in series
    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);
    highFilter.connect(filters[0]); // Connect to the graphic EQ chain

    // Connect graphic EQ filters in series
    for (let f = 0; f < filters.length - 1; f++) {
      filters[f].connect(filters[f+1]);
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    filters[filters.length - 1].connect(analyser);

    const gainNode = ctx.createGain();
    analyser.connect(gainNode);
    gainNode.connect(AudioEngine.masterGain);

    d.eqFilters = filters;
    d.analyserNode = analyser;
    d.gainNode = gainNode;

    updateDeckVolume(i);
  }

  return {
    lowFilter: d.lowFilter,
    analyser: d.analyserNode,
    gainNode: d.gainNode
  };
}

function updateDeckVolume(i) {
  const d = STATE.decks[i];
  if (!d.gainNode) return;

  let cfMultiplier = 1;
  const cf = STATE.crossfader;
  if (i === 0) {
    cfMultiplier = Math.cos(cf * Math.PI / 2);
  } else {
    cfMultiplier = Math.sin(cf * Math.PI / 2);
  }

  const targetGain = d.gain * cfMultiplier * 0.9;
  if (AudioEngine.isReady && AudioEngine.ctx) {
    d.gainNode.gain.linearRampToValueAtTime(
      targetGain, AudioEngine.ctx.currentTime + 0.05
    );
  }
}

// ── Update EQ Band Gains from Channel Faders ────────────────────────────────
function updateChannelFilters(idx) {
  const ch = STATE.channels[idx];
  const db = mapFaderToDb(ch.gain * 100);
  const targetGain = ch.muted ? -40 : db;

  if (AudioEngine.isReady && AudioEngine.ctx) {
    [0, 1].forEach(i => {
      const d = STATE.decks[i];
      if (d.eqFilters && d.eqFilters[idx]) {
        d.eqFilters[idx].gain.linearRampToValueAtTime(
          targetGain, AudioEngine.ctx.currentTime + 0.05
        );
      }
    });
  }
}

// ── Real-Time EQ Curve Response Drawing ──────────────────────────────────────
function updateEqCurve(i) {
  const canvas = document.getElementById(`eq-curve-${i}`);
  if (!canvas) return;
  const ctx2d = canvas.getContext('2d');

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  const d = STATE.decks[i];
  if (!d.lowFilter || !d.midFilter || !d.highFilter) return;

  const width = canvas.width;
  const height = canvas.height;
  const midY = height / 2;

  const numPoints = 100;
  const freqs = new Float32Array(numPoints);
  const magLow = new Float32Array(numPoints);
  const phaseLow = new Float32Array(numPoints);
  const magMid = new Float32Array(numPoints);
  const phaseMid = new Float32Array(numPoints);
  const magHigh = new Float32Array(numPoints);
  const phaseHigh = new Float32Array(numPoints);

  for (let k = 0; k < numPoints; k++) {
    // Logarithmic distribution from 20Hz to 20kHz
    const logVal = Math.log10(20) + (k / (numPoints - 1)) * (Math.log10(20000) - Math.log10(20));
    freqs[k] = Math.pow(10, logVal);
  }

  d.lowFilter.getFrequencyResponse(freqs, magLow, phaseLow);
  d.midFilter.getFrequencyResponse(freqs, magMid, phaseMid);
  d.highFilter.getFrequencyResponse(freqs, magHigh, phaseHigh);

  ctx2d.beginPath();
  ctx2d.strokeStyle = 'rgba(200,146,10,0.88)';
  ctx2d.lineWidth = 2;
  ctx2d.shadowBlur = 6;
  ctx2d.shadowColor = 'rgba(200,100,0,0.5)';

  for (let k = 0; k < numPoints; k++) {
    const combinedMag = magLow[k] * magMid[k] * magHigh[k];
    const db = 20 * Math.log10(Math.max(combinedMag, 0.001));

    // Map -15dB to +15dB range to canvas height
    const y = midY - (db / 15) * midY;
    const x = (k / (numPoints - 1)) * width;

    if (k === 0) {
      ctx2d.moveTo(x, y);
    } else {
      ctx2d.lineTo(x, y);
    }
  }
  ctx2d.stroke();
  ctx2d.shadowBlur = 0;

  // Center flatline (0dB reference)
  ctx2d.strokeStyle = 'rgba(200,146,10,0.14)';
  ctx2d.lineWidth = 0.5;
  ctx2d.beginPath();
  ctx2d.moveTo(0, midY);
  ctx2d.lineTo(width, midY);
  ctx2d.stroke();

  // Draw grid lines (100Hz, 1kHz, 10kHz)
  const drawGrid = (freq, label) => {
    const logVal = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
    const x = logVal * width;
    ctx2d.strokeStyle = 'rgba(200,146,10,0.08)';
    ctx2d.beginPath();
    ctx2d.moveTo(x, 0);
    ctx2d.lineTo(x, height);
    ctx2d.stroke();

    ctx2d.fillStyle = 'rgba(200,146,10,0.4)';
    ctx2d.font = '7px var(--font-mono)';
    ctx2d.fillText(label, x + 2, height - 3);
  };

  drawGrid(100, '100Hz');
  drawGrid(1000, '1kHz');
  drawGrid(10000, '10kHz');
}

// ── Bind EQ Knob Drag Events ──────────────────────────────────────────────────
function bindEqKnob(id, deckIdx, type) {
  const el = document.getElementById(id);
  if (!el) return;
  const tick = el.querySelector('.eq-knob-tick');
  const valEl = document.getElementById(`${id}-val`);

  el.addEventListener('mousedown', e => {
    let dragging = true;
    let startY = e.clientY;
    let startDeg = parseInt(el.dataset.deg) || 0;
    let curDeg = startDeg;
    e.preventDefault();

    const onMouseMove = ev => {
      if (!dragging) return;
      const delta = (startY - ev.clientY) * 1.5;
      curDeg = Math.max(-135, Math.min(135, startDeg + delta));
      el.dataset.deg = curDeg;

      tick.style.transform = `translateX(-50%) rotate(${curDeg}deg)`;

      // Map -135deg to +135deg -> -15.0dB to +15.0dB
      const norm = (curDeg + 135) / 270;
      const db = (norm * 30) - 15;
      valEl.textContent = `${db > 0 ? '+' : ''}${db.toFixed(1)}dB`;

      const d = STATE.decks[deckIdx];
      const filter = type === 'low' ? d.lowFilter : type === 'mid' ? d.midFilter : d.highFilter;
      if (filter && AudioEngine.isReady) {
        filter.gain.setValueAtTime(db, AudioEngine.ctx.currentTime);
      }

      updateEqCurve(deckIdx);
    };

    const onMouseUp = () => {
      if (dragging) {
        dragging = false;
        startDeg = curDeg;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

// ── Event Binding ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Deck play buttons
  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleDeckPlay(parseInt(btn.dataset.deck)));
  });

  // Turntable click → scratch if playing
  document.querySelectorAll('.turntable').forEach((t, i) => {
    t.addEventListener('click', () => {
      if (STATE.decks[i].playing) handleDeckScratch(i);
    });
  });

  // Deck Control Buttons (CUE, SCRATCH)
  document.querySelectorAll('.deck-btn').forEach(btn => {
    const action = btn.dataset.action;
    const i = parseInt(btn.dataset.deck);
    if (action === 'cue') {
      btn.addEventListener('click', () => handleDeckCue(i));
    } else if (action === 'scratch') {
      btn.addEventListener('click', () => handleDeckScratch(i));
    }
  });

  // Sliders
  [0, 1].forEach(i => {
    // Gain
    document.getElementById(`gain-${i}`).addEventListener('input', e => {
      const v = e.target.value / 100;
      STATE.decks[i].gain = v;
      document.getElementById(`gain-val-${i}`).textContent = `${e.target.value}%`;
      updateDeckVolume(i);
    });

    // Pitch / Speed
    document.getElementById(`pitch-${i}`).addEventListener('input', e => {
      const v = parseInt(e.target.value);
      document.getElementById(`pitch-val-${i}`).textContent = `${v > 0 ? '+' : ''}${v}%`;
      STATE.decks[i].spinSpeed = 1 + v / 100;
      updateTurntableSpeed(i);
      if (STATE.decks[i].audioEl) {
        STATE.decks[i].audioEl.playbackRate = Math.max(0.1, STATE.decks[i].spinSpeed);
      }
    });
  });

  // Bind EQ Knobs for both decks
  [0, 1].forEach(i => {
    bindEqKnob(`eq-low-${i}`, i, 'low');
    bindEqKnob(`eq-mid-${i}`, i, 'mid');
    bindEqKnob(`eq-high-${i}`, i, 'high');
  });

  // Crossfader
  const cf = document.getElementById('crossfader');
  cf.addEventListener('input', () => {
    const v = cf.value / 100;
    STATE.crossfader = v;
    document.getElementById('cf-fill').style.cssText =
      `left:${Math.min(v,0.5)*100}%;width:${Math.abs(v-0.5)*100}%;`;
    document.getElementById('cf-val').textContent =
      v < 0.45 ? 'DECK A' : v > 0.55 ? 'DECK B' : 'CENTER';
    updateDeckVolume(0);
    updateDeckVolume(1);
  });

  // Master volume
  document.getElementById('master-vol').addEventListener('input', e => {
    AudioEngine.setVolume(e.target.value / 100);
  });

  // Channel controls (Modify EQ filters on both decks)
  STATE.channels.forEach((ch, i) => {
    document.getElementById(`ch-fader-${i}`).addEventListener('input', e => {
      STATE.channels[i].gain = e.target.value / 100;
      updateChannelFilters(i);
    });
    document.getElementById(`ch-mute-${i}`).addEventListener('click', e => {
      STATE.channels[i].muted = !STATE.channels[i].muted;
      e.target.classList.toggle('muted', STATE.channels[i].muted);
      e.target.textContent = STATE.channels[i].muted ? 'UNMUTE' : 'MUTE';
      updateChannelFilters(i);
    });
  });

  // Unified Upload Panel Events
  const unifiedInput = document.getElementById('upload-input-unified');
  const unifiedDrop  = document.getElementById('upload-drop-unified');

  if (unifiedDrop) {
    unifiedDrop.addEventListener('dragover', e => {
      e.preventDefault();
      unifiedDrop.classList.add('drag-over');
    });
    unifiedDrop.addEventListener('dragleave', () => {
      unifiedDrop.classList.remove('drag-over');
    });
    unifiedDrop.addEventListener('drop', e => {
      e.preventDefault();
      unifiedDrop.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
      if (files.length > 0) handleUploadedFiles(files);
    });
  }

  if (unifiedInput) {
    unifiedInput.addEventListener('change', () => {
      const files = Array.from(unifiedInput.files).filter(f => f.type.startsWith('audio/'));
      if (files.length > 0) handleUploadedFiles(files);
      unifiedInput.value = ''; // Clear to allow re-upload
    });
  }

  // Loop, Reset and Clear buttons for both slots
  [0, 1].forEach(i => {
    const loopBtn  = document.getElementById(`upload-loop-${i}`);
    const resetBtn = document.getElementById(`upload-reset-${i}`);
    const clearBtn = document.getElementById(`upload-clear-${i}`);

    loopBtn.addEventListener('click', () => {
      const d = STATE.decks[i];
      d.loop = !d.loop;
      if (d.audioEl) d.audioEl.loop = d.loop;
      loopBtn.classList.toggle('active', d.loop);
      loopBtn.textContent = d.loop ? '↺ LOOP ON' : '↺ LOOP';
    });

    resetBtn.addEventListener('click', () => resetDeckToStart(i));
    clearBtn.addEventListener('click', () => clearDeck(i));
  });
}

// ── Unified Upload Handler ───────────────────────────────────────────────────
function handleUploadedFiles(files) {
  files.forEach(file => {
    let target = 0;
    if (!STATE.decks[0].file) {
      target = 0;
    } else if (!STATE.decks[1].file) {
      target = 1;
    } else {
      target = STATE.nextDeckToLoad;
      STATE.nextDeckToLoad = 1 - STATE.nextDeckToLoad;
    }
    loadFileToDeck(target, file);
  });
  updateUploadHint();
}

function updateUploadHint() {
  const hintEl = document.getElementById('upload-hint');
  if (!hintEl) return;

  let target = 0;
  if (!STATE.decks[0].file) {
    target = 0;
  } else if (!STATE.decks[1].file) {
    target = 1;
  } else {
    target = STATE.nextDeckToLoad;
  }

  hintEl.textContent = `NEXT TARGET: ${target === 0 ? 'LEFT DECK (A)' : 'RIGHT DECK (B)'}`;
}

// ── Dosyayı Deck'e Yükle ─────────────────────────────────────────────────────
function loadFileToDeck(i, file) {
  if (!AudioEngine.isReady) {
    AudioEngine.init();
  }

  const d = STATE.decks[i];

  // Çalıyorsa durdur
  if (d.playing) {
    d.playing = false;
    if (d.audioEl) d.audioEl.pause();
    stopDeckOsc(i);
    document.getElementById(`turntable-${i}`).classList.remove('spinning');
    document.getElementById(`play-${i}`).textContent = '▶ PLAY';
    document.getElementById(`play-${i}`).classList.remove('active');
    document.getElementById(`deck-status-${i}`).textContent = 'IDLE';
    document.getElementById(`deck-${i}`).classList.remove('active');
  }

  // Eski kaynakları temizle
  if (d.audioEl) {
    d.audioEl.pause();
    URL.revokeObjectURL(d.audioEl.src);
    d.audioEl.src = '';
  }
  if (d.sourceNode) { try { d.sourceNode.disconnect(); } catch {} d.sourceNode = null; }
  cancelAnimationFrame(d.progAnimId);

  // Yeni Audio Element
  const audio = new Audio();
  audio.src   = URL.createObjectURL(file);
  audio.loop  = d.loop;
  audio.preload = 'auto';
  audio.playbackRate = Math.max(0.1, d.spinSpeed);

  d.audioEl = audio;
  d.file    = file;

  // Web Audio API bağlantısı
  if (AudioEngine.isReady) {
    if (AudioEngine.ctx.state === 'suspended') AudioEngine.ctx.resume();

    const nodes = getOrCreateDeckNodes(i);
    if (nodes) {
      const src = AudioEngine.ctx.createMediaElementSource(audio);
      src.connect(nodes.lowFilter);
      d.sourceNode = src;
    }
  }

  // Bitince
  audio.addEventListener('ended', () => {
    if (!d.loop) {
      d.playing = false;
      document.getElementById(`play-${i}`).textContent = '▶ PLAY';
      document.getElementById(`play-${i}`).classList.remove('active');
      document.getElementById(`deck-status-${i}`).textContent = 'ENDED';
      document.getElementById(`deck-${i}`).classList.remove('active');
      document.getElementById(`turntable-${i}`).classList.remove('spinning');
      cancelAnimationFrame(d.progAnimId);
    }
  });

  // Metadata yüklenince süreyi göster
  audio.addEventListener('loadedmetadata', () => {
    document.getElementById(`upload-time-${i}`).textContent =
      `00:00 / ${fmt(audio.duration)}`;
    document.getElementById(`deck-dur-${i}`).textContent = fmt(audio.duration);
  });

  // UI güncelle
  const shortName = file.name.length > 28 ? file.name.substring(0, 26) + '…' : file.name;
  document.getElementById(`upload-name-${i}`).textContent  = file.name;
  document.getElementById(`upload-status-badge-${i}`).style.display = 'inline';
  document.getElementById(`deck-track-${i}`).textContent   = shortName;
  document.getElementById(`turntable-label-${i}`).innerHTML = `${shortName.split('.').slice(0,-1).join('.').substring(0,8)}<br>⛧`;
  
  document.getElementById(`upload-loop-${i}`).disabled  = false;
  document.getElementById(`upload-reset-${i}`).disabled = false;
  document.getElementById(`upload-clear-${i}`).disabled = false;
  
  document.getElementById(`upload-prog-${i}`).style.width = '0%';
  document.getElementById(`deck-timefill-${i}`).style.width = '0%';
  document.getElementById(`deck-cur-${i}`).textContent = '00:00';

  WASM_SIM.log(`Deck ${['A','B'][i]}: ${file.name} loaded (${(file.size/1024/1024).toFixed(2)}MB)`, 'success');
}

// ── Clear Deck ────────────────────────────────────────────────────────────────
function clearDeck(i) {
  const d = STATE.decks[i];

  if (d.playing) {
    d.playing = false;
    if (d.audioEl) d.audioEl.pause();
    stopDeckOsc(i);
    document.getElementById(`turntable-${i}`).classList.remove('spinning');
    document.getElementById(`play-${i}`).textContent = '▶ PLAY';
    document.getElementById(`play-${i}`).classList.remove('active');
    document.getElementById(`deck-status-${i}`).textContent = 'IDLE';
    document.getElementById(`deck-${i}`).classList.remove('active');
  }

  if (d.audioEl) {
    d.audioEl.pause();
    URL.revokeObjectURL(d.audioEl.src);
    d.audioEl.src = '';
  }
  if (d.sourceNode) { 
    try { d.sourceNode.disconnect(); } catch {} 
    d.sourceNode = null; 
  }
  cancelAnimationFrame(d.progAnimId);

  d.audioEl = null;
  d.file = null;

  // UI Reset
  document.getElementById(`upload-name-${i}`).textContent = '— NO SOUL INGESTED —';
  document.getElementById(`upload-status-badge-${i}`).style.display = 'none';
  document.getElementById(`deck-track-${i}`).textContent = '— NO TRACK LOADED —';
  document.getElementById(`turntable-label-${i}`).innerHTML = `ANARKY<br>RECORDS`;

  document.getElementById(`upload-loop-${i}`).disabled = true;
  document.getElementById(`upload-loop-${i}`).classList.remove('active');
  document.getElementById(`upload-loop-${i}`).textContent = '↺ LOOP';
  document.getElementById(`upload-reset-${i}`).disabled = true;
  document.getElementById(`upload-clear-${i}`).disabled = true;

  document.getElementById(`upload-prog-${i}`).style.width = '0%';
  document.getElementById(`deck-timefill-${i}`).style.width = '0%';
  document.getElementById(`deck-cur-${i}`).textContent = '00:00';
  document.getElementById(`deck-dur-${i}`).textContent = '--:--';
  document.getElementById(`upload-time-${i}`).textContent = '--:-- / --:--';

  // prioritize loading to this empty deck next
  if (i === 0) {
    STATE.nextDeckToLoad = 0;
  } else if (i === 1 && STATE.decks[0].file) {
    STATE.nextDeckToLoad = 1;
  }

  updateUploadHint();
  WASM_SIM.log(`Deck ${['A','B'][i]} cleared`, 'info');
}

// ── Deck Play / Pause ─────────────────────────────────────────────────────────
function toggleDeckPlay(i) {
  const d      = STATE.decks[i];
  const btn    = document.getElementById(`play-${i}`);
  const vinyl  = document.getElementById(`turntable-${i}`);
  const status = document.getElementById(`deck-status-${i}`);
  const deckEl = document.getElementById(`deck-${i}`);

  if (d.playing) {
    // ── DURDUR ──
    d.playing = false;

    if (d.audioEl) {
      d.audioEl.pause();
      cancelAnimationFrame(d.progAnimId);
    } else {
      stopDeckOsc(i);
    }

    vinyl.classList.remove('spinning');
    btn.textContent = '▶ PLAY';
    btn.classList.remove('active');
    status.textContent = 'PAUSED';
    deckEl.classList.remove('active');

  } else {
    // ── ÇALDUR ──
    d.playing = true;

    if (!AudioEngine.isReady) {
      AudioEngine.init();
    }

    if (d.audioEl) {
      if (AudioEngine.isReady && AudioEngine.ctx.state === 'suspended') {
        AudioEngine.ctx.resume();
      }
      
      // Reconnect if needed
      if (AudioEngine.isReady && !d.sourceNode) {
        const nodes = getOrCreateDeckNodes(i);
        if (nodes) {
          const src = AudioEngine.ctx.createMediaElementSource(d.audioEl);
          src.connect(nodes.lowFilter);
          d.sourceNode = src;
        }
      }

      d.audioEl.play().catch(err => {
        WASM_SIM.log('Audio play failed: ' + err.message, 'error');
        d.playing = false;
        vinyl.classList.remove('spinning');
        btn.textContent = '▶ PLAY';
        btn.classList.remove('active');
        status.textContent = 'IDLE';
        deckEl.classList.remove('active');
      });
      if (d.playing) {
        startProgressUpdate(i);
      }
    } else {
      // Fallback: oscillator drone
      startDeckOsc(i);
    }

    if (d.playing) {
      vinyl.classList.add('spinning');
      vinyl.style.animationDuration = `${2 / d.spinSpeed}s`;
      btn.textContent = '⏸ PAUSE';
      btn.classList.add('active');
      status.textContent = 'PLAYING';
      deckEl.classList.add('active');

      WASM_SIM.triggerAccess(`TurntableState[${i}]`, 'read');
    }
  }
}

// ── Reset to start ────────────────────────────────────────────────────────────
function resetDeckToStart(i) {
  const d = STATE.decks[i];
  if (!d.audioEl) return;

  d.audioEl.currentTime = 0;
  document.getElementById(`upload-prog-${i}`).style.width = '0%';
  document.getElementById(`deck-timefill-${i}`).style.width = '0%';
  document.getElementById(`deck-cur-${i}`).textContent = '00:00';
  if (d.audioEl.duration) {
    document.getElementById(`upload-time-${i}`).textContent =
      `00:00 / ${fmt(d.audioEl.duration)}`;
  }
}

// ── CUE and SCRATCH Handlers ─────────────────────────────────────────────────
function handleDeckCue(i) {
  const d = STATE.decks[i];
  if (d.audioEl) {
    d.audioEl.currentTime = 0;
    if (d.playing) {
      toggleDeckPlay(i);
    } else {
      const pEl = document.getElementById(`upload-prog-${i}`);
      const tEl = document.getElementById(`deck-timefill-${i}`);
      const cEl = document.getElementById(`deck-cur-${i}`);
      const uEl = document.getElementById(`upload-time-${i}`);
      if (pEl) pEl.style.width = '0%';
      if (tEl) tEl.style.width = '0%';
      if (cEl) cEl.textContent = '00:00';
      if (uEl && d.audioEl.duration) uEl.textContent = `00:00 / ${fmt(d.audioEl.duration)}`;
    }
    WASM_SIM.log(`Deck ${['A','B'][i]}: Cued to start`, 'info');
  } else {
    playScratchSound();
  }
}

function handleDeckScratch(i) {
  playScratchSound();
  const vinyl = document.getElementById(`turntable-${i}`);
  if (vinyl) {
    vinyl.classList.add('scratching');
    setTimeout(() => {
      vinyl.classList.remove('scratching');
    }, 150);
  }
}

// ── Progress bar update ───────────────────────────────────────────────────────
function startProgressUpdate(i) {
  const d = STATE.decks[i];
  const tick = () => {
    if (!d.audioEl || !d.playing) return;
    const cur = d.audioEl.currentTime;
    const dur = d.audioEl.duration || 1;
    const pct = (cur / dur) * 100;

    const pEl = document.getElementById(`upload-prog-${i}`);
    const tEl = document.getElementById(`deck-timefill-${i}`);
    const cEl = document.getElementById(`deck-cur-${i}`);
    const uEl = document.getElementById(`upload-time-${i}`);

    if (pEl) pEl.style.width = `${pct}%`;
    if (tEl) tEl.style.width = `${pct}%`;
    if (cEl) cEl.textContent = fmt(cur);
    if (uEl) uEl.textContent = `${fmt(cur)} / ${fmt(dur)}`;

    d.progAnimId = requestAnimationFrame(tick);
  };
  tick();
}

// ── Oscillator fallback ───────────────────────────────────────────────────────
function startDeckOsc(i) {
  if (!AudioEngine.isReady) return;
  const nodes = getOrCreateDeckNodes(i);
  if (!nodes) return;

  const ctx = AudioEngine.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(45 + i * 8, ctx.currentTime);

  osc.connect(nodes.lowFilter);
  osc.start();

  STATE.decks[i].oscNode = osc;
}

function stopDeckOsc(i) {
  if (STATE.decks[i].oscNode) {
    try { STATE.decks[i].oscNode.stop(); } catch {}
    STATE.decks[i].oscNode = null;
  }
}

function updateTurntableSpeed(i) {
  const vinyl = document.getElementById(`turntable-${i}`);
  if (STATE.decks[i].playing) {
    vinyl.style.animationDuration = `${2 / STATE.decks[i].spinSpeed}s`;
  }
}

function playScratchSound() {
  if (!AudioEngine.isReady) return;
  const ctx = AudioEngine.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gn  = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
  gn.gain.setValueAtTime(0.15, now);
  gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  osc.connect(gn);
  gn.connect(AudioEngine.masterGain);
  osc.start(now);
  osc.stop(now + 0.2);
}

// ── Waveform Canvas ───────────────────────────────────────────────────────────
function startWaveformAnimations() {
  [0, 1].forEach(i => {
    const canvas = document.getElementById(`waveform-${i}`);
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');

    const draw = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);

      const d       = STATE.decks[i];
      const playing = d.playing;

      if (d.analyserNode && playing) {
        const data = new Uint8Array(d.analyserNode.frequencyBinCount);
        d.analyserNode.getByteTimeDomainData(data);

        ctx2d.strokeStyle = 'rgba(200,100,0,0.9)';
        ctx2d.lineWidth = 1.5;
        ctx2d.beginPath();
        const sliceW = canvas.width / data.length;
        let x = 0;
        for (let j = 0; j < data.length; j++) {
          const y = (data[j] / 128) * (canvas.height / 2);
          j === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
          x += sliceW;
        }
        ctx2d.stroke();
      } else {
        ctx2d.strokeStyle = playing
          ? 'rgba(200,100,0,0.85)'
          : 'rgba(100,60,0,0.35)';
        ctx2d.lineWidth = 1.5;
        ctx2d.beginPath();
        const mid = canvas.height / 2;
        const amp = playing ? 16 : 3;
        const t   = Date.now() * 0.004 * d.spinSpeed;
        for (let x = 0; x < canvas.width; x++) {
          const y = mid
            + Math.sin(x * 0.06 + t) * amp
            + Math.sin(x * 0.12 + t * 1.5) * (amp * 0.4);
          x === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
      }

      STATE.waveformAnimId[i] = requestAnimationFrame(draw);
    };
    draw();
  });
}

// ── Real-Time Spectral Level Meter Animation ─────────────────────────
function startMeterAnimation() {
  const step = () => {
    let freqDataA = null;
    let freqDataB = null;

    if (AudioEngine.isReady) {
      if (STATE.decks[0].analyserNode && STATE.decks[0].playing) {
        freqDataA = new Uint8Array(STATE.decks[0].analyserNode.frequencyBinCount);
        STATE.decks[0].analyserNode.getByteFrequencyData(freqDataA);
      }
      if (STATE.decks[1].analyserNode && STATE.decks[1].playing) {
        freqDataB = new Uint8Array(STATE.decks[1].analyserNode.frequencyBinCount);
        STATE.decks[1].analyserNode.getByteFrequencyData(freqDataB);
      }
    }

    STATE.channels.forEach((ch, idx) => {
      const fill = document.getElementById(`ch-meter-${idx}`);
      if (!fill) return;

      // Bin ranges mapping:
      // Band 0 (KICK): <100Hz -> bins 0 to 4
      // Band 3 (BASS): 100-350Hz -> bins 5 to 15
      // Band 1 (SNARE): 350-1000Hz -> bins 16 to 43
      // Band 4 (PAD): 1000-2500Hz -> bins 44 to 106
      // Band 5 (FX): 2500-6000Hz -> bins 107 to 255
      // Band 2 (HI-HAT): >6000Hz -> bins 256 to 512
      let startBin = 0;
      let endBin = 4;
      if (idx === 0) { startBin = 0; endBin = 4; }         // KICK
      else if (idx === 1) { startBin = 16; endBin = 43; }   // SNARE
      else if (idx === 2) { startBin = 256; endBin = 512; } // HI-HAT
      else if (idx === 3) { startBin = 5; endBin = 15; }    // BASS
      else if (idx === 4) { startBin = 44; endBin = 106; }  // PAD
      else if (idx === 5) { startBin = 107; endBin = 255; } // FX

      const getBandEnergy = (data, deckGain) => {
        if (!data) return 0;
        let sum = 0;
        for (let b = startBin; b <= endBin; b++) {
          sum += data[b];
        }
        const avg = sum / (endBin - startBin + 1);
        return (avg / 255) * deckGain;
      };

      // Calculate gains including crossfader multipliers
      let gainA = 0;
      let gainB = 0;
      const cf = STATE.crossfader;
      
      if (STATE.decks[0].playing) {
        gainA = STATE.decks[0].gain * Math.cos(cf * Math.PI / 2);
      }
      if (STATE.decks[1].playing) {
        gainB = STATE.decks[1].gain * Math.sin(cf * Math.PI / 2);
      }

      const energyA = getBandEnergy(freqDataA, gainA);
      const energyB = getBandEnergy(freqDataB, gainB);

      let energy = Math.max(energyA, energyB);
      const channelGain = ch.muted ? 0 : ch.gain;
      const targetLevel = energy * channelGain;

      // Smooth the decay/attack of level meters
      ch.level = ch.level * 0.72 + targetLevel * 0.28;

      // Fallback for visual activity if playing without audio data
      if (!freqDataA && !freqDataB) {
        const isAnyDeckPlaying = STATE.decks[0].playing || STATE.decks[1].playing;
        const base = ch.muted ? 0 : ch.gain;
        const activity = (isAnyDeckPlaying ? 1 : 0.05) * base;
        ch.level = ch.level * 0.85 + (Math.random() * activity * 0.1) * 0.15;
      }

      fill.style.height = `${Math.min(ch.level * 100, 100)}%`;
    });

    STATE.meterAnimId = requestAnimationFrame(step);
  };
  step();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(sec) {
  if (!isFinite(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
