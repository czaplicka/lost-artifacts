import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';

import {
  saveGameState
} from '../gameStatePersistence.js';

const SCENE_KEY = 'FailedAlibiArrestOverlayScene';

const SOURCE_KEY = 'failed-alibi-arrest-source';
const CUTOUT_KEY = 'failed-alibi-arrest-cutout';
const AGENTS_PATH = 'assets/cutscenes/arrest-agents.jpg';

const HUD_KEYS = [
  'PlayerHudScene',
  'NewsHud',
  'UIScene'
];

const FAILURE_MESSAGE =
  __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_bafcd6842a1faeab3265") +
  __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_04a9e2706981290d8c9e") +
  __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_93a790ecf7e8ecdac267");

const W = 1280;
const H = 800;

export class FailedAlibiArrestOverlayScene extends BaseScene {
  constructor() {
    super({ key: SCENE_KEY });
  }

  init(data = {}) {
    this.parentSceneKey =
      data.parentSceneKey || 'CrimeCityScene';

    this.suspectId = data.suspectId ?? null;

    this.caseId =
      data.caseId ??
      gameState.currentCaseId ??
      null;

    this.root = null;
    this.blocker = null;
    this.agents = null;
    this.agentsVisual = null;
    this.caption = null;
    this.statusText = null;
    this.retryButton = null;
    this.lampGlow = null;

    this.phase = 'outbound';
    this.moving = false;
    this.finishing = false;
    this.finished = false;

    this.motion = { x: -240 };
    this.clock = 0;
    this.agentsBaseScale = 1;
    this.missingArtwork = false;

    this.hudSnapshot = {};
    this.parentWasPaused = false;
    this.parentPausedByOperation = false;
  }

  preload() {
    if (
      !this.textures.exists(SOURCE_KEY) &&
      !this.textures.exists(CUTOUT_KEY)
    ) {
      this.load.image(SOURCE_KEY, AGENTS_PATH);
    }
  }

  create() {
    super.create();

    this.input.setTopOnly(true);

    this.captureHud();
    this.hideOperationHud();

    this.blocker = this.add
      .rectangle(0, 0, 1, 1, 0x000000, 0.94)
      .setOrigin(0)
      .setInteractive();

    this.root = this.add.container(0, 0);

    this.drawWindow();
    this.drawStreet();
    this.createAgents();
    this.createLabels();

    this.trackInputEvent(
      this.scale,
      'resize',
      this.layoutOverlay,
      this
    );

    this.layoutOverlay();

    this.parentWasPaused =
      this.scene.isPaused(this.parentSceneKey);

    if (
      this.hasScene(this.parentSceneKey) &&
      this.scene.isActive(this.parentSceneKey)
    ) {
      this.parentPausedByOperation = true;
      this.scene.pause(this.parentSceneKey);
    }

    this.events.once('shutdown', () => {
      this.moving = false;

      // The successful-address subclass restores its own parent.
      if (
        this.sys.settings.key === SCENE_KEY &&
        !this.finished
      ) {
        this.restoreOperationHud();
        this.resumeOperationParent();
      }
    });

    this.scene.bringToTop();
    this.startSequence();
  }

  captureHud() {
    for (const key of HUD_KEYS) {
      const hud = this.getRegisteredScene(key);

      if (!hud) continue;

      this.hudSnapshot[key] = {
        visible: this.scene.isVisible(key),
        inputEnabled: hud.input?.enabled
      };
    }
  }

  hideOperationHud() {
    for (const key of HUD_KEYS) {
      const hud = this.getRegisteredScene(key);

      if (!hud) continue;

      this.scene.setVisible(false, key);

      if (hud.input) {
        hud.input.enabled = false;
      }
    }
  }

  restoreOperationHud() {
    for (
      const [key, snapshot]
      of Object.entries(this.hudSnapshot)
    ) {
      const hud = this.getRegisteredScene(key);

      if (!hud) continue;

      this.scene.setVisible(snapshot.visible, key);

      if (
        hud.input &&
        typeof snapshot.inputEnabled === 'boolean'
      ) {
        hud.input.enabled = snapshot.inputEnabled;
      }
    }
  }

  resumeOperationParent() {
    if (
      this.parentPausedByOperation &&
      !this.parentWasPaused &&
      this.hasScene(this.parentSceneKey) &&
      this.scene.isPaused(this.parentSceneKey)
    ) {
      this.scene.resume(this.parentSceneKey);
    }
  }

  layoutOverlay() {
    if (!this.root || !this.blocker) return;

    const { width, height } = this.scale;

    this.blocker.setSize(width, height);

    const scale = Math.min(
      Math.max(1, width - 24) / W,
      Math.max(1, height - 24) / H
    );

    this.root
      .setScale(scale)
      .setPosition(
        (width - W * scale) / 2,
        (height - H * scale) / 2
      );
  }

  rect(x, y, width, height, color, alpha = 1) {
    const object = this.add
      .rectangle(
        x,
        y,
        width,
        height,
        color,
        alpha
      )
      .setOrigin(0);

    this.root.add(object);
    return object;
  }

  label(x, y, text, options = {}) {
    const object = this.add.text(
      x,
      y,
      text,
      {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#f4e3bc',
        ...options
      }
    );

    this.root.add(object);
    return object;
  }

  drawWindow() {
    this.rect(
      8,
      12,
      W - 8,
      H - 12,
      0x000000,
      0.55
    );

    this.rect(0, 0, W, H, 0x171c22)
      .setStrokeStyle(4, 0xa58655);

    this.rect(
      12,
      12,
      W - 24,
      66,
      0x342a20
    );

    this.label(
      32,
      33,
      __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_76ed3309f223fd8c3928"),
      {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#ead1a0'
      }
    );

    this.rect(
      12,
      80,
      W - 24,
      550,
      0x101623
    );
  }

  drawStreet() {
    const graphics = this.add.graphics();
    this.root.add(graphics);

    graphics.fillStyle(0x111a2a);
    graphics.fillRect(16, 84, W - 32, 542);

    graphics.fillStyle(0x352b2b);
    graphics.fillRect(16, 84, 530, 450);

    graphics.fillStyle(0x343941);
    graphics.fillRect(792, 84, 472, 450);

    graphics.fillStyle(0x090f1a);
    graphics.fillRect(546, 84, 246, 450);

    graphics.lineStyle(2, 0x51403a, 0.55);

    for (let y = 104; y < 520; y += 26) {
      graphics.lineBetween(16, y, 546, y);

      const offset =
        Math.floor(y / 26) % 2 ? 0 : 44;

      for (
        let x = 16 + offset;
        x < 546;
        x += 88
      ) {
        graphics.lineBetween(x, y, x, y + 26);
      }
    }

    graphics.lineStyle(2, 0x515861, 0.5);

    for (let y = 104; y < 520; y += 52) {
      graphics.lineBetween(792, y, 1264, y);

      const offset =
        Math.floor(y / 52) % 2 ? 0 : 64;

      for (
        let x = 792 + offset;
        x < 1264;
        x += 128
      ) {
        graphics.lineBetween(x, y, x, y + 52);
      }
    }

    const drawWindow = (x, y, width, height) => {
      graphics.fillStyle(0x17161b);
      graphics.fillRect(
        x - 8,
        y - 8,
        width + 16,
        height + 16
      );

      graphics.fillStyle(0x090f19);
      graphics.fillRect(x, y, width, height);

      graphics.fillStyle(0x49423b);
      graphics.fillRect(
        x + width / 2 - 3,
        y,
        6,
        height
      );

      graphics.fillRect(
        x,
        y + height / 2 - 3,
        width,
        6
      );

      graphics.fillStyle(0x66605b);
      graphics.fillRect(
        x - 12,
        y + height + 6,
        width + 24,
        10
      );
    };

    drawWindow(70, 140, 110, 150);
    drawWindow(330, 140, 110, 150);
    drawWindow(860, 140, 160, 170);

    graphics.fillStyle(0x211b1c);
    graphics.fillRect(1105, 180, 130, 354);

    graphics.lineStyle(5, 0x4a3830);
    graphics.strokeRect(1115, 190, 110, 344);

    graphics.fillStyle(0xb2904a);
    graphics.fillCircle(1204, 365, 5);

    graphics.fillStyle(0x524a43);
    graphics.fillRect(16, 534, 1248, 72);

    graphics.fillStyle(0x292d34);
    graphics.fillRect(16, 606, 1248, 20);

    graphics.lineStyle(3, 0x252730);

    for (let x = 20; x < 1260; x += 155) {
      graphics.lineBetween(x, 536, x - 28, 606);
    }

    graphics.fillStyle(0x161922);
    graphics.fillRect(245, 170, 10, 370);
    graphics.fillRect(230, 534, 40, 9);

    graphics.fillStyle(0xe5a341, 0.045);

    for (
      let radius = 104;
      radius >= 32;
      radius -= 18
    ) {
      graphics.fillCircle(250, 169, radius);
    }

    graphics.fillStyle(0x30291f);
    graphics.fillRect(225, 121, 50, 66);

    graphics.fillStyle(0xffcf72);
    graphics.fillRect(233, 130, 34, 44);

    graphics.fillStyle(0xffe7a3);
    graphics.fillRect(240, 137, 20, 32);

    graphics.fillStyle(0x201f24);
    graphics.fillTriangle(
      216,
      121,
      284,
      121,
      250,
      94
    );

    graphics.fillStyle(0x966b38, 0.7);

    for (const [x, y] of [
      [82, 568],
      [126, 582],
      [388, 554],
      [438, 592],
      [730, 570],
      [1018, 590],
      [1162, 560]
    ]) {
      graphics.fillRect(x, y, 10, 4);
      graphics.fillRect(x + 5, y - 3, 7, 4);
    }

    this.lampGlow = this.add.circle(
      250,
      153,
      45,
      0xffc462,
      0.055
    );

    this.root.add(this.lampGlow);
  }

  buildAgentCutout() {
    if (this.textures.exists(CUTOUT_KEY)) {
      return CUTOUT_KEY;
    }

    if (!this.textures.exists(SOURCE_KEY)) {
      return null;
    }

    const source = this.textures
      .get(SOURCE_KEY)
      .getSourceImage();

    const canvas = document.createElement('canvas');

    canvas.width = source.width;
    canvas.height = source.height;

    const context = canvas.getContext('2d', {
      willReadFrequently: true
    });

    if (!context) return null;

    context.drawImage(source, 0, 0);

    const image = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const pixels = image.data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index =
          (y * canvas.width + x) * 4;

        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];

        const minimum = Math.min(r, g, b);
        const maximum = Math.max(r, g, b);

        if (
          minimum >= 225 &&
          maximum - minimum <= 24
        ) {
          pixels[index + 3] = 0;
          continue;
        }

        if (pixels[index + 3] > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    context.putImageData(image, 0, 0);

    const padding = 4;
    const left = Math.max(0, minX - padding);
    const top = Math.max(0, minY - padding);

    const width = Math.min(
      canvas.width - left,
      maxX - minX + 1 + padding * 2
    );

    const height = Math.min(
      canvas.height - top,
      maxY - minY + 1 + padding * 2
    );

    const texture = this.textures.createCanvas(
      CUTOUT_KEY,
      width,
      height
    );

    if (!texture) return null;

    texture.context.drawImage(
      canvas,
      left,
      top,
      width,
      height,
      0,
      0,
      width,
      height
    );

    texture.refresh();

    return CUTOUT_KEY;
  }

  createAgents() {
    let key = null;

    try {
      key = this.buildAgentCutout();
    } catch (error) {
      console.error(
        '[FailedAlibiArrest] Could not prepare agent image:',
        error
      );
    }

    this.agents = this.add.container(-240, 594);
    this.root.add(this.agents);

    if (!key) {
      this.missingArtwork = true;
      return;
    }

    this.agentsVisual = this.add
      .image(0, 0, key)
      .setOrigin(0.5, 1);

    this.agentsBaseScale =
      275 / this.agentsVisual.height;

    this.agentsVisual.setScale(
      this.agentsBaseScale
    );

    this.agents.add(this.agentsVisual);
  }

  createLabels() {
    this.statusText = this.label(
      W / 2,
      670,
      __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_930ac80c51318b0a4a84"),
      {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#d9c08d',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.caption = this.label(
      W / 2,
      724,
      __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_8757184cfa09b54f1df5"),
      {
        fontSize: '27px',
        align: 'center',
        wordWrap: {
          width: W - 100
        }
      }
    ).setOrigin(0.5);

    this.retryButton = this.label(
      W / 2,
      772,
      'RETRY',
      {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#ffd68e',
        backgroundColor: '#4b3025',
        padding: {
          x: 14,
          y: 10
        }
      }
    )
      .setOrigin(0.5)
      .setVisible(false)
      .setInteractive({
        useHandCursor: true
      });

    this.retryButton.on('pointerdown', () => {
      void this.finishToGameOver();
    });

    if (this.missingArtwork) {
      this.label(
        W / 2,
        360,
        __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_24915589c207610a3247") +
        __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_a2306a577db31a466efe"),
        {
          fontSize: '26px',
          align: 'center',
          color: '#d7c5a4'
        }
      ).setOrigin(0.5);
    }
  }

  startSequence() {
    this.phase = 'outbound';
    this.moving = true;
    this.motion.x = -240;

    this.agentsVisual?.setFlipX(true);

    this.createTrackedTween({
      targets: this.motion,
      x: W + 240,
      duration: 2300,
      ease: 'Linear',

      onComplete: () => {
        if (this._cleanupDone) return;

        this.moving = false;

        this.statusText.setText(
          __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_08150401fb1b45f890b2")
        );

        this.caption.setText(
          __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_bfd380c53085c905538d")
        );

        this.time.delayedCall(
          1100,
          () => this.startReturn()
        );
      }
    });
  }

  startReturn() {
    if (this._cleanupDone || this.finished) return;

    this.phase = 'return';
    this.moving = true;
    this.motion.x = W + 240;

    this.agentsVisual?.setFlipX(false);

    this.statusText.setText(
      __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_706d465563db29bcf542")
    );

    this.caption.setText(
      __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_d001bdf67e9734411d94")
    );

    this.createTrackedTween({
      targets: this.motion,
      x: -240,
      duration: 3500,
      ease: 'Linear',

      onComplete: () => {
        if (this._cleanupDone) return;

        this.moving = false;

        this.time.delayedCall(1300, () => {
          void this.finishToGameOver();
        });
      }
    });
  }

  update(time, delta) {
    this.hideOperationHud();
    this.scene.bringToTop();

    this.clock += Math.min(delta, 100);

    if (this.lampGlow) {
      this.lampGlow.alpha =
        0.05 +
        Math.sin(this.clock / 160) * 0.008;
    }

    if (!this.agents) return;

    this.agents.x = this.motion.x;

    if (
      !this.moving ||
      !this.agentsVisual
    ) {
      return;
    }

    const outbound = this.phase === 'outbound';

    const cycle =
      this.clock / (outbound ? 60 : 130);

    const bounce =
      Math.abs(Math.sin(cycle)) *
      (outbound ? 13 : 3);

    this.agents.y = 594 - bounce;

    this.agentsVisual.setRotation(
      outbound
        ? -0.055 + Math.sin(cycle) * 0.018
        : 0.025 + Math.sin(cycle) * 0.008
    );

    this.agentsVisual.setScale(
      this.agentsBaseScale *
      (
        1 +
        Math.sin(cycle * 2) *
        (outbound ? 0.012 : 0.004)
      ),
      this.agentsBaseScale *
      (
        1 -
        Math.sin(cycle * 2) *
        (outbound ? 0.012 : 0.004)
      )
    );
  }

  async finishToGameOver() {
    if (
      this.finishing ||
      this.finished ||
      this._cleanupDone
    ) {
      return;
    }

    this.finishing = true;
    this.retryButton.setVisible(false);

    try {
      if (this.game.sceneLoader) {
        await this.game.sceneLoader.ensure(
          'GameOverScene'
        );
      }

      if (this._cleanupDone) return;

      gameState.caseResolved = false;
      gameState.caseFailed = true;
      gameState.isGameActive = false;
      gameState.gameOverReason = FAILURE_MESSAGE;

      saveGameState();

      const opened = await this.goto(
        'GameOverScene',
        {
          title: __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_276c1d807d02874cf29b"),
          reasonCode: 'failed_alibi_arrest',
          caseId: this.caseId,
          suspectId: this.suspectId,
          message: FAILURE_MESSAGE
        }
      );

      if (!opened) {
        throw new Error(
          'GameOverScene could not be opened.'
        );
      }

      this.finished = true;

      if (this.hasScene(this.parentSceneKey)) {
        this.scene.stop(this.parentSceneKey);
      }
    } catch (error) {
      console.error(
        '[FailedAlibiArrest] Could not finish operation:',
        error
      );

      if (this._cleanupDone) return;

      this.finishing = false;

      this.caption.setText(
        __dialogueText("scenes/FailedAlibiArrestOverlayScene.js", "t_3db9ca22fc3e3d1cea91")
      );

      this.retryButton.setVisible(true);
    }
  }
}

export async function launchFailedAlibiArrest(
  scene,
  data = {}
) {
  if (
    !scene ||
    scene._cleanupDone ||
    !scene.sys.isActive()
  ) {
    return false;
  }

  if (scene.isSceneRunning(SCENE_KEY)) {
    scene.scene.bringToTop(SCENE_KEY);
    return true;
  }

  try {
    scene.closeAllUIPanels?.();
    scene.getPlayerHudScene()?.closeAllUIPanels?.();

    if (!scene.hasScene(SCENE_KEY)) {
      scene.scene.add(
        SCENE_KEY,
        FailedAlibiArrestOverlayScene,
        false
      );
    }

    // This overlay loads its artwork in preload().
    // It does not need SceneLoader's asset preparation.
    scene.scene.launch(
      SCENE_KEY,
      {
        parentSceneKey: scene.sys.settings.key,
        suspectId: data.suspectId,
        caseId:
          data.caseId ??
          gameState.currentCaseId ??
          gameState.currentMission?.id ??
          null
      }
    );

    return true;
  } catch (error) {
    console.error(
      '[FailedAlibiArrest] Could not launch operation:',
      error
    );

    return false;
  }
}