/* ==========================================================================
   ANARKY DAW v2.0 — WASM / C-ENGINE SIMULATION MODULE
   Simulates C/WebAssembly DSP architecture in pure JavaScript
   ========================================================================== */

export const WASM_SIM = (() => {
  // ── Internal State ──────────────────────────────────────────────────────
  let _engine       = 'wasm';
  let _latencyHistory = Array(40).fill(1.2);
  let _allocatedBlocks = [];
  let _logBuffer    = [];
  let _baseAddress  = 0x00100000;
  let _heapCursor   = 0x00100000;

  // Callbacks (set by app.js)
  let _onLog          = null;
  let _onMemoryUpdate = null;

  // Pre-allocate core DSP structures
  const _initHeap = () => {
    _alloc('MasterChannel',     512,  'AudioChannel*');
    _alloc('TurntableBuffer[0]',2048, 'float*');
    _alloc('TurntableBuffer[1]',2048, 'float*');
    _alloc('BeatStepBuffer',    256,  'BeatStep[16]');
    _alloc('VocalEffectChain',  512,  'VocalEffect[8]');
    _alloc('AlbumDbIndex',      128,  'AlbumRecord*');
    _alloc('AssetCache',        1024, 'AssetEntry*');
  };

  // Internal alloc helper
  const _alloc = (name, size, type) => {
    const existing = _allocatedBlocks.find(b => b.name === name);
    if (existing) return existing.address;
    const address = _heapCursor;
    _heapCursor += size;
    _allocatedBlocks.push({ name, size, type, address, lastAccess: 0, accessType: null });
    return address;
  };

  // ── Latency Simulation ──────────────────────────────────────────────────
  const _updateLatency = () => {
    let lat;
    if (_engine === 'wasm') {
      lat = 0.8 + Math.random() * 0.8;  // 0.8–1.6 ms
    } else {
      lat = 6.0 + Math.random() * 6.0;  // 6–12 ms  (JS is slower)
    }
    lat = parseFloat(lat.toFixed(1));
    _latencyHistory.push(lat);
    if (_latencyHistory.length > 40) _latencyHistory.shift();
    return lat;
  };

  // ── C Source Code (displayed in WASM panel) ──────────────────────────────
  let _cSource = `// Loading C Engine...`;;

  // ── Public API ───────────────────────────────────────────────────────────
  return {
    get activeEngine()    { return _engine; },
    get latencyHistory()  { return _latencyHistory; },
    get allocatedBlocks() { return _allocatedBlocks; },

    set onLogCallback(fn)          { _onLog = fn; },
    set onMemoryUpdateCallback(fn) { _onMemoryUpdate = fn; },

    async init() {
      try {
        const files = ['c_core/main.c', 'c_core/types.h', 'c_core/album_bst.h', 'c_core/album_bst.c', 'c_core/wav_writer.h', 'c_core/wav_writer.c', 'c_core/filters.h', 'c_core/filters.c', 'c_core/channel.h', 'c_core/channel.c', 'c_core/effects.h', 'c_core/effects.c', 'c_core/mixer.h', 'c_core/mixer.c', 'c_core/sequencer.h', 'c_core/sequencer.c', 'c_core/analyzer.h', 'c_core/analyzer.c'];
        let fullSource = '';
        for (const f of files) {
          const response = await fetch(f);
          if (response.ok) {
            fullSource += `// >>>>> FILE: ${f} <<<<<\n` + await response.text() + '\n\n';
          }
        }
        if (fullSource) _cSource = fullSource;
        else _cSource = `// Error loading C source files.`;
      } catch (err) {
        _cSource = `// Failed to fetch C source files\n// Run using a local web server (e.g. Live Server).`;
        console.error("Fetch error for C source:", err);
      }
      _initHeap();
      this.log('ANARKY DSP ENGINE INITIALIZED', 'success');
      this.log(`Heap base: 0x${_baseAddress.toString(16).toUpperCase()}`, 'info');
      this.log(`Heap cursor: 0x${_heapCursor.toString(16).toUpperCase()}`, 'info');
      this.log(`Engine mode: ${_engine.toUpperCase()} ACTIVE`, 'info');
    },

    setEngine(mode) {
      _engine = mode;
      this.log(`Engine switched → ${mode.toUpperCase()}`, mode === 'wasm' ? 'success' : 'warn');
    },

    getLatency() { return _updateLatency(); },

    getCSourceCode() { return _cSource; },

    log(message, type = 'info') {
      const now  = new Date();
      const ts   = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${now.getMilliseconds().toString().padStart(3,'0')}`;
      const entry = { message, type, timestamp: ts };
      _logBuffer.push(entry);
      if (_logBuffer.length > 200) _logBuffer.shift();
      if (_onLog) _onLog(entry);
    },

    allocateBlock(name, size, type) {
      const addr = _alloc(name, size, type || 'void*');
      this.log(`malloc(${size}B) → 0x${addr.toString(16).toUpperCase()} [${name}]`, 'info');
      if (_onMemoryUpdate) _onMemoryUpdate();
      return addr;
    },

    triggerAccess(name, accessType) {
      const block = _allocatedBlocks.find(b => b.name === name);
      if (block) {
        block.lastAccess  = Date.now();
        block.accessType  = accessType;
        if (_onMemoryUpdate) _onMemoryUpdate();
      }
    },

    freeBlock(name) {
      const idx = _allocatedBlocks.findIndex(b => b.name === name);
      if (idx !== -1) {
        const block = _allocatedBlocks[idx];
        this.log(`free(0x${block.address.toString(16).toUpperCase()}) [${name}]`, 'warn');
        _allocatedBlocks.splice(idx, 1);
        if (_onMemoryUpdate) _onMemoryUpdate();
      }
    }
  };
})();
