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
      fontFamily: 'SpecialElite',
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
    this.currentTween = null;

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
    const scene = this.scene;

    return Boolean(
      !this.isDestroyed
      && scene
      && scene.sys
      && scene.sys.settings
      && scene.time
      && typeof scene.time.delayedCall === 'function'
      && scene.add
      && typeof scene.add.container === 'function'
      && typeof scene.add.rectangle === 'function'
      && typeof scene.add.text === 'function'
      && scene.tweens
      && typeof scene.tweens.add === 'function'
      && scene.scale
      && typeof scene.scale.on === 'function'
    );
  }

  isSceneActive() {
    const scene = this.scene;
    const sys = scene?.sys;

    return Boolean(
      !this.isDestroyed
      && this.isSceneUsable()
      && typeof sys?.isActive === 'function'
      && sys.isActive()
    );
  }

  getPanelLayout(width, height) {
    const o = this.options;

    const panelWidth = Math.max(
      100,
      width - (o.panelMarginX * 2)
    );

    const panelY = Math.max(
      0,
      height
        - o.hudBottomOffset
        - o.panelMarginBottom
        - o.panelHeight
    );

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
    const { panelWidth, panelY } = this.getPanelLayout(
      width,
      height
    );

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
      Math.max(1, panelWidth - 10),
      Math.max(1, o.panelHeight - 10)
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
          width: Math.max(
            40,
            panelWidth - (o.paddingX * 2)
          )
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
    if (
      !this.isSceneUsable()
      || !this.scene?.events
      || typeof this.scene.events.once !== 'function'
    ) {
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
      this.isDestroyed
      || !gameSize
      || !this.container?.active
      || !this.panel?.active
      || !this.border?.active
      || !this.speakerLabel?.active
      || !this.textObject?.active
    ) {
      return;
    }

    const { width, height } = gameSize;
    const o = this.options;
    const { panelWidth, panelY } = this.getPanelLayout(
      width,
      height
    );

    this.panel
      .setPosition(o.panelMarginX, panelY)
      .setSize(panelWidth, o.panelHeight);

    this.border
      .setPosition(
        o.panelMarginX + 5,
        panelY + 5
      )
      .setSize(
        Math.max(1, panelWidth - 10),
        Math.max(1, o.panelHeight - 10)
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
      Math.max(
        40,
        panelWidth - (o.paddingX * 2)
      )
    );
  }

  setDialogues(dialogues) {
    this.dialogues = dialogues ?? {};
  }

  createTrackedTween(config) {
    if (
      this.isDestroyed
      || !this.isSceneUsable()
      || !config
    ) {
      return null;
    }

    try {
      if (typeof this.scene.createTrackedTween === 'function') {
        return this.scene.createTrackedTween(config);
      }

      if (typeof this.scene.tweens?.add === 'function') {
        return this.scene.tweens.add(config);
      }
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to create tween:',
        error
      );
    }

    return null;
  }

  stopCurrentTween() {
    const tween = this.currentTween;

    if (!tween) {
      return;
    }

    this.currentTween = null;

    try {
      if (
        this.scene
        && typeof this.scene.removeTrackedTween === 'function'
      ) {
        this.scene.removeTrackedTween(tween, {
          stop: true,
          remove: true
        });

        return;
      }

      const isPlaying = typeof tween.isPlaying === 'function'
        ? tween.isPlaying()
        : tween.isPlaying;

      if (isPlaying) {
        tween.stop?.();
      }

      tween.remove?.();
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to stop current tween:',
        error
      );
    }
  }

  killTweensForContainer() {
    if (!this.container) {
      return;
    }

    this.stopCurrentTween();

    try {
      if (
        this.scene
        && typeof this.scene.killTrackedTweensOf === 'function'
      ) {
        this.scene.killTrackedTweensOf(this.container);
        return;
      }

      if (
        typeof this.scene?.tweens?.killTweensOf === 'function'
      ) {
        this.scene.tweens.killTweensOf(this.container);
      }
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to kill container tweens:',
        error
      );
    }
  }

  removeTimer(timer) {
    if (!timer) {
      return;
    }

    try {
      timer.remove?.(false);
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to remove timer:',
        error
      );
    }
  }

  say(text, options = {}) {
    if (
      this.isDestroyed
      || !this.isSceneUsable()
      || typeof text !== 'string'
      || !text.trim()
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
      !settings.force
      && this.isOnCooldown(
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
      text: text.trim(),
      speakerName: settings.speakerName
        || this.options.speakerName
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
        (line) =>
          typeof line === 'string'
          && line.trim()
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
      this.isDestroyed
      || !this.isSceneUsable()
      || !key
      || !Number.isFinite(cooldownMs)
      || cooldownMs <= 0
    ) {
      return false;
    }

    const lastPlayedAt = this.lastPlayedAtByKey.get(key);

    if (lastPlayedAt === undefined) {
      return false;
    }

    return (
      this.scene.time.now - lastPlayedAt
    ) < cooldownMs;
  }

  show(item) {
    if (
      this.isDestroyed
      || !this.isSceneUsable()
      || !item
      || !this.container?.active
      || !this.textObject?.active
      || !this.speakerLabel?.active
    ) {
      return false;
    }

    this.isShowing = true;

    this.textObject.setText(item.text);
    this.speakerLabel.setText(
      item.speakerName || this.options.speakerName
    );

    if (this.currentTimer) {
      this.removeTimer(this.currentTimer);
      this.currentTimer = null;
    }

    this.killTweensForContainer();

    this.container
      .setVisible(true)
      .setAlpha(0)
      .setDepth(this.options.panelDepth);

    this.currentTween = this.createTrackedTween({
      targets: this.container,
      alpha: 1,
      duration: this.options.fadeMs,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.currentTween = null;
      }
    });

    if (!this.currentTween) {
      this.container.setAlpha(1);
    }

    const displayMs = Math.max(
      this.options.minTextDisplayMs,
      item.text.length * this.options.msPerCharacter
    ) + this.options.textDisplayMs;

    try {
      this.currentTimer = this.scene.time.delayedCall(
        displayMs,
        () => {
          this.currentTimer = null;

          if (!this.isDestroyed) {
            this.hide();
          }
        }
      );
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to create display timer:',
        error
      );

      this.hide();
      return false;
    }

    return true;
  }

  finishHide() {
    this.currentTween = null;
    this.currentTimer = null;

    if (
      this.isDestroyed
      || !this.container?.active
    ) {
      return;
    }

    this.container
      .setAlpha(0)
      .setVisible(false);

    this.isShowing = false;

    this.showNextFromQueue();
  }

  hide() {
    if (
      this.isDestroyed
      || !this.container?.active
    ) {
      return false;
    }

    if (this.currentTimer) {
      this.removeTimer(this.currentTimer);
      this.currentTimer = null;
    }

    this.killTweensForContainer();

    const finish = () => {
      this.finishHide();
    };

    this.currentTween = this.createTrackedTween({
      targets: this.container,
      alpha: 0,
      duration: this.options.fadeMs,
      ease: 'Sine.easeIn',
      onComplete: finish
    });

    if (!this.currentTween) {
      finish();
    }

    return true;
  }

  showNextFromQueue() {
    if (
      this.isDestroyed
      || !this.isSceneUsable()
    ) {
      return false;
    }

    while (this.queue.length) {
      const nextItem = this.queue.shift();

      if (
        nextItem
        && typeof nextItem.text === 'string'
        && nextItem.text.trim()
      ) {
        return this.show(nextItem);
      }
    }

    return false;
  }

  clearQueue() {
    this.queue = [];
  }

  startIdle(key, options = {}) {
    this.stopIdle();

    if (
      this.isDestroyed
      || !this.isSceneActive()
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

    const minDelay = Math.max(
      0,
      Number(settings.minDelay) || 0
    );

    const maxDelay = Math.max(
      minDelay,
      Number(settings.maxDelay) || minDelay
    );

    const scheduleNext = () => {
      if (
        this.isDestroyed
        || !this.isSceneActive()
      ) {
        this.idleTimer = null;
        return;
      }

      const delay = Phaser.Math.Between(
        minDelay,
        maxDelay
      );

      try {
        this.idleTimer = this.scene.time.delayedCall(
          delay,
          () => {
            this.idleTimer = null;

            if (
              this.isDestroyed
              || !this.isSceneActive()
            ) {
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
      } catch (error) {
        console.warn(
          '[MonologueManager] Failed to schedule idle monologue:',
          error
        );

        this.idleTimer = null;
      }
    };

    scheduleNext();

    return true;
  }

  stopIdle() {
    if (!this.idleTimer) {
      return;
    }

    this.removeTimer(this.idleTimer);
    this.idleTimer = null;
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.stopIdle();

    if (this.currentTimer) {
      this.removeTimer(this.currentTimer);
      this.currentTimer = null;
    }

    this.killTweensForContainer();

    this.isDestroyed = true;
    this.isShowing = false;

    try {
      this.scene?.scale?.off(
        'resize',
        this.handleResize,
        this
      );
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to remove resize listener:',
        error
      );
    }

    try {
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
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to remove scene listeners:',
        error
      );
    }

    this.queue = [];
    this.lastLineByKey.clear();
    this.lastPlayedAtByKey.clear();

    try {
      if (this.container?.active) {
        this.container.destroy(true);
      }
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to destroy monologue container:',
        error
      );
    }

    this.container = null;
    this.panel = null;
    this.border = null;
    this.speakerLabel = null;
    this.textObject = null;
    this.currentTween = null;
    this.scene = null;
  }
}