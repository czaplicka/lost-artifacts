import { BaseScene } from './BaseScene.js';

import {
  FailedAlibiArrestOverlayScene
} from './FailedAlibiArrestOverlayScene.js';

import {
  requestAutosave,
  flushAutosave
} from '../gameStatePersistence.js';

const SCENE_KEY = 'EmptyApartmentArrestOverlayScene';
const VIDEO_PATH = 'assets/video/failed_arrest.mp4';

const pendingLaunches = new WeakMap();

function cancelPendingLaunch(scene) {
  const pending = pendingLaunches.get(scene);

  if (!pending) return;

  scene.events.off(
    Phaser.Scenes.Events.PRE_UPDATE,
    pending.onReady
  );

  scene.events.off(
    Phaser.Scenes.Events.SHUTDOWN,
    pending.onShutdown
  );

  pendingLaunches.delete(scene);
}

function scheduleLaunchAfterCreate(scene) {
  if (pendingLaunches.has(scene)) return true;

  const onReady = () => {
    cancelPendingLaunch(scene);

    if (
      scene._cleanupDone ||
      !scene.sys.isActive()
    ) {
      return;
    }

    void launchEmptyApartmentArrest(scene);
  };

  const onShutdown = () => {
    cancelPendingLaunch(scene);
  };

  pendingLaunches.set(scene, {
    onReady,
    onShutdown
  });

  scene.events.once(
    Phaser.Scenes.Events.PRE_UPDATE,
    onReady
  );

  scene.events.once(
    Phaser.Scenes.Events.SHUTDOWN,
    onShutdown
  );

  return true;
}

export class EmptyApartmentArrestOverlayScene
  extends FailedAlibiArrestOverlayScene {

  constructor() {
    super();

    this.sys.settings.key = SCENE_KEY;
  }

  init(data = {}) {
    super.init(data);

    this.completed = false;
    this.apartmentRestored = false;

    this.videoLayer = null;
    this.videoElement = null;
    this.videoButton = null;
    this.videoMessage = null;

    this.videoDisposed = false;
    this.playAttempt = 0;
  }

  preload() {
    // This scene uses an HTML video, not the old agent artwork.
  }

  create() {
    // Initialise BaseScene without creating the inherited animation.
    BaseScene.prototype.create.call(this);

    this.input.setTopOnly(true);

    this.captureHud();
    this.hideOperationHud();

    const parent = this.getRegisteredScene(
      this.parentSceneKey
    );

    this.parentWasPaused =
      this.scene.isPaused(this.parentSceneKey);

    if (
      parent &&
      this.scene.isActive(this.parentSceneKey)
    ) {
      this.parentPausedByOperation = true;
      this.scene.pause(this.parentSceneKey);
    }

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        this.disposeVideo();
        this.restoreApartment();
      }
    );

    this.createVideoLayer();
    this.scene.bringToTop();

    void this.playVideo();
  }

  createVideoLayer() {
    const layer = document.createElement('div');

    Object.assign(layer.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '10000',
      background: '#000',
      overflow: 'hidden',
      pointerEvents: 'auto'
    });

    const video = document.createElement('video');

    video.src = new URL(
      VIDEO_PATH,
      document.baseURI
    ).href;

    video.preload = 'auto';
    video.playsInline = true;
    video.controls = false;
    video.loop = false;
    video.muted = false;
    video.disablePictureInPicture = true;

    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    Object.assign(video.style, {
      position: 'absolute',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      background: '#000'
    });

    const message = document.createElement('div');

    Object.assign(message.style, {
      position: 'absolute',
      left: '24px',
      right: '24px',
      top: '45%',
      color: '#f4e3bc',
      textAlign: 'center',
      fontFamily: 'SpecialElite, monospace',
      fontSize: '22px',
      pointerEvents: 'none'
    });

    message.textContent = 'Loading...';

    const button = document.createElement('button');

    Object.assign(button.style, {
      position: 'absolute',
      left: '50%',
      top: '60%',
      transform: 'translate(-50%, -50%)',
      padding: '16px 24px',
      border: '2px solid #a58655',
      background: '#241e19',
      color: '#f4e3bc',
      fontFamily: 'PressStart2P, monospace',
      fontSize: '12px',
      cursor: 'pointer',
      display: 'none'
    });

    button.textContent = 'PLAY';

    button.onclick = () => {
      if (this.finishing || this.videoDisposed) return;

      if (this.videoElement?.error) {
        this.videoElement.load();
      }

      void this.playVideo();
    };

    const skip = document.createElement('button');

    Object.assign(skip.style, {
      position: 'absolute',
      right: '20px',
      bottom: '20px',
      padding: '12px 16px',
      border: '1px solid #a58655',
      background: 'rgba(0, 0, 0, 0.65)',
      color: '#ead1a0',
      fontFamily: 'PressStart2P, monospace',
      fontSize: '10px',
      cursor: 'pointer'
    });

    skip.textContent = 'SKIP';

    skip.onclick = () => {
      void this.finishToGameOver();
    };

    video.onplaying = () => {
      if (this.videoDisposed) return;

      message.textContent = '';
      button.style.display = 'none';
    };

    video.onended = () => {
      void this.finishToGameOver();
    };

    video.onerror = () => {
      this.showVideoPrompt(
        'The video could not be loaded. Retry or skip.',
        'RETRY'
      );
    };

    layer.append(video, message, button, skip);

    // Keep the video inside fullscreen when the game uses it.
    const fullscreenHost = document.fullscreenElement;

    const host =
      fullscreenHost instanceof HTMLElement &&
      fullscreenHost !== this.game.canvas
        ? fullscreenHost
        : document.body;

    host.appendChild(layer);

    this.videoLayer = layer;
    this.videoElement = video;
    this.videoButton = button;
    this.videoMessage = message;
  }

  showVideoPrompt(message, buttonText) {
    if (
      this.videoDisposed ||
      this._cleanupDone ||
      this.finishing ||
      this.finished
    ) {
      return;
    }

    this.videoMessage.textContent = message;
    this.videoButton.textContent = buttonText;
    this.videoButton.style.display = 'block';
  }

  async playVideo() {
    if (
      this.videoDisposed ||
      this._cleanupDone ||
      this.finishing ||
      this.finished
    ) {
      return;
    }

    const attempt = ++this.playAttempt;

    this.videoButton.style.display = 'none';
    this.videoMessage.textContent = 'Loading...';

    try {
      await this.videoElement.play();
    } catch (error) {
      if (
        attempt !== this.playAttempt ||
        this.videoDisposed ||
        this._cleanupDone
      ) {
        return;
      }

      if (error?.name === 'NotAllowedError') {
        this.showVideoPrompt(
          'Click to play.',
          'PLAY'
        );

        return;
      }

      console.warn(
        '[EmptyApartmentArrest] Video playback failed:',
        error
      );

      this.showVideoPrompt(
        'The video could not be played. Retry or skip.',
        'RETRY'
      );
    }
  }

  update() {
    this.hideOperationHud();
    this.scene.bringToTop();
  }

  async finishToGameOver() {
    // Keep the existing method name used by this overlay.
    // A correct address leads to the apartment, not Game Over.
    if (
      this.finishing ||
      this.finished ||
      this._cleanupDone
    ) {
      return;
    }

    this.finishing = true;
    this.playAttempt += 1;

    this.videoElement?.pause();

    try {
      const apartment = this.getRegisteredScene(
        this.parentSceneKey
      );

      if (
        !apartment ||
        apartment._cleanupDone ||
        apartment.suspectId !== this.suspectId ||
        apartment.caseKey !== this.caseId
      ) {
        throw new Error(
          'The apartment no longer matches this operation.'
        );
      }

      apartment.updateProgress({
        arrestVisit: {
          caseKey: this.caseId,
          suspectId: this.suspectId,
          outcome: 'suspect_escaped',
          completed: true
        }
      });

      requestAutosave();
      flushAutosave();

      this.completed = true;
      this.finished = true;

      this.scene.stop();
    } catch (error) {
      console.error(
        '[EmptyApartmentArrest] Could not finish operation:',
        error
      );

      if (this._cleanupDone) return;

      this.finishing = false;

      this.showVideoPrompt(
        'The apartment search could not be opened. Press SKIP to retry.',
        'REPLAY'
      );
    }
  }

  disposeVideo() {
    if (this.videoDisposed) return;

    this.videoDisposed = true;
    this.playAttempt += 1;

    if (this.videoElement) {
      this.videoElement.onplaying = null;
      this.videoElement.onended = null;
      this.videoElement.onerror = null;

      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
    }

    this.videoLayer?.remove();

    this.videoElement = null;
    this.videoLayer = null;
    this.videoButton = null;
    this.videoMessage = null;
  }

  restoreApartment() {
    if (this.apartmentRestored) return;

    this.apartmentRestored = true;

    this.restoreOperationHud();

    const apartment = this.getRegisteredScene(
      this.parentSceneKey
    );

    if (
      !apartment ||
      apartment._cleanupDone ||
      apartment.suspectId !== this.suspectId ||
      apartment.caseKey !== this.caseId
    ) {
      return;
    }

    if (this.scene.isPaused(this.parentSceneKey)) {
      this.scene.resume(this.parentSceneKey);
    }

    apartment._arrestIntroOpening = false;

    if (this.completed) {
      apartment.showMessage(
        'The suspect has already escaped.\n' +
        'Search the apartment for clues ' +
        'to their next destination.',
        4500,
        '#795548'
      );
    }

    void apartment.setupSharedHud();
  }
}

export async function launchEmptyApartmentArrest(scene) {
  if (
    !scene ||
    !scene.sys ||
    scene._cleanupDone
  ) {
    return false;
  }

  if (
    scene.sys.settings.status === Phaser.Scenes.CREATING
  ) {
    return scheduleLaunchAfterCreate(scene);
  }

  if (!scene.sys.isActive()) return false;

  if (scene._arrestIntroOpening) return false;

  const visit = scene.getProgress().arrestVisit;

  if (
    visit?.completed === true &&
    visit.caseKey === scene.caseKey &&
    visit.suspectId === scene.suspectId
  ) {
    return false;
  }

  if (scene.isSceneRunning(SCENE_KEY)) {
    if (scene.scene.isSleeping(SCENE_KEY)) {
      scene.scene.wake(SCENE_KEY);
    } else if (scene.scene.isPaused(SCENE_KEY)) {
      scene.scene.resume(SCENE_KEY);
    }

    scene.scene.setVisible(true, SCENE_KEY);
    scene.scene.bringToTop(SCENE_KEY);

    return true;
  }

  scene._arrestIntroOpening = true;

  try {
    scene.getPlayerHudScene()?.closeAllUIPanels?.();

    if (!scene.hasScene(SCENE_KEY)) {
      scene.scene.add(
        SCENE_KEY,
        EmptyApartmentArrestOverlayScene,
        false
      );
    }

    scene.scene.launch(
      SCENE_KEY,
      {
        parentSceneKey: scene.sys.settings.key,
        suspectId: scene.suspectId,
        caseId: scene.caseKey
      }
    );

    return true;
  } catch (error) {
    scene._arrestIntroOpening = false;

    console.error(
      '[EmptyApartmentArrest] Could not launch operation:',
      error
    );

    if (
      !scene._cleanupDone &&
      scene.sys.isActive()
    ) {
      scene.showMessage(
        'The arrest operation could not be opened.\n' +
        'Check the console for details.',
        4000,
        '#8b3030'
      );
    }

    return false;
  }
}