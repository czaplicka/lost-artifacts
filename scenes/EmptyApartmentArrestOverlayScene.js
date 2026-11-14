import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';

import {
  FailedAlibiArrestOverlayScene
} from './FailedAlibiArrestOverlayScene.js';

import {
  requestAutosave,
  flushAutosave
} from '../gameStatePersistence.js';

const SCENE_KEY = 'EmptyApartmentArrestOverlayScene';
const VIDEO_PATH = __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_3f9aafda104e38fe07fe");

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

    message.textContent = __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_47d2a515ef2f05b87d68");

    const button = document.createElement('button');

    Object.assign(button.style, {
      position: 'absolute',
      left: '50%',
      top: '60%',
      transform: __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_569bd25dce87a68e236e"),
      padding: __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_692ea4a5b5988b75787e"),
      border: __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_2d2d582cc6544da4ffd6"),
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
      padding: __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_1319878ebef56ba28ca8"),
      border: __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_c5dda845d9920a330837"),
      background: __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_2985c779056fbf2dc946"),
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
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_715d2660893d4e2c6eb0"),
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
    this.videoMessage.textContent = __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_47d2a515ef2f05b87d68");

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
          __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_653c34e124fd9121ae1e"),
          'PLAY'
        );

        return;
      }

      console.warn(
        '[EmptyApartmentArrest] Video playback failed:',
        error
      );

      this.showVideoPrompt(
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_20052e9b2b1e63e43a31"),
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
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_fd6fee35780648bf9c73"),
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
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_1744f2beabf56372425c") +
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_5b797b22795ac494a3bb") +
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_dde889a72a4d22202471"),
        4500,
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_0fa2e0046576e38dd099")
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
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_65c814816785ef005b15") +
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_616558b3e9e3e27bed72"),
        4000,
        __dialogueText("scenes/EmptyApartmentArrestOverlayScene.js", "t_c27978fb247345a3da90")
      );
    }

    return false;
  }
}