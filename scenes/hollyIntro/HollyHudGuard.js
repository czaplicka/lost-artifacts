import { gameState } from '../../GameData.js';
import { T } from './HollyIntroText.js';

export class HollyHudGuard {
  constructor(owner) {
    this.owner = owner;
    this.snapshots = new Map();
    this.style = null;
    this.active = false;
    this.enforce = this.enforce.bind(this);
  }

  start() {
    if (this.active) return;

    this.active = true;

    if (typeof document !== 'undefined' && document.head) {
      this.style = document.createElement('style');
      this.style.setAttribute('data-holly-hud-lock', 'true');
      this.style.textContent = `${T('t_3f18ff5f78084f067ac4')}`;
      document.head.appendChild(this.style);
    }

    this.owner.events.on('preupdate', this.enforce);
    this.enforce();
  }

  enforce() {
    if (!this.active) return;

    const keys = this.owner.scene?.manager?.keys;
    if (!keys) return;

    for (const key of ['UIScene', 'PlayerHudScene', 'NewsHud']) {
      const scene = keys[key];

      if (
        !scene?.sys ||
        !(scene.sys.isActive() || scene.sys.isPaused())
      ) {
        continue;
      }

      let snapshot = this.snapshots.get(key);

      if (!snapshot || snapshot.scene !== scene) {
        snapshot = {
          scene,
          visible: scene.sys.settings.visible,
          input: scene.input,
          inputEnabled: scene.input?.enabled,
          keyboard: scene.input?.keyboard,
          keyboardEnabled: scene.input?.keyboard?.enabled,
          newsEnabled: key === 'NewsHud' ? scene.hudEnabled : null
        };

        this.snapshots.set(key, snapshot);

        if (key === 'PlayerHudScene') {
          scene.closeAllUIPanels?.();
          scene._panelInstances?.get('playerMenu')?.close?.();
        }

        if (key === 'UIScene') {
          scene._hideTooltip?.();
          scene._setEnergyLogVisible?.(false);
        }
      }

      if (key === 'NewsHud') {
        scene.closeMenu?.(true);

        if (scene.hudEnabled !== false) {
          scene.setHudVisible?.(false);
        }
      }

      scene.sys.setVisible(false);

      if (scene.input) {
        scene.input.enabled = false;
      }

      if (scene.input?.keyboard) {
        scene.input.keyboard.enabled = false;
      }
    }
  }

  release() {
    if (!this.active) return;

    this.active = false;
    this.owner.events.off('preupdate', this.enforce);

    this.style?.remove();
    this.style = null;

    const keys = this.owner.scene?.manager?.keys;
    const failed = gameState.caseFailed === true;

    for (const [key, snapshot] of this.snapshots) {
      const scene = keys?.[key];

      if (
        scene !== snapshot.scene ||
        !scene?.sys ||
        !(scene.sys.isActive() || scene.sys.isPaused())
      ) {
        continue;
      }

      if (
        scene.input === snapshot.input &&
        typeof snapshot.inputEnabled === 'boolean'
      ) {
        scene.input.enabled = snapshot.inputEnabled;
      }

      if (
        scene.input?.keyboard === snapshot.keyboard &&
        typeof snapshot.keyboardEnabled === 'boolean'
      ) {
        scene.input.keyboard.enabled = snapshot.keyboardEnabled;
      }

      if (
        key === 'NewsHud' &&
        typeof snapshot.newsEnabled === 'boolean'
      ) {
        scene.setHudVisible?.(failed ? false : snapshot.newsEnabled);
      }

      if (failed && key === 'UIScene') {
        scene.hideHUD?.();
      }

      scene.sys.setVisible(failed ? false : snapshot.visible);
    }

    this.snapshots.clear();
  }
}
