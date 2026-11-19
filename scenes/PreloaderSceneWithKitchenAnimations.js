import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
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
      item =>
        item.type === __dialogueText(
          'scenes/PreloaderSceneWithKitchenAnimations.js',
          't_1aa4cb0bcca76e92e306'
        ) &&
        item.texture?.key === 'cozyBackground'
    );

    if (background?.active) {
      this.kitchenAmbientAnimations = new KitchenAmbientAnimations(
        this,
        background
      );
    }

    this._showKitchenVersion(width, height);
  }

  _showKitchenVersion(width, height) {
    this._clearKitchenVersion();

    const label = this.add.text(
      width - 16,
      height - 16,
      `GAME v${GAME_VERSION}\nBUILD —`,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: `${Math.max(12, Math.round(height * 0.016))}px`,
        color: '#f6e9d3',
        backgroundColor: '#211812',
        align: 'right',
        padding: { x: 10, y: 7 }
      }
    ).setOrigin(1, 1).setDepth(10000);

    const request = new AbortController();
    this.kitchenVersionLabel = label;
    this.kitchenBuildRequest = request;

    void this._loadKitchenBuild(label, request);
  }

  async _loadKitchenBuild(label, request) {
    try {
      const response = await fetch(BUILD_INFO_URL, {
        cache: 'no-store',
        signal: request.signal
      });

      if (!response.ok) return;

      const { branch, commit } = await response.json();

      if (
        typeof branch !== 'string' ||
        !branch.trim() ||
        typeof commit !== 'string' ||
        !/^[0-9a-f]{7,40}$/i.test(commit)
      ) {
        return;
      }

      if (this.kitchenVersionLabel === label && label.active) {
        label.setText(`GAME v${GAME_VERSION}\nBUILD ${branch}@${commit}`);
      }
    } catch {
      // Missing build metadata must not interrupt game startup.
    }
  }

  _clearKitchenVersion() {
    this.kitchenBuildRequest?.abort();
    this.kitchenBuildRequest = null;
    this.kitchenVersionLabel?.destroy();
    this.kitchenVersionLabel = null;
  }

  _cleanupPreloader() {
    this._clearKitchenVersion();
    this.kitchenAmbientAnimations?.destroy();
    this.kitchenAmbientAnimations = null;
    super._cleanupPreloader();
  }
}