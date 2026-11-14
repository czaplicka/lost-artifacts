import {BaseForensicMinigame} from './BaseForensicMinigame.js';

const PATTERNS = ['LOOP', 'WHORL', 'ARCH'];

// Pattern-classification puzzle. Drawn procedurally; no new assets required.
export class FingerprintPatternScene extends BaseForensicMinigame {
  constructor() {
    super('FingerprintPatternScene');
    this.progressLabel = null;
    this.patternLayout = null;
  }
  init(data = {}) {
    const config = data.evidenceConfig || {};
    const value = String(data.correctValue ?? config.correctValue ?? config.thief_value ?? '').trim().toUpperCase();
    if (!PATTERNS.includes(value)) throw new Error(`Unsupported fingerprint pattern: ${value}`);
    super.init({
      ...data, totalSteps: 3, stationId: data.stationId || config.stationId || 'identity',
      evidenceType: 'fingerprint_pattern', correctValue: value,
      clueType: data.clueType || config.clueType || 'identity',
      clueText: data.clueText || config.clueText || `The recovered print has a ${value.toLowerCase()} ridge pattern.`,
      evidenceConfig: {...config, evidenceType: 'fingerprint_pattern', correctValue: value}
    });
    this.progressLabel = null;
  }
  getTitle() { return 'FINGERPRINT PATTERN ANALYSIS'; }
  getSubtitle() { return 'Prepare. Focus. Classify.'; }
  getRetryHint() { return 'Compare the overall ridge flow with the reference patterns.'; }
  toDisplayText(value) { return String(value ?? '').toUpperCase(); }

  createBackdrop() {
    const {width, height} = this.scale;
    this.add.rectangle(0, 0, width, height, 0x07110d, 1).setOrigin(0, 0).setDepth(-10);
  }
  createHeader() {
    const {width} = this.scale;
    this.titleText = this.add.text(width / 2, 24, this.getTitle(), {
      fontFamily: 'PressStart2P', fontSize: width <= 700 ? '9px' : '13px',
      color: '#39ff14', align: 'center', wordWrap: {width: width - 64, useAdvancedWrap: true}
    }).setOrigin(.5, 0).setDepth(110);
    this.subtitleText = this.add.text(width / 2, 58, this.getSubtitle(), {
      fontFamily: 'SpecialElite', fontSize: '17px', color: '#d5e6dc'
    }).setOrigin(.5, 0).setDepth(110);
    this.instructionsBg = this.add.rectangle(width / 2, 108, width - 24, 52, 0x101c15, 1).setDepth(109);
    this.instructionsText = this.add.text(width / 2, 108, '', {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#ffe8a3', align: 'center',
      wordWrap: {width: width - 48, useAdvancedWrap: true}
    }).setOrigin(.5).setDepth(110);
    this.progressLabel = this.add.text(width / 2, 142, '', {
      fontFamily: 'PressStart2P', fontSize: '8px', color: '#8df7b4'
    }).setOrigin(.5).setDepth(110);
    this.setStep(0);
  }
  createFrame() {
    const {width, height} = this.scale;
    const top = 160, actionY = height - 154, span = Math.max(180, actionY - top);
    this.patternLayout = {
      centerX: width / 2, sampleY: top + span * .32,
      sampleWidth: Math.min(240, width - 72), sampleHeight: Math.min(160, span * .43),
      referenceY: top + span * .78, actionY
    };
    this.playArea = this.add.container(0, 0).setDepth(-1);
    this.playAreaBg = this.add.rectangle(width / 2, (top + actionY) / 2, width - 24,
      Math.max(180, actionY - top + 40), 0x122019, .95).setStrokeStyle(1, 0x5da17f).setDepth(-1);
    this.playArea.add(this.playAreaBg);
    this.dialogueBg = this.add.rectangle(width / 2, height - 86, width - 24, 72, 0x07110d, 1)
      .setStrokeStyle(1, 0x39ff14).setDepth(120);
    this.dialogueText = this.add.text(width / 2, height - 86, '', {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#f3f3f3', align: 'center',
      wordWrap: {width: width - 44, useAdvancedWrap: true}
    }).setOrigin(.5).setDepth(121);
  }
  createFooter() {
    const {width, height} = this.scale;
    const style = {fontFamily: 'PressStart2P', fontSize: '8px', color: '#ffcc00'};
    this.scoreText = this.add.text(16, height - 28, '', style).setDepth(130);
    this.timerText = this.add.text(width - 16, height - 28, 'Time: 00', style).setOrigin(1, 0).setDepth(130);
    this.setScore(this.score);
  }
  setStep(index) {
    this.currentStep = Math.max(0, Math.min(this.totalSteps, index));
    this.progressLabel?.setText(`PROTOCOL: ${this.currentStep}/${this.totalSteps}`);
  }
  createButton(x, y, w, h, label, callback, opts = {}) {
    if (label === 'ADD TO CASE FILE') {
      x = this.scale.width / 2; y = this.patternLayout.actionY;
      w = Math.min(w, this.scale.width - 32);
    }
    return super.createButton(x, y, w, h, label, callback, opts);
  }
  drawPattern(pattern, x, y, width, height, alpha = 1) {
    const graphics = this.add.graphics().setPosition(x, y).setDepth(151);
    graphics.lineStyle(2, 0xc5ead1, alpha);
    for (let ridge = 0; ridge < 8; ridge++) {
      const rx = width * (.45 - ridge * .04), ry = height * (.45 - ridge * .04);
      if (pattern === 'WHORL') {
        graphics.strokeEllipse(0, 0, rx * 2, ry * 2);
      } else {
        graphics.beginPath();
        for (let point = 0; point <= 50; point++) {
          const t = point / 50;
          let px, py;
          if (pattern === 'LOOP') {
            const angle = -2.75 + t * 5.5;
            px = Math.cos(angle) * rx + width * .06;
            py = Math.sin(angle) * ry;
          } else {
            px = (t * 2 - 1) * width * .45;
            py = height * (.35 - ridge * .075) - Math.sin(t * Math.PI) * height * .3;
          }
          if (point === 0) graphics.moveTo(px, py); else graphics.lineTo(px, py);
        }
        graphics.strokePath();
      }
    }
    return this.addStageObject(graphics);
  }
  showSample(alpha = 1, obscured = false) {
    const L = this.patternLayout;
    this.drawPattern(this.correctValue, L.centerX, L.sampleY, L.sampleWidth, L.sampleHeight, alpha);
    if (obscured) {
      const cover = this.add.graphics().setDepth(152);
      cover.lineStyle(5, 0x34463b, .9);
      for (let i = 0; i < 10; i++) {
        const yy = L.sampleY - L.sampleHeight / 2 + i * L.sampleHeight / 9;
        cover.lineBetween(L.centerX - L.sampleWidth / 2, yy, L.centerX + L.sampleWidth / 2, yy + 12);
      }
      this.addStageObject(cover);
    }
    this.addStageObject(this.add.text(L.centerX, L.sampleY + L.sampleHeight / 2 + 12, 'RECOVERED SAMPLE', {
      fontFamily: 'PressStart2P', fontSize: '8px', color: '#9db9a7'
    }).setOrigin(.5).setDepth(153));
  }
  createEvidenceFlow() { this.startPreparation(); }
  startPreparation() {
    this.clearStage(); this.setStep(0); this.showSample(.35, true);
    this.setInstructions('Clear the lifted sample before comparing its ridge flow.');
    this.setDialogue('The print is dirty. Fortunately, dirt is not a personality trait.');
    this.createButton(this.scale.width / 2, this.patternLayout.actionY, Math.min(300, this.scale.width - 32), 46,
      'PREPARE SAMPLE', () => this.startFocus(), {fontFamily: 'PressStart2P', fontSize: '10px'});
  }
  startFocus() {
    if (this.resolved || this._minigameClosing) return;
    this.clearStage(); this.setStep(1); this.showSample(.55);
    this.setInstructions('Sharpen the image before classifying the pattern.');
    this.setDialogue('The ridges are there. The microscope is considering cooperation.');
    this.createButton(this.scale.width / 2, this.patternLayout.actionY, Math.min(300, this.scale.width - 32), 46,
      'SHARPEN IMAGE', () => this.startClassification(), {fontFamily: 'PressStart2P', fontSize: '10px'});
  }
  startClassification() {
    if (this.resolved || this._minigameClosing) return;
    this.clearStage(); this.setStep(2); this.showSample(1);
    this.setInstructions('Select the reference matching the overall ridge pattern.');
    this.setDialogue('Classify the pattern, not the person. That is your next headache.');
    const width = this.scale.width, gap = 8, cardWidth = Math.min(170, (width - 32 - gap * 2) / 3);
    const left = width / 2 - (cardWidth * 3 + gap * 2) / 2 + cardWidth / 2;
    PATTERNS.forEach((pattern, index) => {
      const x = left + index * (cardWidth + gap), y = this.patternLayout.referenceY;
      const button = this.createButton(x, y, cardWidth, 100, pattern,
        () => this.resolveChoice(pattern, pattern === this.correctValue, 10),
        {fontFamily: 'PressStart2P', fontSize: '9px'});
      button.text.setY(33);
      this.drawPattern(pattern, x, y - 12, cardWidth - 18, 55, .9);
    });
  }
  onCorrectChoice() {
    this.clearStage(); this.setStep(3); this.showSample(1);
    this.setInstructions('Classification complete. Add the report to the case file.');
  }
  getSuccessMessage(value, bonus = 0) {
    return `Pattern classified: ${value}.${bonus ? ` Speed bonus: +${bonus}.` : ''} The report is ready to add.`;
  }
  cleanup() {
    this.progressLabel?.destroy(); this.progressLabel = null;
    super.cleanup();
  }
}
