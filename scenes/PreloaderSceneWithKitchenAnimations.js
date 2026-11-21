import { GAME_VERSION } from '../config/gameVersion.js';
import { PreloaderScene as OriginalPreloaderScene } from './PreloaderScene.js';
import { KitchenAmbientAnimations } from './kitchen/KitchenAmbientAnimations.js';

const BUILD_INFO_URL = new URL('../build-info.json', import.meta.url);

export class PreloaderScene extends OriginalPreloaderScene {
  _createPreloadBackground(width, height) {
    this.kitchenAmbientAnimations?.destroy();
    this.kitchenAmbientAnimations = null;

    super._createPreloadBackground(width, height);

    const background = [...this.children.list].reverse().find(
      item => item.texture?.key === 'cozyBackground'
    );

    if (background?.active) {
      this.kitchenAmbientAnimations = new KitchenAmbientAnimations(
        this,
        background
      );
    }

    // The base preload() calls _showKitchenVersion() after creating the UI.
  }

  _showKitchenVersion() {
    this._clearKitchenVersion();

    const element = document.createElement('div');
    element.id = 'mark-agency-kitchen-version';
    element.textContent = `GAME v${GAME_VERSION}\nBUILD —`;

    Object.assign(element.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      zIndex: '2147483647',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'none',
      whiteSpace: 'pre',
      textAlign: 'right',
      fontFamily: 'monospace',
      fontSize: '16px',
      lineHeight: '1.5',
      color: '#fff1d6',
      background: 'rgba(33, 24, 18, 0.94)',
      padding: '8px 12px',
      border: '1px solid #c9aa70',
      borderRadius: '4px'
    });

    document.body.appendChild(element);

    const request = new AbortController();

    this._kitchenVersionElement = element;
    this._kitchenVersionRequest = request;

    void this._readKitchenBuild(element, request);
  }

  async _readKitchenBuild(element, request) {
    const timeout = window.setTimeout(() => request.abort(), 5000);

    try {
      const response = await fetch(BUILD_INFO_URL, {
        cache: 'no-store',
        signal: request.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const build = await response.json();

      if (
        typeof build?.branch !== 'string' ||
        !build.branch.trim() ||
        typeof build?.commit !== 'string' ||
        !/^[0-9a-f]{7,40}$/i.test(build.commit)
      ) {
        throw new Error('Invalid build-info.json');
      }

      if (
        this._kitchenVersionElement === element &&
        element.isConnected
      ) {
        element.textContent =
          `GAME v${GAME_VERSION}\n` +
          `BUILD ${build.branch.trim()}@${build.commit}`;
      }
    } catch (error) {
      if (
        this._kitchenVersionElement === element &&
        element.isConnected
      ) {
        element.textContent =
          `GAME v${GAME_VERSION}\nBUILD unavailable`;

        console.warn(
          '[KitchenVersion] Could not read build-info.json:',
          error
        );
      }
    } finally {
      window.clearTimeout(timeout);

      if (this._kitchenVersionRequest === request) {
        this._kitchenVersionRequest = null;
      }
    }
  }

  _clearKitchenVersion() {
    this._kitchenVersionRequest?.abort();
    this._kitchenVersionRequest = null;

    this._kitchenVersionElement?.remove();
    this._kitchenVersionElement = null;

    // Also clears any label created by the base implementation.
    super._clearKitchenVersion();
  }

  _cleanupPreloader() {
    this.kitchenAmbientAnimations?.destroy();
    this.kitchenAmbientAnimations = null;

    // The base cleanup calls our _clearKitchenVersion().
    super._cleanupPreloader();
  }
}