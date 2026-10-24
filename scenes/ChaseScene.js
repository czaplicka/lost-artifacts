import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { CHASE_CONFIG as C } from '../config/chaseConfig.js';
import { CHASE_EVENTS } from '../config/chaseEvents.js';
import { makePlan, resolveMove, successChance, finalChance } from '../systems/chaseLogic.js';

const GOOD = ['You gain ground. The pigeons file a formal complaint.', 'A clean run. Suspiciously professional.', 'You close the gap. Your shoes demand a raise.', 'Good route. Terrible day to be a fugitive.'];
const BAD = ['The chair wins this round.', 'A promising shortcut. An embarrassing result.', 'You lose ground. The paperwork gains momentum.', 'Your dignity takes a detour.'];

export class ChaseScene extends BaseScene {
  constructor() { super({ key: 'ChaseScene' }); }
  init(data = {}) {
    this.sourceKey = data.sourceKey || 'ArrestSelectionScene';
    this.caseId = data.caseId;
    this.suspectId = data.suspectId;
    this.difficulty = gameState.difficulty || 'field';
    this.distance = C.startDistance;
    this.round = 0;
    this.phase = 'intro';
    this.leaving = false;
    this.remaining = C.decisionMs;
    // Stable rolls within a case, without storing live Phaser objects in gameState.
    const key = `mark-agency:chase-seed:${String(this.caseId)}:${String(this.suspectId)}`;
    let seed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
    try { const saved = sessionStorage.getItem(key); if (saved !== null) seed = Number(saved) >>> 0; else sessionStorage.setItem(key, String(seed)); } catch {}
    this.plan = makePlan(CHASE_EVENTS, seed);
  }
  create() {
    super.create();
    this.scene.bringToTop();
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const scene = this.getRegisteredScene(key);
      scene?.closeAllUIPanels?.();
      scene?.hideHud?.();
      if (scene) this.scene.setVisible(false, key);
    }
    this.art = this.add.container();
    this.drawPlaceholder('street');
    this.add.rectangle(960, 125, 1800, 180, 0x21160f, 0.97).setStrokeStyle(3, 0xc7ad73);
    this.add.text(960, 75, 'HOT PURSUIT', this.style(30, true)).setOrigin(0.5);
    this.distanceText = this.add.text(110, 145, '', this.style(22, true));
    this.roundText = this.add.text(1810, 145, '', this.style(18, true)).setOrigin(1, 0);
    this.add.rectangle(960, 652, 1760, 170, 0x21160f, 0.97).setStrokeStyle(3, 0xc7ad73);
    this.description = this.add.text(960, 650, '', { ...this.style(32), align: 'center', wordWrap: { width: 1620 }, lineSpacing: 8 }).setOrigin(0.5);
    this.timerBg = this.add.rectangle(80, 758, 1760, 14, 0x45382a).setOrigin(0, 0.5);
    this.timerBar = this.add.rectangle(80, 758, 1760, 14, 0xd8ad58).setOrigin(0, 0.5);
    this.timerText = this.add.text(960, 797, '', this.style(18, true)).setOrigin(0.5);
    this.buttons = [this.makeButton(500, 910, 0), this.makeButton(1420, 910, 1)];
    this.add.text(960, 1040, 'CLICK A ROUTE OR USE LEFT / RIGHT ARROW KEYS', this.style(14, true)).setOrigin(0.5);
    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard, 'keydown-LEFT', e => { if (!e.repeat) this.press(0); });
      this.trackInputEvent(this.input.keyboard, 'keydown-RIGHT', e => { if (!e.repeat) this.press(1); });
      this.trackInputEvent(this.input.keyboard, 'keydown-ENTER', e => { if (!e.repeat && this.phase !== 'choice') this.press(0); });
    }
    this.description.setText('The suspect spots you and bolts.\nFifty metres ahead. One very expensive pair of shoes.');
    this.buttons[0].label.setText('START PURSUIT');
    this.buttons[1].root.setVisible(false);
    this.refresh();
  }
  style(size, pixel = false) { return { fontFamily: pixel ? 'PressStart2P' : 'SpecialElite', fontSize: `${size}px`, color: '#f7e6bc' }; }
  makeButton(x, y, index) {
    const root = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 850, 180, 0x503722).setStrokeStyle(3, 0xc7ad73).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -20, '', { ...this.style(29), align: 'center', wordWrap: { width: 780 } }).setOrigin(0.5);
    const hint = this.add.text(0, 54, '', { ...this.style(21), color: '#dfbd7b', align: 'center', wordWrap: { width: 790 } }).setOrigin(0.5);
    root.add([bg, label, hint]);
    bg.on('pointerdown', () => this.press(index));
    bg.on('pointerover', () => bg.setFillStyle(0x74502e));
    bg.on('pointerout', () => bg.setFillStyle(0x503722));
    return { root, bg, label, hint };
  }
  drawPlaceholder(kind) {
    this.art.removeAll(true);
    const colors = { street: 0x354047, courtyard: 0x414b3b, stairs: 0x4b4146, square: 0x4d493b };
    this.art.add(this.add.rectangle(960, 540, 1920, 1080, colors[kind] || colors.street));
    const imageKey = `chase_${kind}`;
    if (this.textures.exists(imageKey)) {
      this.art.add(this.add.image(960, 390, imageKey).setDisplaySize(1760, 340));
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x252b2d).fillRect(80, 230, 550, 320).fillRect(1290, 230, 550, 320);
      g.fillStyle(0x796c56).fillTriangle(640, 560, 940, 290, 860, 560).fillTriangle(1060, 560, 980, 290, 1280, 560);
      g.lineStyle(8, 0xd3bd85).lineBetween(810, 460, 695, 390).lineBetween(1110, 460, 1225, 390);
      g.lineBetween(695, 390, 705, 430).lineBetween(695, 390, 735, 385);
      g.lineBetween(1225, 390, 1185, 385).lineBetween(1225, 390, 1215, 430);
      if (kind === 'stairs') for (let i = 0; i < 6; i++) g.lineBetween(690, 480 - i * 22, 870, 480 - i * 22);
      this.art.add(g);
      this.art.add(this.add.text(960, 260, kind.toUpperCase(), this.style(18, true)).setOrigin(0.5));
    }
    this.runner = this.add.container(960, 420);
    this.runner.add([this.add.circle(0, -35, 13, 0xe0c79b), this.add.rectangle(0, 0, 22, 44, 0x17191c), this.add.rectangle(-11, 34, 10, 30, 0x17191c).setAngle(20), this.add.rectangle(11, 34, 10, 30, 0x17191c).setAngle(-20)]);
    this.art.add(this.runner);
  }
  refresh() {
    this.distanceText.setText(`SUSPECT: ${this.distance} m`);
    this.roundText.setText(`STAGE ${Math.min(this.round + 1, C.maxRounds)} / ${C.maxRounds}`);
    this.timerBar.width = 1760 * Math.max(0, this.remaining / C.decisionMs);
    this.timerText.setText(this.phase === 'choice' ? `${Math.ceil(this.remaining / 1000)} SECONDS` : '');
    this.runner?.setScale(0.55 + (1 - this.distance / C.escapeDistance) * 0.8);
  }
  press(index) {
    if (this.leaving || this.phase === 'transition') return;
    if (this.phase === 'intro') { if (index === 0) this.nextRound(); return; }
    if (this.phase === 'result') { if (index === 0) this.afterResult(); return; }
    if (this.phase === 'caught') { if (index === 0) this.finish(true); return; }
    if (this.phase === 'escaped') { if (index === 0) this.finish(false); return; }
    if (this.phase === 'final') { if (index === 0) this.resolveFinal(); return; }
    if (this.phase === 'choice') this.resolve(index);
  }
  nextRound() {
    if (this.distance <= 0) return this.end(true);
    if (this.distance >= C.escapeDistance) return this.end(false);
    if (this.round >= C.maxRounds) {
      this.phase = 'final';
      this.description.setText('One last chance to cut off the escape.\nThe closer you are, the better your chance.');
      this.singleButton('MAKE THE FINAL INTERCEPTION', `${Math.round(finalChance(this.distance, this.difficulty) * 100)}% chance`);
      this.refresh();
      return;
    }
    this.current = this.plan.rounds[this.round];
    this.options = this.current.flip ? [...this.current.event.options].reverse() : this.current.event.options;
    this.drawPlaceholder(this.current.event.background);
    this.description.setText(this.current.event.text);
    this.phase = 'choice';
    this.remaining = C.decisionMs;
    this.buttons.forEach((button, i) => {
      button.root.setVisible(true);
      const option = this.options[i];
      const move = C.moves[option.type];
      button.label.setText(`${i === 0 ? '< LEFT' : 'RIGHT >'}\n${option.text}`);
      button.hint.setText(`${Math.round(successChance(this.difficulty, option) * 100)}% | Gain ${move.gain} m / Lose ${move.loss} m`);
    });
    this.refresh();
  }
  update(time, delta) {
    if (this.phase !== 'choice' || this.leaving) return;
    this.remaining = Math.max(0, this.remaining - delta);
    this.refresh();
    if (this.remaining === 0) this.resolve(null);
  }
  resolve(index) {
    if (this.phase !== 'choice') return;
    this.phase = 'transition';
    const before = this.distance;
    const option = index === null ? null : this.options[index];
    const result = resolveMove(before, this.difficulty, option, index === null ? 1 : this.current.rolls[index]);
    this.distance = result.distance;
    this.round++;
    const line = index === null ? 'You consider your options. The suspect does not.' : (result.success ? GOOD : BAD)[(this.round - 1) % 4];
    this.description.setText(`${line}\nDISTANCE: ${before} m -> ${this.distance} m`);
    this.phase = 'result';
    this.singleButton('CONTINUE');
    this.refresh();
  }
  singleButton(label, hint = '') {
    this.buttons[0].root.setVisible(true);
    this.buttons[0].label.setText(label);
    this.buttons[0].hint.setText(hint);
    this.buttons[1].root.setVisible(false);
  }
  afterResult() { this.nextRound(); }
  resolveFinal() { this.end(this.plan.finalRoll < finalChance(this.distance, this.difficulty)); }
  end(caught) {
    this.phase = caught ? 'caught' : 'escaped';
    if (caught) this.distance = 0;
    this.description.setText(caught ? 'Suspect detained. Your lungs request a transfer.\nNow the bureau must review the arrest.' : 'The suspect disappears into the city.\nThe trail ends here. The paperwork does not.');
    this.singleButton(caught ? 'REVIEW THE ARREST' : 'GAME OVER');
    this.refresh();
  }
  async finish(caught) {
    if (this.leaving) return;
    this.leaving = true;
    const source = this.getRegisteredScene(this.sourceKey);
    if (caught && typeof source?.completeChase === 'function') {
      source.completeChase();
      this.scene.stop();
      return;
    }
    if (caught) {
      this.leaving = false;
      this.description.setText('Arrest screen unavailable. Please reload your saved game.');
      return;
    }
    const opened = await this.goto('GameOverScene', {
      title: 'THIEF ESCAPED', reasonCode: 'chase_escape',
      caseId: this.caseId, suspectId: this.suspectId,
      message: 'You lost the suspect during the pursuit. The thief escaped with the artefact. Your shoes have declined to comment.'
    });
    if (opened) {
      gameState.finalArrestSuspectId = this.suspectId;
      gameState.finalArrestResult = 'FAILURE';
      saveGameState();
      this.scene.stop(this.sourceKey);
      this.scene.stop('CityScene');
    } else {
      this.leaving = false;
      this.description.setText('Could not open the mission result. Press GAME OVER to retry.');
    }
  }
}
