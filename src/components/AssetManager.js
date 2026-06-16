/* ==========================================================================
   ANARKY DAW v2.0 — ASSET MANAGER
   Central resolver for video and media assets.
   Checks if files exist via HEAD request, caches results, provides fallbacks.
   ========================================================================== */

const AssetManager = (() => {
  // ── Path Configuration ──────────────────────────────────────────────────
  const PATHS = {
    transitionVideo : (module) => `assets/videos/transitions/${module}_transition.mp4`,
    albumIntroVideo : (albumId) => `assets/videos/album_intros/${albumId}.mp4`,
    image           : (name)    => `assets/images/${name}`,
  };

  // ── Resolution Cache (url → bool) ──────────────────────────────────────
  const _cache = new Map();

  /**
   * Check if a URL is reachable via HEAD request.
   * Uses cache to avoid redundant network calls.
   */
  async function _exists(url) {
    if (_cache.has(url)) return _cache.get(url);
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      const ok = r.ok;
      _cache.set(url, ok);
      return ok;
    } catch {
      _cache.set(url, false);
      return false;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────
  return {
    /**
     * Resolve a category transition video.
     * @param {string} module  - 'mix' | 'beat' | 'vokal' | 'discography' | 'album-detail'
     * @returns {Promise<{found:boolean, path:string|null}>}
     */
    async resolveTransitionVideo(module) {
      const path = PATHS.transitionVideo(module);
      const found = await _exists(path);
      return { found, path: found ? path : null };
    },

    /**
     * Resolve an album-specific intro video.
     * @param {string} albumId  - e.g. 'eminem-mmlp'
     * @returns {Promise<{found:boolean, path:string|null}>}
     */
    async resolveAlbumIntro(albumId) {
      const path = PATHS.albumIntroVideo(albumId);
      const found = await _exists(path);
      return { found, path: found ? path : null };
    },

    /**
     * Resolve a static image asset.
     * @param {string} name  - filename without path prefix
     */
    async resolveImage(name) {
      const path = PATHS.image(name);
      const found = await _exists(path);
      return { found, path: found ? path : null };
    },

    /**
     * Pre-warm the cache for all known assets.
     * Call at startup to avoid latency on first navigation.
     */
    async prewarm(albumIds = []) {
      const modules = ['mix', 'beat', 'vokal', 'discography'];
      const checks = [
        ...modules.map(m => _exists(PATHS.transitionVideo(m))),
        ...albumIds.map(id => _exists(PATHS.albumIntroVideo(id))),
      ];
      await Promise.allSettled(checks);
    },

    /**
     * Invalidate a specific cache entry (useful after user drops in a file).
     */
    invalidate(url) {
      _cache.delete(url);
    },

    /** Clear entire cache */
    clearCache() {
      _cache.clear();
    }
  };
})();

export default AssetManager;
