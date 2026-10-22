// managers/MonologueManager.js

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
    this.isDestroyed = false;

    this.currentTimer = null;
    this.idleTimer = null;
    this.currentTween = null;

    this.idleRequest = null;
    this.idleGeneration = 0;

    this.container = null;
    this.panel = null;
    this.border = null;
    this.speakerLabel = null;
    this.textObject = null;

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
    const status = scene?.sys?.settings?.status;

    return Boolean(
      !this.isDestroyed
      && scene?.sys?.settings
      && status !== Phaser.Scenes.SHUTDOWN
      && status !== Phaser.Scenes.DESTROYED
      && typeof scene.time?.delayedCall === 'function'
      && typeof scene.add?.container === 'function'
      && typeof scene.add?.rectangle === 'function'
      && typeof scene.add?.text === 'function'
      && typeof scene.tweens?.add === 'function'
      && typeof scene.scale?.on === 'function'
    );
  }

  isSceneActive() {
    return Boolean(
      this.isSceneUsable()
      && typeof this.scene.sys.isActive === 'function'
      && this.scene.sys.isActive()
    );
  }

  getPanelLayout(width, height) {
    const o = this.options;

    return {
      panelWidth: Math.max(100, width - o.panelMarginX * 2),
      panelY: Math.max(
        0,
        height
          - o.hudBottomOffset
          - o.panelMarginBottom
          - o.panelHeight
      )
    };
  }

  createUi() {
    if (!this.isSceneUsable()) return;

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
          width: Math.max(40, panelWidth - o.paddingX * 2)
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

    this.scene.scale.on('resize', this.handleResize, this);
  }

  bindSceneEvents() {
    if (!this.isSceneUsable() || !this.scene.events) return;

    const events = this.scene.events;
    const E = Phaser.Scenes.Events;

    events.on(E.CREATE, this.handleSceneReady, this);
    events.on(E.WAKE, this.handleSceneReady, this);
    events.on(E.RESUME, this.handleSceneReady, this);

    events.on(E.PAUSE, this.handleSceneInactive, this);
    events.on(E.SLEEP, this.handleSceneInactive, this);

    events.once(E.SHUTDOWN, this.destroy, this);
    events.once(E.DESTROY, this.destroy, this);
  }

  handleSceneReady() {
    if (!this.isSceneActive()) return;

    this.scheduleIdle();

    if (!this.isShowing && this.queue.length) {
      this.showNextFromQueue();
    }
  }

  handleSceneInactive() {
    // Zachowujemy żądanie idle, usuwamy tylko jego timer.
    this.cancelIdleTimer();
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
    const { panelWidth, panelY } = this.getPanelLayout(width, height);

    this.panel
      .setPosition(o.panelMarginX, panelY)
      .setSize(panelWidth, o.panelHeight);

    this.border
      .setPosition(o.panelMarginX + 5, panelY + 5)
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
      Math.max(40, panelWidth - o.paddingX * 2)
    );
  }

  setDialogues(dialogues) {
    this.dialogues = dialogues ?? {};
  }

  createTrackedTween(config) {
    if (!this.isSceneUsable() || !config) return null;

    try {
      if (typeof this.scene.createTrackedTween === 'function') {
        return this.scene.createTrackedTween(config);
      }

      return this.scene.tweens.add(config);
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to create tween:',
        error
      );

      return null;
    }
  }

  stopCurrentTween() {
    const tween = this.currentTween;
    if (!tween) return;

    this.currentTween = null;

    try {
      if (typeof this.scene?.removeTrackedTween === 'function') {
        this.scene.removeTrackedTween(tween, {
          stop: true,
          remove: true
        });
        return;
      }

      const isPlaying = typeof tween.isPlaying === 'function'
        ? tween.isPlaying()
        : tween.isPlaying;

      if (isPlaying) tween.stop?.();
      tween.remove?.();
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to stop current tween:',
        error
      );
    }
  }

  killTweensForContainer() {
    this.stopCurrentTween();

    if (!this.container) return;

    try {
      if (typeof this.scene?.killTrackedTweensOf === 'function') {
        this.scene.killTrackedTweensOf(this.container);
        return;
      }

      this.scene?.tweens?.killTweensOf?.(this.container);
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to kill container tweens:',
        error
      );
    }
  }

  removeTimer(timer) {
    if (!timer) return;

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
      !this.isSceneUsable()
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
      && this.isOnCooldown(settings.cooldownKey, settings.cooldownMs)
    ) {
      return false;
    }

    const item = {
      text: text.trim(),
      speakerName: settings.speakerName || this.options.speakerName
    };

    let accepted = false;

    if (this.isShowing) {
      if (!settings.queue) return false;

      this.queue.push(item);
      accepted = true;
    } else {
      accepted = this.show(item);
    }

    if (accepted && settings.cooldownKey) {
      this.lastPlayedAtByKey.set(
        settings.cooldownKey,
        this.scene.time.now
      );
    }

    return accepted;
  }

  sayRandom(key, options = {}) {
    if (!this.isSceneUsable()) return false;

    const lines = this.getLines(key);

    if (!lines.length) {
      console.warn(
        `[MonologueManager] No lines found for key: "${key}"`
      );
      return false;
    }

    return this.say(this.getRandomLine(key, lines), {
      cooldownKey: key,
      ...options
    });
  }

  sayAt(key, index, options = {}) {
    if (!this.isSceneUsable()) return false;

    const line = this.getLines(key)[index];

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
        line => typeof line === 'string' && line.trim()
      );
    }

    if (typeof value === 'string' && value.trim()) {
      return [value];
    }

    return [];
  }

  getRandomLine(key, lines) {
    if (!Array.isArray(lines) || !lines.length) return '';

    const previousLine = this.lastLineByKey.get(key);
    const available = lines.filter(line => line !== previousLine);

    const line = Phaser.Utils.Array.GetRandom(
      available.length ? available : lines
    );

    this.lastLineByKey.set(key, line);
    return line;
  }

  isOnCooldown(key, cooldownMs) {
    if (
      !this.isSceneUsable()
      || !key
      || !Number.isFinite(cooldownMs)
      || cooldownMs <= 0
    ) {
      return false;
    }

    const lastPlayedAt = this.lastPlayedAtByKey.get(key);

    if (lastPlayedAt === undefined) return false;

    return this.scene.time.now - lastPlayedAt < cooldownMs;
  }

  show(item) {
    if (
      !this.isSceneUsable()
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

    this.removeTimer(this.currentTimer);
    this.currentTimer = null;

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

          if (!this.isDestroyed) this.hide();
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

    if (this.isDestroyed || !this.container?.active) return;

    this.container.setAlpha(0).setVisible(false);
    this.isShowing = false;

    this.showNextFromQueue();
  }

  hide() {
    if (this.isDestroyed || !this.container?.active) {
      return false;
    }

    this.removeTimer(this.currentTimer);
    this.currentTimer = null;

    this.killTweensForContainer();

    this.currentTween = this.createTrackedTween({
      targets: this.container,
      alpha: 0,
      duration: this.options.fadeMs,
      ease: 'Sine.easeIn',
      onComplete: () => this.finishHide()
    });

    if (!this.currentTween) this.finishHide();

    return true;
  }

  showNextFromQueue() {
    if (!this.isSceneActive() || this.isShowing) return false;

    while (this.queue.length) {
      const item = this.queue.shift();

      if (
        item
        && typeof item.text === 'string'
        && item.text.trim()
      ) {
        return this.show(item);
      }
    }

    return false;
  }

  clearQueue() {
    this.queue = [];
  }

  startIdle(key, options = {}) {
    this.stopIdle();

    if (!this.isSceneUsable()) return false;

    if (typeof key !== 'string' || !key.trim()) {
      console.warn('[MonologueManager] Invalid idle key:', key);
      return false;
    }

    const settings = {
      minDelay: this.options.idleDelayMin,
      maxDelay: this.options.idleDelayMax,
      cooldownMs: this.options.idleCooldownMs,
      ...options
    };

    const numericMin = Number(settings.minDelay);
    const numericMax = Number(settings.maxDelay);
    const numericCooldown = Number(settings.cooldownMs);

    const minDelay = Math.max(
      0,
      Number.isFinite(numericMin)
        ? numericMin
        : this.options.idleDelayMin
    );

    const maxDelay = Math.max(
      minDelay,
      Number.isFinite(numericMax) ? numericMax : minDelay
    );

    this.idleRequest = {
      key: key.trim(),
      minDelay,
      maxDelay,
      cooldownMs: Number.isFinite(numericCooldown)
        ? Math.max(0, numericCooldown)
        : this.options.idleCooldownMs
    };

    // W create() zapisujemy żądanie i czekamy na CREATE.
    // Dla PAUSE/SLEEP czekamy na RESUME/WAKE.
    this.scheduleIdle();

    return true;
  }

  scheduleIdle() {
    if (
      !this.isSceneActive()
      || !this.idleRequest
      || this.idleTimer
    ) {
      return false;
    }

    const request = this.idleRequest;
    const generation = this.idleGeneration;

    const delay = Phaser.Math.Between(
      Math.ceil(request.minDelay),
      Math.max(
        Math.ceil(request.minDelay),
        Math.floor(request.maxDelay)
      )
    );

    try {
      this.idleTimer = this.scene.time.delayedCall(delay, () => {
        if (
          this.isDestroyed
          || generation !== this.idleGeneration
          || this.idleRequest !== request
        ) {
          return;
        }

        this.idleTimer = null;

        if (!this.isSceneActive()) return;

        if (!this.isShowing && !this.queue.length) {
          this.sayRandom(request.key, {
            cooldownMs: request.cooldownMs,
            queue: false
          });
        }

        // Nie przywracamy cyklu anulowanego przez stopIdle().
        if (
          generation === this.idleGeneration
          && this.idleRequest === request
        ) {
          this.scheduleIdle();
        }
      });

      return true;
    } catch (error) {
      this.idleTimer = null;

      console.warn(
        '[MonologueManager] Failed to schedule idle monologue:',
        error
      );

      return false;
    }
  }

  cancelIdleTimer() {
    this.idleGeneration += 1;

    this.removeTimer(this.idleTimer);
    this.idleTimer = null;
  }

  stopIdle() {
    this.idleRequest = null;
    this.cancelIdleTimer();
  }

  destroy() {
    if (this.isDestroyed) return;

    this.stopIdle();

    this.removeTimer(this.currentTimer);
    this.currentTimer = null;

    this.killTweensForContainer();

    this.isDestroyed = true;
    this.isShowing = false;

    try {
      this.scene?.scale?.off('resize', this.handleResize, this);

      const events = this.scene?.events;
      const E = Phaser.Scenes.Events;

      events?.off(E.CREATE, this.handleSceneReady, this);
      events?.off(E.WAKE, this.handleSceneReady, this);
      events?.off(E.RESUME, this.handleSceneReady, this);

      events?.off(E.PAUSE, this.handleSceneInactive, this);
      events?.off(E.SLEEP, this.handleSceneInactive, this);

      events?.off(E.SHUTDOWN, this.destroy, this);
      events?.off(E.DESTROY, this.destroy, this);
    } catch (error) {
      console.warn(
        '[MonologueManager] Failed to remove listeners:',
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