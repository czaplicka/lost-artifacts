import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';

const SCENE_KEY = 'FailedAlibiArrestOverlayScene';
const SOURCE_KEY = 'failed-alibi-arrest-source', CUTOUT_KEY = 'failed-alibi-arrest-cutout';
const AGENTS_PATH = 'assets/cutscenes/arrest-agents.jpg';
const HUD_KEYS = ['PlayerHudScene', 'NewsHud', 'UIScene'];
const text = key => __dialogueText('scenes/FailedAlibiArrestOverlayScene.js', key);
const FAILURE_MESSAGE = text('t_bafcd6842a1faeab3265') + text('t_04a9e2706981290d8c9e') + text('t_93a790ecf7e8ecdac267');
const W = 1280, H = 800;
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
function activeCaseId() {
  return [gameState.currentCaseId, gameState.currentMission?.id].find(value =>
    (typeof value === 'string' && value.trim()) || (typeof value === 'number' && Number.isFinite(value))) ?? null;
}

export class FailedAlibiArrestOverlayScene extends BaseScene {
  constructor() { super({ key: SCENE_KEY }); }
  init(data = {}) {
    this.parentSceneKey = data.parentSceneKey || 'CrimeCityScene';
    this.suspectId = data.suspectId ?? null;
    this.caseId = data.caseId ?? gameState.currentCaseId ?? null;
    this.root = null; this.blocker = null; this.agents = null; this.agentsVisual = null;
    this.caption = null; this.statusText = null; this.retryButton = null; this.lampGlow = null;
    this.phase = 'outbound'; this.moving = false; this.finishing = false; this.finished = false;
    this.motion = { x: -240 }; this.clock = 0; this.agentsBaseScale = 1; this.missingArtwork = false;
    this.hudSnapshot = {}; this.parentWasPaused = false; this.parentPausedByOperation = false;
    this._failedArrestRun = Symbol('failed-alibi-operation');
    this._operationCaseId = activeCaseId(); this._operationCampaignId = gameState._createdAt;
    this._operationParent = null; this._operationParentRun = undefined; this._parentStopped = false;
    this._failureCommitted = false; this._failureRecoveryRequired = false; this._terminalTransition = false;
  }
  isCurrentFailureRun(run) { return run != null && this._failedArrestRun === run && !this._cleanupDone; }
  isSameFailureCase() {
    return sameId(activeCaseId(), this._operationCaseId) && gameState._createdAt === this._operationCampaignId &&
      (this.caseId == null || sameId(this.caseId, activeCaseId()) || sameId(this.caseId, gameState.currentMission?.id));
  }
  preload() {
    if (!this.textures.exists(SOURCE_KEY) && !this.textures.exists(CUTOUT_KEY)) this.load.image(SOURCE_KEY, AGENTS_PATH);
  }
  create() {
    super.create(); this.input.setTopOnly(true); this.captureHud(); this.hideOperationHud();
    this.blocker = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.94).setOrigin(0).setInteractive();
    this.root = this.add.container(0, 0);
    this.drawWindow(); this.drawStreet(); this.createAgents(); this.createLabels();
    this.trackInputEvent(this.scale, 'resize', this.layoutOverlay, this); this.layoutOverlay();
    this._operationParent = this.getRegisteredScene(this.parentSceneKey) || null;
    this._operationParentRun = this._operationParent?._runToken;
    this.parentWasPaused = this.scene.isPaused(this.parentSceneKey);
    if (this.hasScene(this.parentSceneKey) && this.scene.isActive(this.parentSceneKey)) {
      this.parentPausedByOperation = true; this.scene.pause(this.parentSceneKey);
    }
    const run = this._failedArrestRun;
    this.events.once('shutdown', () => {
      if (this._failedArrestRun !== run) return;
      this._failedArrestRun = null; this.moving = false;
      // The successful-address subclass uses its own create/cleanup path.
      if (this.sys.settings.key !== SCENE_KEY) return;
      if (this._terminalTransition || this.finished || this._failureCommitted) {
        this.stopOperationParent();
      } else if (this.isSameFailureCase()) {
        this.restoreOperationHud(); this.resumeOperationParent();
      }
    });
    this.scene.bringToTop(); this.startSequence();
  }
  captureHud() {
    for (const key of HUD_KEYS) {
      const hud = this.getRegisteredScene(key); if (!hud) continue;
      this.hudSnapshot[key] = { visible: this.scene.isVisible(key), inputEnabled: hud.input?.enabled };
    }
  }
  hideOperationHud() {
    for (const key of HUD_KEYS) {
      const hud = this.getRegisteredScene(key); if (!hud) continue;
      this.scene.setVisible(false, key); if (hud.input) hud.input.enabled = false;
    }
  }
  restoreOperationHud() {
    for (const [key, snapshot] of Object.entries(this.hudSnapshot)) {
      const hud = this.getRegisteredScene(key); if (!hud) continue;
      this.scene.setVisible(snapshot.visible, key);
      if (hud.input && typeof snapshot.inputEnabled === 'boolean') hud.input.enabled = snapshot.inputEnabled;
    }
  }
  operationParentMatches() {
    const parent = this.getRegisteredScene(this.parentSceneKey);
    return Boolean(parent && (!this._operationParent || parent === this._operationParent) &&
      (this._operationParentRun === undefined || parent._runToken === this._operationParentRun));
  }
  stopOperationParent() {
    if (this._parentStopped || !this.isSameFailureCase() || !this.operationParentMatches()) return;
    this._parentStopped = true;
    try { if (this.hasScene(this.parentSceneKey)) this.scene.stop(this.parentSceneKey); }
    catch (error) { this._parentStopped = false; console.error('[FailedAlibiArrest] Parent cleanup failed:', error); }
  }
  resumeOperationParent() {
    if (this.parentPausedByOperation && !this.parentWasPaused && this.hasScene(this.parentSceneKey) &&
      this.operationParentMatches() && this.scene.isPaused(this.parentSceneKey)) this.scene.resume(this.parentSceneKey);
  }
  layoutOverlay() {
    if (!this.root || !this.blocker) return;
    const { width, height } = this.scale; this.blocker.setSize(width, height);
    const scale = Math.min(Math.max(1, width - 24) / W, Math.max(1, height - 24) / H);
    this.root.setScale(scale).setPosition((width - W * scale) / 2, (height - H * scale) / 2);
  }
  rect(x, y, width, height, color, alpha = 1) {
    const object = this.add.rectangle(x, y, width, height, color, alpha).setOrigin(0); this.root.add(object); return object;
  }
  label(x, y, value, options = {}) {
    const object = this.add.text(x, y, value, { fontFamily: 'SpecialElite', fontSize: '28px', color: '#f4e3bc', ...options });
    this.root.add(object); return object;
  }
  drawWindow() {
    this.rect(8, 12, W - 8, H - 12, 0x000000, 0.55);
    this.rect(0, 0, W, H, 0x171c22).setStrokeStyle(4, 0xa58655);
    this.rect(12, 12, W - 24, 66, 0x342a20);
    this.label(32, 33, text('t_76ed3309f223fd8c3928'), { fontFamily: 'PressStart2P', fontSize: '16px', color: '#ead1a0' });
    this.rect(12, 80, W - 24, 550, 0x101623);
  }
  drawStreet() {
    const g = this.add.graphics(); this.root.add(g);
    g.fillStyle(0x111a2a); g.fillRect(16, 84, W - 32, 542);
    g.fillStyle(0x352b2b); g.fillRect(16, 84, 530, 450);
    g.fillStyle(0x343941); g.fillRect(792, 84, 472, 450);
    g.fillStyle(0x090f1a); g.fillRect(546, 84, 246, 450);
    g.lineStyle(2, 0x51403a, 0.55);
    for (let y = 104; y < 520; y += 26) {
      g.lineBetween(16, y, 546, y); const offset = Math.floor(y / 26) % 2 ? 0 : 44;
      for (let x = 16 + offset; x < 546; x += 88) g.lineBetween(x, y, x, y + 26);
    }
    g.lineStyle(2, 0x515861, 0.5);
    for (let y = 104; y < 520; y += 52) {
      g.lineBetween(792, y, 1264, y); const offset = Math.floor(y / 52) % 2 ? 0 : 64;
      for (let x = 792 + offset; x < 1264; x += 128) g.lineBetween(x, y, x, y + 52);
    }
    const drawWindow = (x, y, width, height) => {
      g.fillStyle(0x17161b); g.fillRect(x - 8, y - 8, width + 16, height + 16);
      g.fillStyle(0x090f19); g.fillRect(x, y, width, height);
      g.fillStyle(0x49423b); g.fillRect(x + width / 2 - 3, y, 6, height); g.fillRect(x, y + height / 2 - 3, width, 6);
      g.fillStyle(0x66605b); g.fillRect(x - 12, y + height + 6, width + 24, 10);
    };
    drawWindow(70, 140, 110, 150); drawWindow(330, 140, 110, 150); drawWindow(860, 140, 160, 170);
    g.fillStyle(0x211b1c); g.fillRect(1105, 180, 130, 354);
    g.lineStyle(5, 0x4a3830); g.strokeRect(1115, 190, 110, 344);
    g.fillStyle(0xb2904a); g.fillCircle(1204, 365, 5);
    g.fillStyle(0x524a43); g.fillRect(16, 534, 1248, 72);
    g.fillStyle(0x292d34); g.fillRect(16, 606, 1248, 20);
    g.lineStyle(3, 0x252730);
    for (let x = 20; x < 1260; x += 155) g.lineBetween(x, 536, x - 28, 606);
    g.fillStyle(0x161922); g.fillRect(245, 170, 10, 370); g.fillRect(230, 534, 40, 9);
    g.fillStyle(0xe5a341, 0.045);
    for (let radius = 104; radius >= 32; radius -= 18) g.fillCircle(250, 169, radius);
    g.fillStyle(0x30291f); g.fillRect(225, 121, 50, 66);
    g.fillStyle(0xffcf72); g.fillRect(233, 130, 34, 44);
    g.fillStyle(0xffe7a3); g.fillRect(240, 137, 20, 32);
    g.fillStyle(0x201f24); g.fillTriangle(216, 121, 284, 121, 250, 94);
    g.fillStyle(0x966b38, 0.7);
    for (const [x, y] of [[82, 568], [126, 582], [388, 554], [438, 592], [730, 570], [1018, 590], [1162, 560]]) {
      g.fillRect(x, y, 10, 4); g.fillRect(x + 5, y - 3, 7, 4);
    }
    this.lampGlow = this.add.circle(250, 153, 45, 0xffc462, 0.055); this.root.add(this.lampGlow);
  }
  buildAgentCutout() {
    if (this.textures.exists(CUTOUT_KEY)) return CUTOUT_KEY;
    if (!this.textures.exists(SOURCE_KEY)) return null;
    const source = this.textures.get(SOURCE_KEY).getSourceImage(), canvas = document.createElement('canvas');
    canvas.width = source.width; canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return null;
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height), pixels = image.data;
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4, r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
      if (Math.min(r, g, b) >= 225 && Math.max(r, g, b) - Math.min(r, g, b) <= 24) { pixels[index + 3] = 0; continue; }
      if (pixels[index + 3] > 0) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    }
    if (maxX < minX || maxY < minY) return null;
    context.putImageData(image, 0, 0);
    const padding = 4, left = Math.max(0, minX - padding), top = Math.max(0, minY - padding);
    const width = Math.min(canvas.width - left, maxX - minX + 1 + padding * 2);
    const height = Math.min(canvas.height - top, maxY - minY + 1 + padding * 2);
    const texture = this.textures.createCanvas(CUTOUT_KEY, width, height); if (!texture) return null;
    texture.context.drawImage(canvas, left, top, width, height, 0, 0, width, height); texture.refresh(); return CUTOUT_KEY;
  }
  createAgents() {
    let key = null;
    try { key = this.buildAgentCutout(); } catch (error) { console.error('[FailedAlibiArrest] Could not prepare agent image:', error); }
    this.agents = this.add.container(-240, 594); this.root.add(this.agents);
    if (!key) { this.missingArtwork = true; return; }
    this.agentsVisual = this.add.image(0, 0, key).setOrigin(0.5, 1);
    this.agentsBaseScale = 275 / this.agentsVisual.height; this.agentsVisual.setScale(this.agentsBaseScale); this.agents.add(this.agentsVisual);
  }
  createLabels() {
    this.statusText = this.label(W / 2, 670, 'ARREST TEAM DISPATCHED', { fontFamily: 'PressStart2P', fontSize: '18px', color: '#d9c08d', align: 'center' }).setOrigin(0.5);
    this.caption = this.label(W / 2, 724, 'Two agents. One address. What could possibly go wrong?', { fontSize: '27px', align: 'center', wordWrap: { width: W - 100 } }).setOrigin(0.5);
    this.retryButton = this.label(W / 2, 772, 'RETRY', { fontFamily: 'PressStart2P', fontSize: '12px', color: '#ffd68e', backgroundColor: '#4b3025', padding: { x: 14, y: 10 } }).setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
    const run = this._failedArrestRun;
    this.retryButton.on('pointerdown', () => { if (this.isCurrentFailureRun(run)) void this.finishToGameOver(); });
    if (this.missingArtwork) this.label(W / 2, 360, 'Agent artwork could not be loaded.\nThe operation will still finish.', { fontSize: '26px', align: 'center', color: '#d7c5a4' }).setOrigin(0.5);
  }
  startSequence() {
    const run = this._failedArrestRun;
    this.phase = 'outbound'; this.moving = true; this.motion.x = -240; this.agentsVisual?.setFlipX(true);
    this.createTrackedTween({ targets: this.motion, x: W + 240, duration: 2300, ease: 'Linear', onComplete: () => {
      if (!this.isCurrentFailureRun(run)) return;
      this.moving = false; this.statusText.setText(text('t_08150401fb1b45f890b2')); this.caption.setText(text('t_bfd380c53085c905538d'));
      this.time.delayedCall(1100, () => { if (this.isCurrentFailureRun(run)) this.startReturn(); });
    } });
  }
  startReturn() {
    const run = this._failedArrestRun;
    if (!this.isCurrentFailureRun(run) || this.finished) return;
    this.phase = 'return'; this.moving = true; this.motion.x = W + 240; this.agentsVisual?.setFlipX(false);
    this.statusText.setText(text('t_706d465563db29bcf542')); this.caption.setText(text('t_d001bdf67e9734411d94'));
    this.createTrackedTween({ targets: this.motion, x: -240, duration: 3500, ease: 'Linear', onComplete: () => {
      if (!this.isCurrentFailureRun(run)) return;
      this.moving = false;
      this.time.delayedCall(1300, () => { if (this.isCurrentFailureRun(run)) void this.finishToGameOver(); });
    } });
  }
  update(time, delta) {
    this.hideOperationHud(); this.scene.bringToTop(); this.clock += Math.min(delta, 100);
    if (this.lampGlow) this.lampGlow.alpha = 0.05 + Math.sin(this.clock / 160) * 0.008;
    if (!this.agents) return; this.agents.x = this.motion.x;
    if (!this.moving || !this.agentsVisual) return;
    const outbound = this.phase === 'outbound', cycle = this.clock / (outbound ? 60 : 130);
    this.agents.y = 594 - Math.abs(Math.sin(cycle)) * (outbound ? 13 : 3);
    this.agentsVisual.setRotation(outbound ? -0.055 + Math.sin(cycle) * 0.018 : 0.025 + Math.sin(cycle) * 0.008);
    this.agentsVisual.setScale(this.agentsBaseScale * (1 + Math.sin(cycle * 2) * (outbound ? 0.012 : 0.004)), this.agentsBaseScale * (1 - Math.sin(cycle * 2) * (outbound ? 0.012 : 0.004)));
  }
  commitFailure() {
    if (this._failureCommitted) return true;
    const fields = ['caseResolved', 'caseFailed', 'isGameActive', 'gameOverReason'];
    const previous = Object.fromEntries(fields.map(key => [key, gameState[key]]));
    try {
      Object.assign(gameState, { caseResolved: false, caseFailed: true, isGameActive: false, gameOverReason: FAILURE_MESSAGE });
      if (saveGameState() !== true) throw new Error('The failed operation could not be saved.');
      this._failureCommitted = true; return true;
    } catch (error) {
      if (!this.isSameFailureCase()) throw error;
      for (const key of fields) {
        try { gameState[key] = previous[key]; }
        catch (rollbackError) { this._failureRecoveryRequired = true; console.error('[FailedAlibiArrest] Recovery failed:', rollbackError); }
      }
      throw error;
    }
  }
  async finishToGameOver() {
    const run = this._failedArrestRun;
    if (this.finishing || this.finished || !this.isCurrentFailureRun(run)) return;
    this.finishing = true; this.retryButton?.setVisible(false);
    try {
      if (this._failureRecoveryRequired) throw new Error('Recovery was incomplete. Reload a known-good save.');
      if (this.game.sceneLoader) await this.game.sceneLoader.ensure('GameOverScene');
      if (!this.isCurrentFailureRun(run)) return;
      if (!this.isSameFailureCase()) throw new Error('The active case changed. This operation was not applied to the new case.');
      this.commitFailure();
      if (!this.isCurrentFailureRun(run)) return;
      if (!this.isSameFailureCase()) throw new Error('The active case changed during saving.');
      this._terminalTransition = true;
      const opened = await this.goto('GameOverScene', { title: text('t_276c1d807d02874cf29b'), reasonCode: 'failed_alibi_arrest', caseId: this.caseId, suspectId: this.suspectId, message: FAILURE_MESSAGE });
      if (!this.isCurrentFailureRun(run)) return;
      if (!opened) throw new Error('GameOverScene could not be opened.');
      this.finished = true; this.stopOperationParent();
    } catch (error) {
      console.error('[FailedAlibiArrest] Could not finish operation:', error);
      if (!this.isCurrentFailureRun(run)) return;
      this._terminalTransition = false; this.finishing = false;
      this.caption?.setText(this._failureRecoveryRequired ? 'Recovery was incomplete. Reload a known-good save.' : text('t_3db9ca22fc3e3d1cea91'));
      this.retryButton?.setVisible(true);
    }
  }
}

export async function launchFailedAlibiArrest(scene, data = {}) {
  if (!scene || scene._cleanupDone || !scene.sys.isActive()) return false;
  if (scene.isSceneRunning(SCENE_KEY)) { scene.scene.bringToTop(SCENE_KEY); return true; }
  try {
    scene.closeAllUIPanels?.(); scene.getPlayerHudScene()?.closeAllUIPanels?.();
    if (!scene.hasScene(SCENE_KEY)) scene.scene.add(SCENE_KEY, FailedAlibiArrestOverlayScene, false);
    // Artwork belongs to this overlay's preload, not SceneLoader asset preparation.
    scene.scene.launch(SCENE_KEY, { parentSceneKey: scene.sys.settings.key, suspectId: data.suspectId,
      caseId: data.caseId ?? gameState.currentCaseId ?? gameState.currentMission?.id ?? null });
    return true;
  } catch (error) { console.error('[FailedAlibiArrest] Could not launch operation:', error); return false; }
}
