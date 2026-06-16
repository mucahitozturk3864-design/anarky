/* ==========================================================================
   ANARKY DAW v2.0 — AUDIO ENGINE
   Manages the global Web Audio context, master gain, and utility synths.
   ========================================================================== */

import { WASM_SIM } from '../../wasm/wasm_sim.js';

const AudioEngine = (() => {
  let _ctx        = null;
  let _masterGain = null;

  return {
    get ctx()        { return _ctx; },
    get masterGain() { return _masterGain; },
    get isReady()    { return !!_ctx && _ctx.state !== 'closed'; },

    /** Initialize Web Audio Context (must be called from user gesture) */
    init() {
      if (_ctx) return;
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        _ctx = new Ctor({ sampleRate: 48000 });
        _masterGain = _ctx.createGain();
        _masterGain.gain.setValueAtTime(0.8, _ctx.currentTime);
        _masterGain.connect(_ctx.destination);

        WASM_SIM.allocateBlock('AudioContext_Master', 512, 'AudioContext*');
        WASM_SIM.log('Web Audio API initialized — 48kHz, stereo', 'success');
      } catch (e) {
        console.error('[AudioEngine] Failed to init AudioContext:', e);
        WASM_SIM.log('AudioContext init FAILED: ' + e.message, 'error');
      }
    },

    /** Resume if suspended (auto-play policy) */
    async resume() {
      if (_ctx && _ctx.state === 'suspended') await _ctx.resume();
    },

    /** Play a brief glitch synth blip (menu hover) */
    playGlitchBlip() {
      if (!this.isReady) return;
      const osc  = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60 + Math.random() * 180, _ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(8 + Math.random() * 20, _ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.03, _ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, _ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(_masterGain);
      osc.start();
      osc.stop(_ctx.currentTime + 0.2);
    },

    /** Play sweep noise for category transitions (5 seconds) */
    playTransitionSweep() {
      if (!this.isReady) return;
      const now  = _ctx.currentTime;
      const size = _ctx.sampleRate * 2;
      const buf  = _ctx.createBuffer(1, size, _ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;

      const noise       = _ctx.createBufferSource();
      noise.buffer      = buf;
      const filter      = _ctx.createBiquadFilter();
      filter.type       = 'bandpass';
      filter.frequency.setValueAtTime(100, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 1.5);
      filter.frequency.exponentialRampToValueAtTime(200, now + 3.5);
      filter.Q.setValueAtTime(8, now);

      const noiseGain = _ctx.createGain();
      noiseGain.gain.setValueAtTime(0.04, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(_masterGain);
      noise.start(now);

      // Synth sweep overlay
      const osc     = _ctx.createOscillator();
      const oscGain = _ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(40, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 2.0);
      osc.frequency.setValueAtTime(80, now + 2.1);
      osc.frequency.exponentialRampToValueAtTime(880, now + 4.5);
      oscGain.gain.setValueAtTime(0.015, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
      osc.connect(oscGain);
      oscGain.connect(_masterGain);
      osc.start(now);
      osc.stop(now + 5.0);
    },

    /** Set master volume (0–1) */
    setVolume(val) {
      if (!this.isReady) return;
      _masterGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, val)),
        _ctx.currentTime + 0.05
      );
    }
  };
})();

export default AudioEngine;
