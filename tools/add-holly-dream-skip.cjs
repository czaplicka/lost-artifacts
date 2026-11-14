const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const skipMethods = String.raw`
  createSkipControls() {
    this.skipDialog = null;
    this.skipDialogBlocker = null;
    this.skipDialogPanel = null;
    this.skipPreviousPhase = null;
    this.skipButton = this.add.text(0, 0, 'SKIP DREAM', {
      fontFamily: 'PressStart2P', fontSize: '13px', color: '#f4ead7',
      backgroundColor: '#241b14', padding: { x: 18, y: 14 }
    }).setOrigin(1, 0).setDepth(1000).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.skipButton.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
      if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
      this.askToSkipDream();
    });
    this.trackInputEvent(this.scale, 'resize', () => this.layoutSkipControls());
    this.layoutSkipControls();
  }

  layoutSkipControls() {
    const { width, height } = this.scale;
    this.skipButton?.setPosition(width - 24, 24);
    this.skipDialogBlocker?.setPosition(width / 2, height / 2).setSize(width, height);
    this.skipDialogPanel?.setPosition(width / 2, height / 2)
      .setScale(Math.max(0.01, Math.min(1, (width - 40) / 820, (height - 40) / 360)));
  }

  askToSkipDream() {
    if (this._cleanupDone || this._finishEmitted || this._applyingReward ||
        this.skipDialog || hasCompletedHollyIntro() ||
        !['intro-video', 'dialogue', 'dialogue-choice', 'choices'].includes(this.phase)) return;
    this.skipPreviousPhase = this.phase;
    this.phase = 'skip-confirmation';
    this.skipButton.setVisible(false);
    this.skipDialog = this.add.container(0, 0).setDepth(1100).setScrollFactor(0);
    this.skipDialogBlocker = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.82)
      .setScrollFactor(0).setInteractive();
    this.skipDialogBlocker.on('pointerdown', (pointer, x, y, event) => event?.stopPropagation());
    this.skipDialogPanel = this.add.container(0, 0).setScrollFactor(0);
    const panel = this.add.rectangle(0, 0, 820, 360, 0x17110e, 1)
      .setStrokeStyle(3, 0x8b6b3f);
    const title = this.add.text(0, -120, 'SKIP HOLLY\'S DREAM?', {
      fontFamily: 'PressStart2P', fontSize: '20px', color: '#e6c27a'
    }).setOrigin(0.5);
    const message = this.add.text(0, -22,
      'Holly\'s case will still be accepted.\nYou will receive no favor or reward,\nand will not unlock The Dream achievement.\nThis dream will not play again in this campaign.', {
        fontFamily: 'SpecialElite', fontSize: '25px', color: '#f4ead7',
        align: 'center', lineSpacing: 8, wordWrap: { width: 740 }
      }).setOrigin(0.5);
    const button = (x, label, onPick) => {
      const text = this.add.text(x, 120, label, {
        fontFamily: 'SpecialElite', fontSize: '24px', color: '#f4ead7',
        backgroundColor: '#3a281c', padding: { x: 22, y: 16 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      text.on('pointerdown', (pointer, lx, ly, event) => {
        event?.stopPropagation();
        if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
        onPick();
      });
      return text;
    };
    this.skipDialogPanel.add([
      panel, title, message,
      button(-185, 'KEEP DREAMING', () => this.cancelSkipDream()),
      button(185, 'SKIP / NO REWARD', () => this.skipDreamWithoutReward())
    ]);
    this.skipDialog.add([this.skipDialogBlocker, this.skipDialogPanel]);
    this.layoutSkipControls();
  }

  closeSkipDialog() {
    this.skipDialog?.destroy(true);
    this.skipDialog = null;
    this.skipDialogBlocker = null;
    this.skipDialogPanel = null;
  }

  cancelSkipDream() {
    if (this.phase !== 'skip-confirmation') return;
    this.phase = this.skipPreviousPhase || 'dialogue';
    this.skipPreviousPhase = null;
    this.closeSkipDialog();
    this.skipButton?.setVisible(!hasCompletedHollyIntro());
  }

  skipDreamWithoutReward() {
    if (this.phase !== 'skip-confirmation' || this._finishEmitted ||
        this._applyingReward || hasCompletedHollyIntro()) return false;
    this.phase = 'skipping';
    this.skipButton?.setVisible(false);
    this.closeSkipDialog();
    this.skipPreviousPhase = null;
    this.stopTyping();
    this.isTyping = false;
    this.queue = [];
    this.nextPhaseAfterDialogue = null;
    this.clearChoices();
    for (const video of [this.video, this.bgVideo]) {
      video?.off?.('complete');
      this.destroyVideo(video);
    }
    this.video = null;
    this.bgVideo = null;
    gameState.updateState({
      hollyIntroSeen: true,
      hollyIntroPending: false,
      hollyFirstSleepSeen: true,
      hollyIntroChoice: 'skipped',
      hollyIntroTone: null,
      johnCaseAccepted: true,
      blackLadyCaseAccepted: true
    });
    this._skipRepeatedIntro = true;
    requestAutosave();
    flushAutosave();
    this.finishScene();
    return true;
  }

  destroySkipControls() {
    this.closeSkipDialog();
    this.skipButton?.destroy();
    this.skipButton = null;
    this.skipPreviousPhase = null;
  }
`;
const root = process.cwd();
const scenePath = path.join(root, 'scenes/HollyIntroScene.js');
const achievementsPath = path.join(root, 'managers/AchievementManager.js');

function replaceOnce(source, from, to, label) {
  if (source.split(from).length !== 2) {
    throw new Error('Unexpected code at ' + label + '. No files changed.');
  }
  return source.replace(from, to);
}

try {
  const oldScene = fs.readFileSync(scenePath, 'utf8');
  const oldAchievements = fs.readFileSync(achievementsPath, 'utf8');
  if (oldScene.includes('skipDreamWithoutReward()')) {
    throw new Error('Skip Dream is already installed. No files changed.');
  }
  let scene = replaceOnce(oldScene,
    '    this.playIntroVideo();\n  }',
    '    this.createSkipControls();\n    this.playIntroVideo();\n  }',
    'Holly create');
  scene = replaceOnce(scene,
    "  selectChoice(choice) {\n    if (this.phase !== 'choices' || !choice) return;",
    "  selectChoice(choice) {\n    if (this.phase !== 'choices' || !choice) return;\n    this.skipButton?.setVisible(false);",
    'reward selection');
  scene = replaceOnce(scene,
    '  cleanup() {\n    this._hudGuard?.release();',
    skipMethods + '\n  cleanup() {\n    this.destroySkipControls();\n    this._hudGuard?.release();',
    'Holly cleanup');
  const achievements = replaceOnce(oldAchievements,
    'isUnlocked:()=>gameState.hollyIntroSeen===true},',
    "isUnlocked:()=>gameState.hollyIntroSeen===true&&gameState.hollyIntroChoice!=='skipped'},",
    'The Dream achievement');

  for (const [name, code] of [['HollyIntroScene.js', scene], ['AchievementManager.js', achievements]]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: code, encoding: 'utf8'
    });
    if (result.status !== 0) throw new Error(name + ': ' + (result.stderr || result.error));
  }
  const backup = path.join(root, 'holly-skip-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backup, { recursive: true });
  fs.writeFileSync(path.join(backup, 'HollyIntroScene.js'), oldScene);
  fs.writeFileSync(path.join(backup, 'AchievementManager.js'), oldAchievements);
  try {
    fs.writeFileSync(scenePath, scene);
    fs.writeFileSync(achievementsPath, achievements);
  } catch (error) {
    fs.writeFileSync(scenePath, oldScene);
    fs.writeFileSync(achievementsPath, oldAchievements);
    throw error;
  }
  console.log('Skip Dream installed. Skipping accepts the case without a reward.');
  console.log('Backup: ' + path.relative(root, backup));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
