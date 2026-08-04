// ============================================================
// Lost Artefacts - MobileFullscreen
// Pełny ekran + blokada orientacji landscape na mobile
// Plik: mobileFullscreen.js
// ============================================================

export class MobileFullscreen {

  constructor() {
    this.isLocked = false;
    this.rotateOverlay = null;
    this._init();
  }

  // Sprawdza czy urządzenie jest mobile
  isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  // Sprawdza czy jesteśmy w trybie standalone / fullscreen (PWA)
  isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.navigator.standalone === true
    );
  }

  // Główna inicjalizacja
  _init() {
    this._createRotateOverlay();
    this._createRotateKeyframes();

    window.addEventListener('orientationchange', () => this._checkOrientation());
    window.addEventListener('resize', () => this._checkOrientation());
    document.addEventListener('fullscreenchange', () => this._checkOrientation());
    document.addEventListener('webkitfullscreenchange', () => this._checkOrientation());

    this._checkOrientation();
  }

  // Tworzy overlay "OBRÓĆ TELEFON"
  _createRotateOverlay() {
    if (document.getElementById('rotate-overlay')) {
      this.rotateOverlay = document.getElementById('rotate-overlay');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'rotate-overlay';
    overlay.style.cssText = [
      'position: fixed',
      'inset: 0',
      'z-index: 99999',
      'display: none',
      'align-items: center',
      'justify-content: center',
      'flex-direction: column',
      'background: #1a1a2e',
      'color: #e0c068',
      "font-family: 'Press Start 2P', 'Special Elite', monospace",
      'text-align: center',
      'padding: 40px',
      'user-select: none',
      '-webkit-user-select: none',
      'touch-action: none'
    ].join('; ');

    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 64px; margin-bottom: 30px; animation: mobileRotateHint 2s ease-in-out infinite;';
    icon.textContent = '\uD83D\uDCF1';

    const text = document.createElement('div');
    text.style.cssText = 'font-size: 14px; line-height: 1.8;';
    text.innerHTML = 'OBR\u00D3\u0106 TELEFON<br>DO POZIOMU';

    overlay.appendChild(icon);
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    this.rotateOverlay = overlay;
  }

  // Wstrzykuje @keyframes do <head>
  _createRotateKeyframes() {
    if (document.getElementById('mobile-rotate-keyframes')) return;

    const style = document.createElement('style');
    style.id = 'mobile-rotate-keyframes';
    style.textContent = [
      '@keyframes mobileRotateHint {',
      '  0%, 100% { transform: rotate(0deg); }',
      '  50% { transform: rotate(90deg); }',
      '}'
    ].join(' ');
    document.head.appendChild(style);
  }

  // Pokazuje / ukrywa overlay w zależności od orientacji
  _checkOrientation() {
    if (!this.isMobile()) return;
    if (!this.rotateOverlay) return;

    if (this.isStandalone() && !this._isPortrait()) {
      this.rotateOverlay.style.display = 'none';
      return;
    }

    const isPortrait = this._isPortrait();
    this.rotateOverlay.style.display = isPortrait ? 'flex' : 'none';
  }

  // Sprawdza czy ekran jest w pionie (portrait)
  _isPortrait() {
    if (screen.orientation && screen.orientation.type) {
      return screen.orientation.type.startsWith('portrait');
    }
    return window.innerHeight > window.innerWidth;
  }

  // ---- KLUCZOWA FUNKCJA ----
  // MUSI być wywołana z gestu użytkownika (click/tap)!
  async enterFullscreenLandscape() {
    try {
      // Krok 1: Fullscreen API
      const el = document.documentElement;
      const requestFS =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;

      if (requestFS) {
        const fsPromise = requestFS.call(el);
        if (fsPromise && fsPromise.then) {
          await fsPromise;
        }
      }

      // Krok 2: Lock orientacji (wymaga fullscreen!)
      if (screen.orientation && screen.orientation.lock) {
        try {
          await screen.orientation.lock('landscape');
          this.isLocked = true;
          console.log('[MobileFullscreen] Orientation locked to landscape');
        } catch (lockErr) {
          console.warn('[MobileFullscreen] Orientation lock failed (probably iOS):', lockErr.message);
        }
      } else {
        console.warn('[MobileFullscreen] screen.orientation.lock not supported - CSS overlay fallback');
      }

      this._checkOrientation();
      return true;
    } catch (err) {
      console.error('[MobileFullscreen] Fullscreen failed:', err.message);
      this._checkOrientation();
      return false;
    }
  }

  // Wyjście z fullscreen
  async exitFullscreen() {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      }
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
      this.isLocked = false;
    } catch (e) {
      console.warn('[MobileFullscreen] Exit failed:', e.message);
    }
  }

  // Czy urządzenie obsługuje Fullscreen API
  supportsFullscreen() {
    return !!(
      document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen
    );
  }

  // Czy urządzenie obsługuje orientation lock
  supportsOrientationLock() {
    return !!(screen.orientation && screen.orientation.lock);
  }
}

// ---- EKSPORT (ES Module) ----
export default MobileFullscreen;