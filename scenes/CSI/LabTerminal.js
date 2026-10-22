export const TERM = {
  green: '#46ff7a',
  dim: '#2c8a4b',
  amber: '#ffc857',
  red: '#ff5252',
  dark: '#0a0f0a'
};


export function award(scene, pts) {
  const score = scene.registry.get('score') ?? 0;
  scene.registry.set('score', score + pts);
}


export class LabTerminal {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.destroyed = false;

    const W = scene.scale.width;
    const H = scene.scale.height;

    this.w = opts.width ?? Math.min(920, W - 40);
    this.h = opts.height ?? Math.min(600, H - 40);
    this.x = Math.round((W - this.w) / 2);
    this.y = Math.round((H - this.h) / 2);

    this.maxLines = Math.max(1, opts.maxLines ?? 14);
    this.charDelay = opts.charDelay ?? 10;

    this.logLines = [];
    this.buttonRow = null;

    this._queue = Promise.resolve(true);
    this._btnX = 0;

    this._objects = new Set();
    this._tasks = new Set();
    this._voices = new Set();

    this._boundDestroy = () => this.destroy();

    scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this._boundDestroy
    );

    scene.events.once(
      Phaser.Scenes.Events.DESTROY,
      this._boundDestroy
    );

    this._buildChrome(
      opts.title ?? 'MARK AGENCY // FORENSICS TERMINAL'
    );

    this._buildScanlines();
  }


  _track(object) {
    this._objects.add(object);
    return object;
  }


  _buildChrome(title) {
    const s = this.scene;

    const graphics = this._track(s.add.graphics());

    graphics.fillStyle(0x000000, 0.8);
    graphics.fillRect(0, 0, s.scale.width, s.scale.height);

    graphics.fillStyle(0x050805, 1);
    graphics.fillRect(this.x, this.y, this.w, this.h);

    graphics.lineStyle(2, 0x1f3b26, 1);
    graphics.strokeRect(this.x, this.y, this.w, this.h);

    graphics.fillStyle(0x1f3b26, 1);
    graphics.fillRect(this.x, this.y, this.w, 34);

    this._track(
      s.add.text(this.x + 12, this.y + 9, title, {
        fontFamily: '"PressStart2P"',
        fontSize: '12px',
        color: TERM.green
      })
    );

    this.buttonRow = this._track(
      s.add.container(
        this.x + 16,
        this.y + this.h - 52
      )
    );
  }


  _buildScanlines() {
    const s = this.scene;

    if (!s.textures.exists('lab-scanlines')) {
      const texture = s.textures.createCanvas(
        'lab-scanlines',
        2,
        4
      );

      if (!texture) return;

      const context = texture.getContext();

      context.fillStyle = 'rgba(0,0,0,0.25)';
      context.fillRect(0, 3, 2, 1);
      texture.refresh();
    }

    this._track(
      s.add.tileSprite(
        this.x + this.w / 2,
        this.y + this.h / 2,
        this.w,
        this.h,
        'lab-scanlines'
      ).setAlpha(0.55)
    );
  }


  blip(
    freq = 520,
    dur = 0.05,
    type = 'square',
    vol = 0.04
  ) {
    if (this.destroyed) return;

    const context = this.scene?.sound?.context;

    if (
      !context ||
      context.state !== 'running' ||
      typeof context.createOscillator !== 'function'
    ) {
      return;
    }

    let voice = null;

    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      voice = { oscillator, gain };
      this._voices.add(voice);

      oscillator.type = type;
      oscillator.frequency.value = freq;

      gain.gain.setValueAtTime(
        Math.max(0.0001, vol),
        context.currentTime
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.onended = () => {
        this._releaseVoice(voice);
      };

      oscillator.start();

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + dur
      );

      oscillator.stop(context.currentTime + dur + 0.02);
    } catch {
      if (voice) this._releaseVoice(voice, true);
    }
  }


  _releaseVoice(voice, stop = false) {
    if (!voice) return;

    this._voices.delete(voice);
    voice.oscillator.onended = null;

    if (stop) {
      try {
        voice.oscillator.stop();
      } catch {
        // Oscylator mógł już się zatrzymać.
      }
    }

    voice.oscillator.disconnect();
    voice.gain.disconnect();
  }


  _enqueue(action) {
    if (this.destroyed) {
      return Promise.resolve(false);
    }

    this._queue = this._queue
      .then(() => {
        if (this.destroyed) return false;
        return action();
      })
      .catch(error => {
        if (!this.destroyed) {
          console.error('[LabTerminal] Operation failed:', error);
        }

        return false;
      });

    return this._queue;
  }


  _runTimedSteps(steps, delay, onStep) {
    if (this.destroyed) {
      return Promise.resolve(false);
    }

    return new Promise((resolve, reject) => {
      const task = {
        timer: null,
        settled: false,
        finish: null
      };

      task.finish = (completed, error = null) => {
        if (task.settled) return;

        task.settled = true;

        task.timer?.remove(false);
        task.timer = null;

        this._tasks.delete(task);

        if (error) {
          reject(error);
        } else {
          resolve(completed);
        }
      };

      this._tasks.add(task);

      let step = 0;

      try {
        task.timer = this.scene.time.addEvent({
          delay: Math.max(1, delay),
          repeat: steps - 1,
          callback: () => {
            if (this.destroyed) {
              task.finish(false);
              return;
            }

            try {
              step += 1;
              onStep(step);

              if (step >= steps) {
                task.finish(true);
              }
            } catch (error) {
              task.finish(false, error);
            }
          }
        });
      } catch (error) {
        task.finish(false, error);
      }
    });
  }


  _addLine(style) {
    if (this.destroyed) return null;

    const text = this._track(
      this.scene.add.text(this.x + 16, 0, '', {
        ...style,
        wordWrap: { width: this.w - 32 }
      })
    );

    this.logLines.push(text);

    while (this.logLines.length > this.maxLines) {
      const oldest = this.logLines.shift();

      this._objects.delete(oldest);
      oldest.destroy();
    }

    this._layout();

    return text;
  }


  print(text, opts = {}) {
    const content = String(text ?? '');
    const options = { ...opts };

    return this._enqueue(
      () => this._typeLine(content, options)
    );
  }


  _typeLine(text, opts) {
    if (this.destroyed) {
      return Promise.resolve(false);
    }

    const line = this._addLine({
      fontFamily: opts.fontFamily ?? '"SpecialElite"',
      fontSize: opts.fontSize ?? '18px',
      color: opts.color ?? TERM.green
    });

    if (!line) {
      return Promise.resolve(false);
    }

    if (!text.length) {
      return Promise.resolve(true);
    }

    const delay = opts.charDelay ?? this.charDelay;

    if (delay <= 0) {
      line.setText(text);
      this._layout();

      return Promise.resolve(true);
    }

    return this._runTimedSteps(
      text.length,
      delay,
      step => {
        if (!line.scene) return;

        line.setText(text.slice(0, step));

        if (step % 3 === 0) {
          this.blip(
            650 + Math.random() * 250,
            0.012,
            'square',
            0.01
          );
        }

        this._layout();
      }
    );
  }


  progress(label, ms = 1400) {
    const content = String(label ?? '');

    return this._enqueue(() => {
      const total = 24;

      const line = this._addLine({
        fontFamily: '"Courier New"',
        fontSize: '18px',
        color: TERM.dim
      });

      if (!line) return false;

      return this._runTimedSteps(
        total,
        ms / total,
        step => {
          if (!line.scene) return;

          const filled = '#'.repeat(step);
          const empty = '.'.repeat(total - step);
          const percent = Math.round((step / total) * 100);

          line.setText(
            `${content} [${filled}${empty}] ${percent}%`
          );

          this._layout();

          if (step === total) {
            this.blip(990, 0.08);
          }
        }
      );
    });
  }


  _layout() {
    if (this.destroyed) return;

    let y = this.y + 46;

    for (const line of this.logLines) {
      if (!line?.scene) continue;

      line.setY(y);
      y += line.height + 4;
    }
  }


  clearButtons() {
    this._btnX = 0;

    if (this.destroyed || !this.buttonRow?.scene) {
      return;
    }

    this.buttonRow.removeAll(true);
  }


  button(label, color, onClick) {
    if (this.destroyed || !this.buttonRow?.scene) {
      return null;
    }

    const button = this.scene.add.text(
      this._btnX,
      0,
      ` ${label} `,
      {
        fontFamily: '"PressStart2P"',
        fontSize: '12px',
        color: TERM.dark,
        backgroundColor: color,
        padding: { x: 8, y: 8 }
      }
    ).setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (!this.destroyed) {
        button.setBackgroundColor(TERM.amber);
      }
    });

    button.on('pointerout', () => {
      if (!this.destroyed) {
        button.setBackgroundColor(color);
      }
    });

    button.on('pointerdown', () => {
      if (this.destroyed) return;

      this.blip(880, 0.06);
      onClick();
    });

    this.buttonRow.add(button);
    this._btnX += button.width + 14;

    return button;
  }


  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    const scene = this.scene;

    scene?.events?.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this._boundDestroy
    );

    scene?.events?.off(
      Phaser.Scenes.Events.DESTROY,
      this._boundDestroy
    );

    for (const task of [...this._tasks]) {
      task.finish(false);
    }

    this._tasks.clear();

    for (const voice of [...this._voices]) {
      this._releaseVoice(voice, true);
    }

    this._voices.clear();

    for (const object of this._objects) {
      if (object?.scene) {
        object.destroy();
      }
    }

    this._objects.clear();

    this.logLines = [];
    this.buttonRow = null;
    this._btnX = 0;
    this._queue = Promise.resolve(false);
    this.scene = null;
  }
}