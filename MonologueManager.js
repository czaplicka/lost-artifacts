export class MonologueManager {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.options = {
      panelDepth: 100000,
      panelMarginX: 32,
      panelMarginBottom: 34,
      hudBottomOffset: 110,
      panelHeight: 86,
      panelColor: 0x101622,
      panelAlpha: 0.92,
      borderColor: 0xd6b35b,
      borderAlpha: 0.8,
      textColor: '#f7eed4',
      labelColor: '#d6b35b',
      fontFamily: 'Special Elite',
      fontSize: '20px',
      labelFontSize: '14px',
      lineSpacing: 8,
      paddingX: 22,
      textDisplayMs: 3400,
      minTextDisplayMs: 1800,
      msPerCharacter: 38,
      fadeMs: 180,
      defaultCooldownMs: 1500,
      idleDelayMin: 15000,
      idleDelayMax: 30000,
      idleCooldownMs: 10000,
      speakerName: 'DETECTIVE',
      ...options
    };

    this.dialogues = options.dialogues ?? {};
    this.queue = [];
    this.lastLineByKey = new Map();
    this.lastPlayedAtByKey = new Map();

    this.isShowing = false;
    this.currentTimer = null;
    this.idleTimer = null;

    this.container = null;
    this.panel = null;
    this.border = null;
    this.speakerLabel = null;
    this.textObject = null;

    this.isDestroyed = false;

    if (!this.isSceneUsable()) {
      console.error(
        '[MonologueManager] Cannot initialize: invalid scene.',
        scene
      );

      this.isDestroyed = true;
      return;
    }

    this.createUi();
    this.bindSceneEvents();
  }


  isSceneUsable() {
    return Boolean(
      this.scene &&
      this.scene.sys &&
      this.scene.sys.settings &&
      this.scene.time &&
      this.scene.add &&
      this.scene.tweens &&
      this.scene.scale
    );
  }


  isSceneActive() {
    return Boolean(
      this.isSceneUsable() &&
      this.scene.sys.isActive()
    );
  }


  getPanelLayout(width, height) {
    const o = this.options;
    const panelWidth = width - (o.panelMarginX * 2);

    const panelY =
      height -
      o.hudBottomOffset -
      o.panelMarginBottom -
      o.panelHeight;

    return {
      panelWidth,
      panelY
    };
  }


  createUi() {
    if (!this.isSceneUsable()) {
      return;
    }

    const { width, height } = this.scene.scale;
    const o = this.options;
    const { panelWidth, panelY } = this.getPanelLayout(width, height);

    this.container = this.scene.add.container(0, 0)
      .setDepth(o.panelDepth)
      .setScrollFactor(0)
      .setAlpha(0)
      .setVisible(false);

    this.panel = this.scene.add.rectangle(
      o.panelMarginX,
      panelY,
      panelWidth,
      o.panelHeight,
      o.panelColor,
      o.panelAlpha
    )
      .setOrigin(0, 0)
      .setStrokeStyle(2, o.borderColor, o.borderAlpha);

    this.border = this.scene.add.rectangle(
      o.panelMarginX + 5,
      panelY + 5,
      panelWidth - 10,
      o.panelHeight - 10
    )
      .setOrigin(0, 0)
      .setStrokeStyle(1, o.borderColor, 0.25);

    this.speakerLabel = this.scene.add.text(
      o.panelMarginX + o.paddingX,
      panelY + 10,
      o.speakerName,
      {
        fontFamily: o.fontFamily,
        fontSize: o.labelFontSize,
        color: o.labelColor,
        letterSpacing: 2
      }
    );

    this.textObject = this.scene.add.text(
      o.panelMarginX + o.paddingX,
      panelY + 32,
      '',
      {
        fontFamily: o.fontFamily,
        fontSize: o.fontSize,
        color: o.textColor,
        wordWrap: {
          width: panelWidth - (o.paddingX * 2)
        },
        lineSpacing: o.lineSpacing
      }
    );

    this.container.add([
      this.panel,
      this.border,
      this.speakerLabel,
      this.textObject
    ]);

    this.scene.scale.on(
      'resize',
      this.handleResize,
      this
    );
  }


  bindSceneEvents() {
    if (!this.isSceneUsable()) {
      return;
    }

    this.scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.destroy,
      this
    );

    this.scene.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.destroy,
      this
    );
  }


  handleResize(gameSize) {
    if (
      this.isDestroyed ||
      !this.container?.active ||
      !this.panel ||
      !this.border ||
      !this.speakerLabel ||
      !this.textObject
    ) {
      return;
    }

    const { width, height } = gameSize;
    const o = this.options;
    const { panelWidth, panelY } = this.getPanelLayout(width, height);

    this.panel.setPosition(o.panelMarginX, panelY);
    this.panel.setSize(panelWidth, o.panelHeight);

    this.border.setPosition(
      o.panelMarginX + 5,
      panelY + 5
    );

    this.border.setSize(
      panelWidth - 10,
      o.panelHeight - 10
    );

    this.speakerLabel.setPosition(
      o.panelMarginX + o.paddingX,
      panelY + 10
    );

    this.textObject.setPosition(
      o.panelMarginX + o.paddingX,
      panelY + 32
    );

    this.textObject.setWordWrapWidth(
      panelWidth - (o.paddingX * 2)
    );
  }


  setDialogues(dialogues) {
    this.dialogues = dialogues ?? {};
  }


  say(text, options = {}) {
    if (
      this.isDestroyed ||
      !this.isSceneUsable() ||
      !text ||
      typeof text !== 'string'
    ) {
      return false;
    }

    const settings = {
      speakerName: this.options.speakerName,
      force: false,
      queue: true,
      cooldownKey: null,
      cooldownMs: this.options.defaultCooldownMs,
      ...options
    };

    if (
      !settings.force &&
      this.isOnCooldown(
        settings.cooldownKey,
        settings.cooldownMs
      )
    ) {
      return false;
    }

    if (settings.cooldownKey) {
      this.lastPlayedAtByKey.set(
        settings.cooldownKey,
        this.scene.time.now
      );
    }

    const item = {
      text,
      speakerName: settings.speakerName
    };

    if (this.isShowing) {
      if (settings.queue) {
        this.queue.push(item);
      }

      return true;
    }

    this.show(item);

    return true;
  }


  sayRandom(key, options = {}) {
    if (this.isDestroyed || !this.isSceneUsable()) {
      return false;
    }

    const lines = this.getLines(key);

    if (!lines.length) {
      console.warn(
        `[MonologueManager] No lines found for key: "${key}"`
      );

      return false;
    }

    const line = this.getRandomLine(key, lines);

    return this.say(line, {
      cooldownKey: key,
      ...options
    });
  }


  sayAt(key, index, options = {}) {
    if (this.isDestroyed || !this.isSceneUsable()) {
      return false;
    }

    const lines = this.getLines(key);
    const line = lines[index];

    if (!line) {
      console.warn(
        `[MonologueManager] No line at index ${index} for key: "${key}"`
      );

      return false;
    }

    return this.say(line, {
      cooldownKey: key,
      ...options
    });
  }


  getLines(key) {
    const value = String(key || '')
      .split('.')
      .reduce(
        (currentValue, part) => currentValue?.[part],
        this.dialogues
      );

    if (Array.isArray(value)) {
      return value.filter(
        (line) => typeof line === 'string' && line.trim()
      );
    }

    if (typeof value === 'string' && value.trim()) {
      return [value];
    }

    return [];
  }


  getRandomLine(key, lines) {
    if (!Array.isArray(lines) || !lines.length) {
      return '';
    }

    if (lines.length === 1) {
      this.lastLineByKey.set(key, lines[0]);
      return lines[0];
    }

    const previousLine = this.lastLineByKey.get(key);

    const availableLines = lines.filter(
      (line) => line !== previousLine
    );

    const line = Phaser.Utils.Array.GetRandom(
      availableLines.length
        ? availableLines
        : lines
    );

    this.lastLineByKey.set(key, line);

    return line;
  }


  isOnCooldown(key, cooldownMs) {
    if (
      this.isDestroyed ||
      !this.isSceneUsable() ||
      !key ||
      !cooldownMs
    ) {
      return false;
    }

    const lastPlayedAt = this.lastPlayedAtByKey.get(key);

    if (lastPlayedAt === undefined) {
      return false;
    }

    return (
      this.scene.time.now -
      lastPlayedAt
    ) < cooldownMs;
  }


  show(item) {
    if (
      this.isDestroyed ||
      !this.isSceneUsable() ||
      !this.container?.active ||
      !this.textObject?.active ||
      !this.speakerLabel?.active
    ) {
      return;
    }

    this.isShowing = true;

    this.textObject.setText(item.text);
    this.speakerLabel.setText(item.speakerName);

    if (this.currentTimer) {
      this.currentTimer.remove(false);
      this.currentTimer = null;
    }

    this.scene.tweens.killTweensOf(this.container);

    this.container
      .setVisible(true)
      .setAlpha(0)
      .setDepth(this.options.panelDepth);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: this.options.fadeMs,
      ease: 'Sine.easeOut'
    });

    const displayMs = Math.max(
      this.options.minTextDisplayMs,
      item.text.length * this.options.msPerCharacter
    ) + this.options.textDisplayMs;

    this.currentTimer = this.scene.time.delayedCall(
      displayMs,
      () => {
        if (!this.isDestroyed) {
          this.hide();
        }
      }
    );
  }


  hide() {
    if (
      this.isDestroyed ||
      !this.isSceneUsable() ||
      !this.container?.active
    ) {
      return;
    }

    this.scene.tweens.killTweensOf(this.container);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: this.options.fadeMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (
          this.isDestroyed ||
          !this.container?.active
        ) {
          return;
        }

        this.container.setVisible(false);
        this.isShowing = false;
        this.currentTimer = null;

        this.showNextFromQueue();
      }
    });
  }


  showNextFromQueue() {
    if (
      this.isDestroyed ||
      !this.isSceneUsable() ||
      !this.queue.length
    ) {
      return;
    }

    const nextItem = this.queue.shift();

    this.show(nextItem);
  }


  clearQueue() {
    this.queue = [];
  }


  startIdle(key, options = {}) {
    this.stopIdle();

    if (
      this.isDestroyed ||
      !this.isSceneActive()
    ) {
      console.warn(
        '[MonologueManager] Cannot start idle monologue: scene is not active.',
        {
          key,
          sceneKey: this.scene?.scene?.key ?? null
        }
      );

      return false;
    }

    const settings = {
      minDelay: this.options.idleDelayMin,
      maxDelay: this.options.idleDelayMax,
      cooldownMs: this.options.idleCooldownMs,
      ...options
    };

    const scheduleNext = () => {
      if (
        this.isDestroyed ||
        !this.isSceneActive()
      ) {
        this.idleTimer = null;
        return;
      }

      const delay = Phaser.Math.Between(
        settings.minDelay,
        settings.maxDelay
      );

      this.idleTimer = this.scene.time.delayedCall(
        delay,
        () => {
          if (
            this.isDestroyed ||
            !this.isSceneActive()
          ) {
            this.idleTimer = null;
            return;
          }

          if (!this.isShowing && !this.queue.length) {
            this.sayRandom(key, {
              cooldownMs: settings.cooldownMs,
              queue: false
            });
          }

          scheduleNext();
        }
      );
    };

    scheduleNext();

    return true;
  }


  stopIdle() {
    if (this.idleTimer) {
      this.idleTimer.remove(false);
      this.idleTimer = null;
    }
  }


  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    this.stopIdle();

    if (this.currentTimer) {
      this.currentTimer.remove(false);
      this.currentTimer = null;
    }

    if (this.scene?.tweens && this.container) {
      this.scene.tweens.killTweensOf(this.container);
    }

    this.scene?.scale?.off(
      'resize',
      this.handleResize,
      this
    );

    this.scene?.events?.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.destroy,
      this
    );

    this.scene?.events?.off(
      Phaser.Scenes.Events.DESTROY,
      this.destroy,
      this
    );

    this.queue = [];
    this.lastLineByKey.clear();
    this.lastPlayedAtByKey.clear();

    if (this.container?.active) {
      this.container.destroy(true);
    }

    this.container = null;
    this.panel = null;
    this.border = null;
    this.speakerLabel = null;
    this.textObject = null;
    this.scene = null;
  }
}