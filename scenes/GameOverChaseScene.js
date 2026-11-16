import {
  GameOverScene as OriginalScene
} from './GameOverScene.js';

import {
  settleChase
} from '../systems/chasePersistence.js';

const HUD_SCENES = new Set([
  'PlayerHudScene',
  'UIScene',
  'NewsHud',
  'EnergyHudScene'
]);

export class GameOverScene extends OriginalScene {
  create() {
    super.create();

    settleChase('GameOverScene');

    this.hideGameOverHud();

    // Ukrywa również HUD uruchomiony później przez inną scenę.
    const hideHudBeforeRender = () => {
      if (!this.sys.isActive()) return;

      this.hideGameOverHud();
    };

    this.game.events.on(
      'prerender',
      hideHudBeforeRender
    );

    const removeHudGuard = () => {
      this.game.events.off(
        'prerender',
        hideHudBeforeRender
      );

      this.events.off(
        Phaser.Scenes.Events.SHUTDOWN,
        removeHudGuard
      );

      this.events.off(
        Phaser.Scenes.Events.DESTROY,
        removeHudGuard
      );
    };

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      removeHudGuard
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      removeHudGuard
    );
  }

  hideGameplayInterface() {
    super.hideGameplayInterface();

    this.hideGameOverHud();
  }

  hideGameOverHud() {
    const scenes = this.scene?.manager?.keys;

    if (!scenes) return;

    for (const scene of Object.values(scenes)) {
      if (!scene || scene === this) continue;

      const key = scene.sys?.settings?.key || '';

      if (
        !HUD_SCENES.has(key) &&
        !/HudScene$/.test(key)
      ) {
        continue;
      }

      if (scene.sys.settings.visible !== false) {
        scene.scene.setVisible(false);
      }
    }
  }

  buildResultPanel() {
    // Kontener pozostaje, ponieważ animacja w klasie bazowej
    // pokazuje go po zakończeniu intro.
    this.resultPanel = this.add
      .container(0, 0)
      .setAlpha(0)
      .setVisible(false);

    this.stage.add(this.resultPanel);

    // Bez ramki, tytułu i opisu nad przyciskiem.
    this.continueBtn = this.add
      .image(1580, 550, 'btnContinue')
      .setOrigin(0.5);

    this.continueButtonBaseScale = Math.min(
      285 / this.continueBtn.width,
      70 / this.continueBtn.height
    );

    this.continueBtn.setScale(
      this.continueButtonBaseScale
    );

    this.resultPanel.add(this.continueBtn);

    this.continueBtn.on('pointerover', () => {
      if (
        this.isLeaving ||
        !this.introComplete
      ) {
        return;
      }

      this.continueBtn.setScale(
        this.continueButtonBaseScale * 1.06
      );
    });

    this.continueBtn.on('pointerout', () => {
      this.continueBtn?.setScale(
        this.continueButtonBaseScale
      );
    });

    this.continueBtn.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (
          !this.introComplete ||
          this.isLeaving
        ) {
          return;
        }

        void this.continueToAgainScene();
      }
    );
  }
}