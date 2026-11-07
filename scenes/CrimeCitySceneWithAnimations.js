import {
  CrimeCityScene as OriginalCrimeCityScene
} from './CrimeCityScene.js';

import {
  BerlinMapAnimations
} from './crimeCity/BerlinMapAnimations.js';

const EVIDENCE_LAB_KEY = 'EvidenceAnalysisLabScene';

export class CrimeCityScene extends OriginalCrimeCityScene {
  createCrimeCityContent(...args) {
    super.createCrimeCityContent(...args);

    this.berlinMapAnimations?.destroy();
    this.berlinMapAnimations = null;

    const background = this.mapUI?.background;

    if (
      this.cityId === 'berlin' &&
      background?.active
    ) {
      this.berlinMapAnimations = new BerlinMapAnimations(
        this,
        background
      );
    }

    this.createEvidenceLabLocation();
  }

  createEvidenceLabLocation() {
    if (
      !this.mapUI ||
      !this.cityData?.crimeCity ||
      !this.isCrimeSceneCompleted()
    ) {
      return;
    }

    const { width, height } = this.scale;

    // Oddzielny punkt między istniejącymi rzędami mapy.
    // Nie zastępuje lokalizacji CSI.
    const top = Math.max(136, height * 0.18);

    const bottom = Math.max(
      top + 1,
      height - Math.max(140, height * 0.16)
    );

    const position = {
      x: Math.round(width * 0.5),
      y: Math.round(top + (bottom - top) * 0.25)
    };

    this.mapUI.createMapIcon({
      ...position,

      // Nie potrzebujemy nowego pliku graficznego.
      // Istniejący system użyje kolorowej ikony zastępczej.
      textureKey: 'evidence_analysis_lab_icon',

      label: 'Evidence Lab',

      fallbackColor: 0x173c2c,
      fallbackStroke: 0x46ff7a,

      onClick: () => {
        void this.openEvidenceAnalysisLab();
      }
    });
  }

  async ensureEvidenceAnalysisLab() {
    const registered = this.getRegisteredScene(
      EVIDENCE_LAB_KEY
    );

    if (registered) {
      return registered;
    }

    const module = await import(
      './EvidenceAnalysisLabScene.js'
    );

    const SceneClass =
      module.EvidenceAnalysisLabScene;

    if (typeof SceneClass !== 'function') {
      throw new Error(
        'EvidenceAnalysisLabScene export was not found.'
      );
    }

    // Podczas importu scena mogła zostać
    // zarejestrowana przez inny mechanizm.
    const existing = this.getRegisteredScene(
      EVIDENCE_LAB_KEY
    );

    if (existing) {
      return existing;
    }

    return this.scene.manager.add(
      EVIDENCE_LAB_KEY,
      SceneClass,
      false
    );
  }

  async openEvidenceAnalysisLab() {
    if (
      this.isTransitioning ||
      this.evidenceLabSession ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    if (!this.isCrimeSceneCompleted()) {
      this.showMessage(
        'Collect the objects at the crime scene first.\n' +
        'The laboratory cannot examine an empty pocket.',
        3000,
        '#294b36'
      );

      return false;
    }

    const token = this._runToken;

    this.isTransitioning = true;

    let session = null;

    try {
      const lab = await this.ensureEvidenceAnalysisLab();

      if (!this.isCurrentRun(token)) {
        return false;
      }

      if (
        lab.sys.isActive() ||
        lab.sys.isPaused() ||
        lab.sys.isSleeping()
      ) {
        this.showMessage(
          'The evidence workstation is already open.',
          2500,
          '#294b36'
        );

        return false;
      }

      this.closeAllUIPanels();

      const manager = this.scene.manager;

      const snapshot = manager
        .getScenes(true)
        .filter(scene => scene !== lab)
        .map(scene => ({
          scene,
          key: scene.sys.settings.key,
          visible: scene.sys.isVisible(),
          pausedByLab: false
        }));

      const dom = this.game.domContainer;
      const domVisibility = dom?.style.visibility;

      let restored = false;

      const restore = () => {
        if (restored) return;
        restored = true;

        lab.events.off('shutdown', restore);
        lab.events.off('destroy', restore);

        for (const entry of snapshot) {
          try {
            const current = manager.keys[entry.key];

            // Nie dotykamy nowej instancji sceny,
            // jeżeli stara została zastąpiona.
            if (current !== entry.scene) continue;

            // Nie przywracamy widoczności scen
            // zatrzymanych przez inny mechanizm.
            if (
              !current.sys.isActive() &&
              !current.sys.isPaused() &&
              !current.sys.isSleeping()
            ) {
              continue;
            }

            current.sys.setVisible(entry.visible);

            if (
              entry.pausedByLab &&
              current.sys.isPaused()
            ) {
              manager.resume(entry.key);
            }
          } catch (error) {
            console.error(
              '[EvidenceLab] Scene restore failed:',
              entry.key,
              error
            );
          }
        }

        if (dom) {
          dom.style.visibility = domVisibility;
        }

        if (this.evidenceLabSession === session) {
          this.evidenceLabSession = null;
        }

        if (
          token === this._runToken &&
          !this._cleanupDone
        ) {
          this.isTransitioning = false;
        }
      };

      session = {
        lab,
        restore
      };

      this.evidenceLabSession = session;

      lab.events.once('shutdown', restore);
      lab.events.once('destroy', restore);

      for (const entry of snapshot) {
        manager.pause(entry.key);

        entry.pausedByLab = true;

        entry.scene.sys.setVisible(false);
      }

      if (dom) {
        dom.style.visibility = 'hidden';
      }

      manager.start(EVIDENCE_LAB_KEY, {
        cityId: this.cityId,

        returnScene: this.sys.settings.key,

        returnData: {
          cityId: this.cityId
        },

        sourceScene: this.sys.settings.key
      });

      manager.bringToTop(EVIDENCE_LAB_KEY);

      return true;
    } catch (error) {
      console.error(
        '[CrimeCityScene] Evidence Lab failed to open:',
        error
      );

      if (session) {
        try {
          this.scene.manager.stop(EVIDENCE_LAB_KEY);
        } catch (stopError) {
          console.error(
            '[EvidenceLab] Failed to stop scene:',
            stopError
          );
        } finally {
          session.restore();
        }
      }

      if (this.isCurrentRun(token)) {
        this.showMessage(
          'The evidence workstation could not be opened.\n' +
          'Check the console for details.',
          3500,
          '#8b0000'
        );
      }

      return false;
    } finally {
      if (
        token === this._runToken &&
        !this._cleanupDone &&
        !this.evidenceLabSession
      ) {
        this.isTransitioning = false;
      }
    }
  }

  destroyControllers(...args) {
    this.berlinMapAnimations?.destroy();
    this.berlinMapAnimations = null;

    super.destroyControllers(...args);
  }
}