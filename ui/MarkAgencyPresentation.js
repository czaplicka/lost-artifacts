const OVERLAY_KEYS = [
  'PlayerHudScene',
  'NewsHud',
  'UIScene'
];

export const MARK_COMPUTER_HUD_CLASS =
  'mark-computer-hide-gameplay-hud';

export class MarkAgencyPresentation {
  constructor(scene, canRestore) {
    this.scene = scene;
    this.canRestore = canRestore;
    this.hidden = false;

    this.overlaySnapshots = new Map();
    this.objectSnapshots = new Map();
    this.navigationSnapshots = new Map();
  }

  hideObject(object) {
    if (
      !object?.active ||
      typeof object.setVisible !== 'function'
    ) {
      return;
    }

    if (!this.objectSnapshots.has(object)) {
      this.objectSnapshots.set(object, {
        visible: object.visible
      });
    }

    object.setVisible(false);
  }

  hideOverlay(key) {
    const scene = this.scene;
    const overlay = scene.scene.manager.keys[key];

    if (!overlay?.sys) return;

    const previous = this.overlaySnapshots.get(key);

    if (!previous || previous.overlay !== overlay) {
      this.overlaySnapshots.set(key, {
        overlay,
        visible: overlay.sys.settings.visible,
        enabled: overlay.input?.enabled
      });
    }

    if (overlay.sys.settings.visible) {
      scene.scene.setVisible(false, key);
    }

    if (overlay.input) {
      overlay.input.enabled = false;
    }
  }

  hideTutorial() {
    const tutorials = new Set([
      this.scene.firstCaseTutorial,
      this.scene.tutorialController
    ]);

    for (const tutorial of tutorials) {
      if (!tutorial) continue;

      this.hideObject(tutorial.overlay);
      this.hideObject(tutorial.highlight);
    }
  }

  hideMonologue() {
    const container = this.scene.monologue?.container;

    if (
      !container?.active ||
      typeof container.setVisible !== 'function'
    ) {
      return;
    }

    // Nie przywracamy starego monologu po zamknięciu komputera.
    // Timery i kolejka nadal kończą się normalnie.
    container.setVisible(false);
  }

  enforce() {
    if (
      !this.hidden ||
      !this.scene.sys.isActive()
    ) {
      return;
    }

    document.documentElement.classList.add(
      MARK_COMPUTER_HUD_CLASS
    );

    for (const key of OVERLAY_KEYS) {
      this.hideOverlay(key);
    }

    const navigation = this.scene.navigation;

    if (navigation) {
      if (!this.navigationSnapshots.has(navigation)) {
        this.navigationSnapshots.set(navigation, {
          visible: navigation.isVisible
        });
      }

      if (navigation.isVisible) {
        navigation.setVisible(false);
      }

      navigation.hideHint();
    }

    this.hideObject(this.scene.archiveButton);
    this.hideObject(this.scene.storageButton);
    this.hideObject(this.scene.saveUI?.button);

    this.hideTutorial();
    this.hideMonologue();
  }

  hide() {
    if (this.hidden) return;

    this.hidden = true;
    this.enforce();
  }

  restore({ restoreHud = true } = {}) {
    if (!this.hidden) return;

    this.hidden = false;

    const attempt = (label, action) => {
      try {
        action();
      } catch (error) {
        console.warn(
          `[MarkAgencyPresentation] ${label} restore failed:`,
          error
        );
      }
    };

    attempt('CSS', () => {
      document.documentElement.classList.remove(
        MARK_COMPUTER_HUD_CLASS
      );
    });

    let restoreVisible = false;

    attempt('eligibility', () => {
      restoreVisible = Boolean(
        restoreHud && this.canRestore()
      );
    });

    for (const [key, snapshot] of this.overlaySnapshots) {
      attempt(key, () => {
        const overlay =
          this.scene.scene.manager.keys[key];

        if (overlay !== snapshot.overlay) return;

        if (
          overlay.input &&
          snapshot.enabled !== undefined
        ) {
          overlay.input.enabled = snapshot.enabled;
        }

        if (restoreVisible) {
          this.scene.scene.setVisible(
            snapshot.visible,
            key
          );
        }
      });
    }

    this.overlaySnapshots.clear();

    if (restoreVisible) {
      const navigation = this.scene.navigation;
      const snapshot =
        this.navigationSnapshots.get(navigation);

      if (snapshot && !navigation.isDestroyed) {
        attempt('navigation', () => {
          navigation.setVisible(snapshot.visible);
        });
      }

      for (
        const [object, objectSnapshot]
        of this.objectSnapshots
      ) {
        attempt('object', () => {
          if (object.active) {
            object.setVisible(objectSnapshot.visible);
          }
        });
      }
    }

    this.navigationSnapshots.clear();
    this.objectSnapshots.clear();
  }
}