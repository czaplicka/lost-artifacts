import {
  dialogueManager
} from '../managers/DialogueManager.js';

import {
  TONES,
  TONE_ORDER,
  randomBlurb
} from '../managers/TrustManager.js';

const PRESS = 'PressStart2P';
const ELITE = 'SpecialElite';

const MAX_ROWS = 6;

const COL = {
  panel: 0x17110a,
  gold: 0xd4af37,
  goldDim: 0x7d6620,
  divider: 0x4a3c1c,
  btn: 0x2a2012,
  btnHover: 0x3d2f14,
  btnOff: 0x1b150c,
  segEmpty: 0x2c2314,
  goldS: '#d4af37',
  textLight: '#f3e7c4',
  textAsked: '#8d8062',
  textLocked: '#b0715f',
  textDim: '#6f664d',
  npc: '#f0c75e',
  player: '#9fd9a0',
  action: '#8fb3c9'
};

// Jeden modalny DialoguePanel na instancję gry.
const modalOwners = new WeakMap();

export class DialoguePanel {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.opts = {
      depth: 9000,
      modal: true,
      charDelay: 16,
      showTrustNumber: false,
      onBlip: null,
      manager: dialogueManager,
      ...options
    };

    this.m = this.opts.manager;

    this.session = null;
    this.isOpen = false;
    this.mode = 'closed';
    this.tab = 'topics';
    this.scroll = 0;
    this.onClose = null;

    this._entries = [];
    this._topics = [];
    this._evidence = [];
    this.lineQueue = [];

    this._current = null;
    this._full = '';
    this._idx = 0;
    this._typer = null;
    this._curKind = 'say';

    this._toastSet = new Set();
    this._tweens = new Set();
    this._arrowTween = null;
    this._fadeTween = null;

    this._destroyed = false;
    this._inputSnapshots = new Map();
    this._modalAcquired = false;

    this._computeLayout();
    this._build();
    this._bindInput();

    this.root.setVisible(false);

    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  get isTalking() {
    return this.isOpen;
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  talk(npcId, { onClose, tone } = {}) {
    if (this._destroyed || this.isOpen) return false;

    const owner = modalOwners.get(this.scene.game);

    if (this.opts.modal && owner && owner !== this) {
      return false;
    }

    const session = this.m.createSession(npcId);

    if (!session) return false;

    this._resetConversationView();

    this.session = session;
    this.onClose = onClose || null;

    if (tone) session.setTone(tone);

    const def = session.def;

    this.isOpen = true;
    this.tab = 'topics';
    this.scroll = 0;

    this.nameText.setText(String(def.name || '').toUpperCase());

    this._fitWidth(
      this.nameText,
      this.L.lw - 210 * this.L.s,
      14 * this.L.s,
      8 * this.L.s
    );

    this.roleText.setText(def.role || '');

    const showTrust = def.showTrust !== false;
    const useTones = def.useTones !== false;

    this.meterObjs.forEach(obj => obj.setVisible(showTrust));

    this.numText.setVisible(
      showTrust && this.opts.showTrustNumber
    );

    this.toneObjs.forEach(obj => obj.setVisible(useTones));

    this._setTabsVisible(false);
    this._updateTrust();
    this._show();
    this._applyResult(session.start());

    return true;
  }

  talkOnce(name, lines, opts = {}) {
    if (this._destroyed || this.isOpen) return false;

    const owner = modalOwners.get(this.scene.game);

    if (this.opts.modal && owner && owner !== this) {
      return false;
    }

    const id = '__once__';

    this.m.registerNpc({
      id,
      name,
      role: opts.role || '',
      showTrust: false,
      useTones: false,
      evidenceTab: false,
      topics: [],
      greeting: [{ say: lines, end: true }]
    });

    this.m.resetNpc(id);

    return this.talk(id, opts);
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;
    this.isOpen = false;
    this.mode = 'closed';

    this._cancelTyper();
    this._releaseModal();

    const sc = this.scene;

    sc.input?.keyboard?.off('keydown', this._onKey);
    sc.input?.off('wheel', this._onWheel);

    sc.events.off('shutdown', this.destroy, this);
    sc.events.off('destroy', this.destroy, this);

    for (const tween of [...this._tweens]) {
      this._removeTween(tween);
    }

    this._arrowTween = null;
    this._fadeTween = null;

    for (const toast of this._toastSet) {
      if (toast.scene) toast.destroy();
    }

    this._toastSet.clear();

    if (this.root?.scene) this.root.destroy(true);
    if (this.blocker?.scene) this.blocker.destroy();

    this.root = null;
    this.blocker = null;
    this.session = null;
    this.onClose = null;
    this.lineQueue = [];
  }

  // ------------------------------------------------------------------
  // Tweens
  // ------------------------------------------------------------------

  _addTween(config) {
    if (this._destroyed) return null;

    const tween = typeof this.scene.createTrackedTween === 'function'
      ? this.scene.createTrackedTween(config)
      : this.scene.tweens.add(config);

    if (!tween) return null;

    this._tweens.add(tween);

    const forget = () => {
      this._tweens.delete(tween);
    };

    tween.once?.('complete', forget);
    tween.once?.('stop', forget);
    tween.once?.('remove', forget);

    return tween;
  }

  _removeTween(tween) {
    if (!tween) return;

    this._tweens.delete(tween);

    try {
      if (typeof this.scene.removeTrackedTween === 'function') {
        this.scene.removeTrackedTween(tween);
        return;
      }

      if (tween.parent == null) return;

      if (
        typeof tween.isDestroyed === 'function' &&
        tween.isDestroyed()
      ) {
        return;
      }

      tween.stop?.();

      if (tween.parent != null) {
        tween.remove?.();
      }
    } catch (error) {
      console.warn('[DialoguePanel] Tween cleanup failed:', error);
    }
  }

  // ------------------------------------------------------------------
  // Modal input
  // ------------------------------------------------------------------

  _acquireModal() {
    if (!this.opts.modal || this._modalAcquired) return;

    const game = this.scene.game;

    modalOwners.set(game, this);
    this._modalAcquired = true;

    this.scene.input?.keyboard?.resetKeys?.();

    this._lockOtherSceneInputs();

    this._onModalStep = () => this._lockOtherSceneInputs();

    game.events.on('prestep', this._onModalStep);

    // Capture przed listenerami Phaser i skrótami HUD-u.
    this._onModalKeyDown = ev => {
      if (!this.isOpen || this._destroyed) return;

      ev.preventDefault();
      ev.stopImmediatePropagation();

      this._handleKey(ev);
    };

    this._onModalKeyUp = ev => {
      if (!this.isOpen || this._destroyed) return;

      ev.preventDefault();
      ev.stopImmediatePropagation();
    };

    window.addEventListener(
      'keydown',
      this._onModalKeyDown,
      true
    );

    window.addEventListener(
      'keyup',
      this._onModalKeyUp,
      true
    );
  }

  _lockOtherSceneInputs() {
    if (!this._modalAcquired || this._destroyed) return;

    const scenes = this.scene.game.scene.scenes || [];

    for (const other of scenes) {
      if (other === this.scene || !other.input) continue;

      const input = other.input;
      const keyboard = input.keyboard;

      let saved = this._inputSnapshots.get(other);

      // Po restarcie scena może mieć nową instancję pluginu.
      if (!saved || saved.input !== input) {
        saved = {
          input,
          enabled: input.enabled,
          keyboard,
          keyboardEnabled: keyboard?.enabled
        };

        this._inputSnapshots.set(other, saved);

        keyboard?.resetKeys?.();
      } else if (saved.keyboard !== keyboard) {
        saved.keyboard = keyboard;
        saved.keyboardEnabled = keyboard?.enabled;

        keyboard?.resetKeys?.();
      }

      input.enabled = false;

      if (keyboard) keyboard.enabled = false;
    }
  }

  _releaseModal() {
    if (!this._modalAcquired) return;

    this._modalAcquired = false;

    const game = this.scene.game;

    game.events.off('prestep', this._onModalStep);

    window.removeEventListener(
      'keydown',
      this._onModalKeyDown,
      true
    );

    window.removeEventListener(
      'keyup',
      this._onModalKeyUp,
      true
    );

    if (modalOwners.get(game) === this) {
      modalOwners.delete(game);
    }

    for (const [other, saved] of this._inputSnapshots) {
      if (other.input !== saved.input) continue;

      saved.input.enabled = saved.enabled;

      if (
        saved.keyboard &&
        saved.input.keyboard === saved.keyboard
      ) {
        saved.keyboard.resetKeys?.();
        saved.keyboard.enabled = saved.keyboardEnabled;
      }
    }

    this._inputSnapshots.clear();
    this.scene.input?.keyboard?.resetKeys?.();

    this._onModalStep = null;
    this._onModalKeyDown = null;
    this._onModalKeyUp = null;
  }

  // ------------------------------------------------------------------
  // Layout / build
  // ------------------------------------------------------------------

  _computeLayout() {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const s = H / 720;
    const margin = 14 * s;
    const pw = W - 2 * margin;
    const ph = 300 * s;
    const px = margin;
    const py = H - margin - ph;
    const leftW = Math.floor(pw * 0.6);

    this.L = {
      W, H, s, px, py, pw, ph, leftW,
      lx: px + 20 * s,
      lw: leftW - 40 * s,
      rx: px + leftW + 16 * s,
      rw: pw - leftW - 32 * s,
      listY: py + 50 * s,
      rowH: 30 * s,
      bodyY: py + 88 * s,
      bodyH: ph - 158 * s
    };
  }

  _txt(x, y, text, font, size, color, extra = {}) {
    const obj = this.scene.add.text(x, y, text, {
      fontFamily: font,
      fontSize: `${size}px`,
      color,
      ...extra
    }).setResolution(2);

    this.root.add(obj);

    return obj;
  }

  _fitWidth(text, maxWidth, base, min) {
    let size = base;

    text.setFontSize(size);

    while (text.width > maxWidth && size > min) {
      size -= 1;
      text.setFontSize(size);
    }
  }

  _tap(obj, callback) {
    obj.on('pointerdown', (pointer, lx, ly, event) => {
      if (!this.isOpen || this._destroyed) return;

      event?.stopPropagation?.();
      callback();
    });
  }

  _build() {
    const sc = this.scene;
    const L = this.L;
    const s = L.s;
    const depth = this.opts.depth;

    if (this.opts.modal) {
      this.blocker = sc.add.zone(0, 0, L.W, L.H)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(depth - 1)
        .setInteractive();

      this.blocker.input.enabled = false;
      this._tap(this.blocker, () => this._advance());
    }

    this.root = sc.add.container(0, 0)
      .setDepth(depth)
      .setScrollFactor(0);

    const frame = sc.add.graphics();

    frame.fillStyle(COL.panel, 0.97);
    frame.fillRect(L.px, L.py, L.pw, L.ph);

    frame.lineStyle(Math.max(2, 3 * s), COL.gold, 1);
    frame.strokeRect(L.px, L.py, L.pw, L.ph);

    frame.lineStyle(1, COL.goldDim, 1);
    frame.strokeRect(
      L.px + 6 * s,
      L.py + 6 * s,
      L.pw - 12 * s,
      L.ph - 12 * s
    );

    frame.lineStyle(2, COL.divider, 1);

    frame.lineBetween(
      L.px + L.leftW,
      L.py + 16 * s,
      L.px + L.leftW,
      L.py + L.ph - 16 * s
    );

    frame.lineBetween(
      L.lx,
      L.py + 60 * s,
      L.lx + L.lw,
      L.py + 60 * s
    );

    frame.fillStyle(COL.gold, 1);

    [
      [L.px, L.py],
      [L.px + L.pw, L.py],
      [L.px, L.py + L.ph],
      [L.px + L.pw, L.py + L.ph]
    ].forEach(([x, y]) => {
      frame.fillRect(x - 4 * s, y - 4 * s, 8 * s, 8 * s);
    });

    this.root.add(frame);

    this.nameText = this._txt(
      L.lx, L.py + 16 * s, '', PRESS, 14 * s, COL.goldS
    );

    this.roleText = this._txt(
      L.lx, L.py + 38 * s, '', ELITE, 14 * s, COL.textAsked
    );

    const mx = L.lx + L.lw - 190 * s;

    this.meterObjs = [
      this._txt(
        mx, L.py + 16 * s,
        'TRUST', PRESS, 8 * s, COL.textAsked
      )
    ];

    this.segs = [];

    for (let i = 0; i < 10; i++) {
      const segment = sc.add.rectangle(
        mx + i * 18 * s,
        L.py + 30 * s,
        15 * s,
        12 * s,
        COL.segEmpty
      )
        .setOrigin(0)
        .setStrokeStyle(1, COL.divider);

      this.root.add(segment);
      this.segs.push(segment);
      this.meterObjs.push(segment);
    }

    this.levelText = this._txt(
      mx, L.py + 46 * s, '', PRESS, 8 * s, COL.goldS
    );

    this.meterObjs.push(this.levelText);

    this.numText = this._txt(
      mx + 177 * s,
      L.py + 16 * s,
      '',
      PRESS,
      8 * s,
      COL.textAsked
    ).setOrigin(1, 0);

    this.speakerText = this._txt(
      L.lx, L.py + 68 * s, '', PRESS, 9 * s, COL.npc
    );

    this.body = this._txt(
      L.lx, L.bodyY, '', ELITE, 19 * s, COL.textLight,
      {
        wordWrap: {
          width: L.lw,
          useAdvancedWrap: true
        },
        lineSpacing: 5 * s
      }
    );

    this.textHit = sc.add.rectangle(
      L.lx,
      L.py + 62 * s,
      L.lw,
      L.bodyH + 26 * s,
      0x000000,
      0
    )
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    this._tap(this.textHit, () => this._advance());
    this.root.add(this.textHit);

    this.contArrow = sc.add.graphics();

    this.contArrow.fillStyle(COL.gold, 1);
    this.contArrow.fillTriangle(
      0, 0, 14 * s, 0, 7 * s, 9 * s
    );

    this.contArrow.setPosition(
      L.lx + L.lw - 18 * s,
      L.py + L.ph - 84 * s
    ).setVisible(false);

    this.root.add(this.contArrow);

    this._arrowTween = this._addTween({
      targets: this.contArrow,
      y: this.contArrow.y + 4 * s,
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    const toneY = L.py + L.ph - 66 * s;

    this.toneObjs = [
      this._txt(
        L.lx, toneY + 8 * s,
        'TONE', PRESS, 8 * s, COL.textAsked
      )
    ];

    const tx = L.lx + 56 * s;
    const gap = 6 * s;
    const tw = (L.lw - 56 * s - gap * 3) / 4;

    this.toneBtns = TONE_ORDER.map((id, i) => {
      const button = this._btn(
        tx + i * (tw + gap),
        toneY,
        tw,
        24 * s,
        TONES[id].label,
        8 * s,
        () => {
          if (this.mode !== 'topics' || !this.session) return;

          this.session.setTone(id);
          this._refreshTones();
        },
        () => this._setHint(TONES[id].hint),
        () => this._setHint(
          this.session ? TONES[this.session.tone].hint : ''
        )
      );

      this.toneObjs.push(button.rect, button.text);

      return button;
    });

    this.toneHint = this._txt(
      L.lx,
      L.py + L.ph - 34 * s,
      '',
      ELITE,
      13 * s,
      COL.textAsked
    );

    this.toneObjs.push(this.toneHint);

    const tabWidth = (L.rw - 8 * s) / 2;

    this.tabBtns = {
      topics: this._btn(
        L.rx,
        L.py + 14 * s,
        tabWidth,
        26 * s,
        'TOPICS',
        8 * s,
        () => this._setTab('topics')
      ),
      evidence: this._btn(
        L.rx + tabWidth + 8 * s,
        L.py + 14 * s,
        tabWidth,
        26 * s,
        'EVIDENCE',
        8 * s,
        () => this._setTab('evidence')
      )
    };

    this.choiceTitle = this._txt(
      L.rx,
      L.py + 20 * s,
      'YOUR REPLY:',
      PRESS,
      9 * s,
      COL.goldS
    ).setVisible(false);

    this.rows = [];

    for (let i = 0; i < MAX_ROWS; i++) {
      const y = L.listY + i * L.rowH;
      const h = L.rowH - 4 * s;

      const bg = sc.add.rectangle(
        L.rx, y, L.rw - 22 * s, h, COL.gold, 0
      )
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });

      this.root.add(bg);

      const num = this._txt(
        L.rx + 8 * s,
        y + h / 2,
        '',
        PRESS,
        9 * s,
        COL.goldS
      ).setOrigin(0, 0.5);

      const label = this._txt(
        L.rx + 34 * s,
        y + h / 2,
        '',
        ELITE,
        16 * s,
        COL.textLight
      ).setOrigin(0, 0.5);

      bg.on('pointerover', () => {
        const entry = this._entries[this.scroll + i];

        if (
          this.isOpen &&
          entry &&
          !entry.disabled &&
          this._listActive()
        ) {
          bg.setFillStyle(COL.gold, 0.18);
        }
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(COL.gold, 0);
      });

      this._tap(bg, () => this._pickIndex(this.scroll + i));

      this.rows.push({ bg, num, label });
    }

    const arrowX = L.rx + L.rw - 18 * s;

    this.arrowUp = this._arrow(
      arrowX,
      L.listY,
      true,
      () => this._scrollBy(-1)
    );

    this.arrowDown = this._arrow(
      arrowX,
      L.listY + MAX_ROWS * L.rowH - 22 * s,
      false,
      () => this._scrollBy(1)
    );

    this.byeBtn = this._btn(
      L.rx,
      L.py + L.ph - 50 * s,
      L.rw,
      32 * s,
      '0   GOODBYE',
      9 * s,
      () => this._goodbye()
    );
  }

  _btn(x, y, w, h, label, size, onClick, onOver, onOut) {
    const rect = this.scene.add.rectangle(
      x, y, w, h, COL.btn
    )
      .setOrigin(0)
      .setStrokeStyle(2, COL.goldDim)
      .setInteractive({ useHandCursor: true });

    this.root.add(rect);

    const text = this._txt(
      x + w / 2,
      y + h / 2,
      label,
      PRESS,
      size,
      COL.goldS
    ).setOrigin(0.5);

    const button = {
      rect,
      text,
      state: 'normal',
      hover: false
    };

    rect.on('pointerover', () => {
      button.hover = true;
      this._styleBtn(button);
      onOver?.();
    });

    rect.on('pointerout', () => {
      button.hover = false;
      this._styleBtn(button);
      onOut?.();
    });

    this._tap(rect, () => {
      if (button.state !== 'disabled') onClick?.();
    });

    return button;
  }

  _styleBtn(button) {
    const { rect, text, state, hover } = button;

    if (state === 'selected') {
      rect.setFillStyle(COL.gold)
        .setStrokeStyle(2, COL.gold);

      text.setColor('#1a1208');
    } else if (state === 'disabled') {
      rect.setFillStyle(COL.btnOff)
        .setStrokeStyle(2, 0x3a2f18);

      text.setColor(COL.textDim);
    } else {
      rect.setFillStyle(hover ? COL.btnHover : COL.btn)
        .setStrokeStyle(2, hover ? COL.gold : COL.goldDim);

      text.setColor(COL.goldS);
    }
  }

  _arrow(x, y, up, callback) {
    const s = this.L.s;

    const hit = this.scene.add.rectangle(
      x, y, 18 * s, 18 * s, COL.btn
    )
      .setOrigin(0)
      .setStrokeStyle(1, COL.goldDim)
      .setInteractive({ useHandCursor: true });

    const graphics = this.scene.add.graphics();

    graphics.fillStyle(COL.gold, 1);

    if (up) {
      graphics.fillTriangle(
        x + 9 * s, y + 5 * s,
        x + 4 * s, y + 13 * s,
        x + 14 * s, y + 13 * s
      );
    } else {
      graphics.fillTriangle(
        x + 4 * s, y + 5 * s,
        x + 14 * s, y + 5 * s,
        x + 9 * s, y + 13 * s
      );
    }

    this._tap(hit, callback);
    this.root.add([hit, graphics]);

    return {
      show(visible) {
        hit.setVisible(visible);
        graphics.setVisible(visible);
      }
    };
  }

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------

  _bindInput() {
    this._onKey = ev => {
      if (!this._modalAcquired) this._handleKey(ev);
    };

    this._onWheel = (pointer, over, dx, dy) => {
      this._handleWheel(pointer, dy);
    };

    this.scene.input.keyboard?.on('keydown', this._onKey);
    this.scene.input.on('wheel', this._onWheel);
  }

  _handleKey(ev) {
    if (!this.isOpen || this._destroyed) return;

    const key = ev.key;

    const handled =
      key === ' ' ||
      key === 'Enter' ||
      key === 'Tab' ||
      key.startsWith('Arrow') ||
      /^[0-9]$/.test(key);

    if (!handled) return;

    ev.preventDefault?.();

    if (ev.repeat) return;

    if (key === ' ' || key === 'Enter') {
      this._advance();
    } else if (key === 'Tab') {
      this._cycleTone();
    } else if (key === '0') {
      this._goodbye();
    } else if (/^[1-9]$/.test(key)) {
      this._pickIndex(Number(key) - 1);
    } else if (key === 'ArrowDown') {
      this._scrollBy(1);
    } else if (key === 'ArrowUp') {
      this._scrollBy(-1);
    } else if (
      key === 'ArrowLeft' ||
      key === 'ArrowRight'
    ) {
      if (this.mode === 'topics') {
        this._setTab(
          this.tab === 'topics' ? 'evidence' : 'topics'
        );
      }
    }
  }

  _handleWheel(pointer, dy) {
    if (!this.isOpen || !this._listActive()) return;

    const L = this.L;

    const inside =
      pointer.x >= L.rx &&
      pointer.x <= L.rx + L.rw &&
      pointer.y >= L.listY &&
      pointer.y <= L.listY + MAX_ROWS * L.rowH;

    if (inside && dy !== 0) {
      this._scrollBy(dy > 0 ? 1 : -1);
    }
  }

  _listActive() {
    return this.mode === 'topics' || this.mode === 'choices';
  }

  _advance() {
    if (!this.isOpen) return;

    if (this.mode === 'typing') this._finishTyping();
    else if (this.mode === 'waiting') this._nextLine();
    else if (this.mode === 'endwait') this._close();
  }

  _cycleTone() {
    if (
      this.mode !== 'topics' ||
      !this.session ||
      this.session.def.useTones === false
    ) {
      return;
    }

    const tones = this.session.getTones()
      .filter(tone => tone.enabled);

    if (!tones.length) return;

    const index = tones.findIndex(
      tone => tone.id === this.session.tone
    );

    this.session.setTone(
      tones[(index + 1) % tones.length].id
    );

    this._refreshTones();
  }

  // ------------------------------------------------------------------
  // Flow / typewriter
  // ------------------------------------------------------------------

  _resetConversationView() {
    this._cancelTyper();

    for (const toast of this._toastSet) {
      if (toast.scene) {
        this.scene.killTrackedTweensOf?.(toast);
        this.scene.tweens?.killTweensOf?.(toast);
        toast.destroy();
      }
    }

    this._toastSet.clear();

    this.mode = 'busy';
    this._current = null;
    this._full = '';
    this._idx = 0;
    this._entries = [];
    this._topics = [];
    this._evidence = [];
    this.lineQueue = [];

    this.body.setText('');
    this.speakerText.setText('');
    this.choiceTitle.setText('YOUR REPLY:').setVisible(false);
    this.contArrow.setVisible(false);
    this.toneHint.setText('');

    this.rows.forEach(row => {
      row.bg.setVisible(false);
      row.num.setText('').setVisible(false);
      row.label.setText('').setVisible(false);
    });

    this.arrowUp.show(false);
    this.arrowDown.show(false);
  }

  _show() {
    this._removeTween(this._fadeTween);
    this._fadeTween = null;

    this._acquireModal();

    this.root.setVisible(true).setAlpha(0);
    this.root.y = 24 * this.L.s;

    if (this.blocker?.input) {
      this.blocker.input.enabled = true;
    }

    this._fadeTween = this._addTween({
      targets: this.root,
      alpha: 1,
      y: 0,
      duration: 160
    });
  }

  _hide() {
    if (this.blocker?.input) {
      this.blocker.input.enabled = false;
    }

    this._removeTween(this._fadeTween);
    this._fadeTween = null;

    this._releaseModal();

    if (this._destroyed || !this.root?.scene) return;

    this._fadeTween = this._addTween({
      targets: this.root,
      alpha: 0,
      duration: 140,
      onComplete: () => {
        if (!this._destroyed && !this.isOpen) {
          this.root.setVisible(false);
        }
      }
    });
  }

  _applyResult(result) {
    this._current = result;
    this.lineQueue = result.lines.slice();

    this._setMode('busy');
    this._updateTrust();
    this._showToasts(result);
    this._nextLine();
  }

  _nextLine() {
    if (!this.lineQueue.length) {
      this._afterLines();
      return;
    }

    this._showLine(this.lineQueue.shift());
  }

  _showLine(line) {
    this._curKind = line.kind;

    this.speakerText.setText(line.who || '');

    this.speakerText.setColor(
      line.kind === 'player' ? COL.player : COL.npc
    );

    this.body.setColor(
      line.kind === 'action' ? COL.action : COL.textLight
    );

    this._full = this._fit(line.text || '');
    this._idx = 0;

    this.body.setText('');
    this.contArrow.setVisible(false);

    this._setMode('typing');
    this._cancelTyper();
    this._tick();
  }

  _tick() {
    if (this._destroyed || this.mode !== 'typing') return;

    if (this._idx >= this._full.length) {
      this._finishTyping();
      return;
    }

    const char = this._full[this._idx++];

    this.body.setText(
      this._full.slice(0, this._idx)
    );

    if (
      this.opts.onBlip &&
      char.trim() &&
      this._idx % 3 === 0
    ) {
      this.opts.onBlip(this._curKind);
    }

    if (this._idx >= this._full.length) {
      this._finishTyping();
      return;
    }

    const next = this._full[this._idx];
    const boundary = next == null || /\s/.test(next);

    const pause = boundary
      ? /[.!?]/.test(char)
        ? 8
        : /[,;:]/.test(char)
          ? 4
          : 1
      : 1;

    this._typer = this.scene.time.delayedCall(
      this.opts.charDelay * pause,
      () => {
        this._typer = null;
        this._tick();
      }
    );
  }

  _finishTyping() {
    this._cancelTyper();
    this.body.setText(this._full);

    if (this.lineQueue.length > 0) {
      this._setMode('waiting');
      this.contArrow.setVisible(true);
    } else {
      this._afterLines();
    }
  }

  _cancelTyper() {
    if (!this._typer) return;

    this._typer.remove(false);
    this._typer = null;
  }

  _afterLines() {
    const result = this._current;

    this.contArrow.setVisible(false);

    if (result?.end) {
      if (!result.lines.length) {
        this._close();
      } else {
        this._setMode('endwait');
        this.contArrow.setVisible(true);
      }

      return;
    }

    if (result?.choices?.length) {
      this._showChoices(result.choices);
      return;
    }

    this._showTopics();
  }

  _close() {
    if (!this.isOpen || !this.session) return;

    const endedBy = this._current?.endedBy || 'goodbye';
    const summary = this.session.close(endedBy);

    this.isOpen = false;
    this._setMode('closed');
    this._cancelTyper();
    this.contArrow.setVisible(false);
    this._hide();

    const callback = this.onClose;

    this.onClose = null;
    this.session = null;

    callback?.(summary);
  }

  _goodbye() {
    if (!this.isOpen || this.mode !== 'topics') return;

    this._applyResult(this.session.leave());
  }

  // ------------------------------------------------------------------
  // Topics / evidence / choices
  // ------------------------------------------------------------------

  _setMode(mode) {
    this.mode = mode;

    if (this.session) {
      this._refreshTones();
      this._refreshBye();
    }

    this._applyListAlpha();
  }

  _showTopics() {
    this._setMode('topics');

    this._topics = this.session.getTopics();
    this._evidence = this.session.getEvidence();

    this.choiceTitle.setVisible(false);
    this._setTabsVisible(true);
    this._refreshTabs();
    this._renderTab();
  }

  _showChoices(labels) {
    this._setMode('choices');
    this._setTabsVisible(false);

    this.choiceTitle.setText('YOUR REPLY:').setVisible(true);
    this.scroll = 0;

    this._setEntries(
      labels.map(label => ({ label, style: 'new' }))
    );
  }

  _setTabsVisible(visible) {
    const evidenceAllowed =
      this.session?.def.evidenceTab !== false;

    this.tabBtns.topics.rect.setVisible(visible);
    this.tabBtns.topics.text.setVisible(visible);

    this.tabBtns.evidence.rect.setVisible(
      visible && evidenceAllowed
    );

    this.tabBtns.evidence.text.setVisible(
      visible && evidenceAllowed
    );
  }

  _setTab(tab) {
    if (this.mode !== 'topics') return;

    if (
      tab === 'evidence' &&
      this.session?.def.evidenceTab === false
    ) {
      return;
    }

    this.tab = tab;
    this.scroll = 0;

    this._refreshTabs();
    this._renderTab();
  }

  _refreshTabs() {
    this.tabBtns.evidence.text.setText(
      `EVIDENCE (${this._evidence.length})`
    );

    this.tabBtns.topics.state =
      this.tab === 'topics' ? 'selected' : 'normal';

    this.tabBtns.evidence.state =
      this.tab === 'evidence' ? 'selected' : 'normal';

    this._styleBtn(this.tabBtns.topics);
    this._styleBtn(this.tabBtns.evidence);
  }

  _renderTab() {
    let entries;

    if (this.tab === 'topics') {
      entries = this._topics.map(topic => ({
        label: topic.label,
        style: topic.locked
          ? 'locked'
          : topic.asked
            ? 'asked'
            : 'new',
        suffix: topic.locked ? '  [needs trust]' : ''
      }));

      if (!entries.length) {
        entries = [{
          label: 'Nothing left to ask. Awkward silence.',
          style: 'dim',
          disabled: true
        }];
      }
    } else {
      entries = this._evidence.map(evidence => ({
        label: evidence.label,
        style: evidence.presented ? 'asked' : 'new'
      }));

      if (!entries.length) {
        entries = [{
          label: 'Your pockets are empty. Go find evidence.',
          style: 'dim',
          disabled: true
        }];
      }
    }

    this._setEntries(entries);
  }

  _setEntries(entries) {
    this._entries = entries;

    this.scroll = Math.max(
      0,
      Math.min(this.scroll, entries.length - MAX_ROWS)
    );

    this._drawRows();
  }

  _scrollBy(delta) {
    if (!this._listActive()) return;

    const max = Math.max(
      0,
      this._entries.length - MAX_ROWS
    );

    const next = Math.max(
      0,
      Math.min(max, this.scroll + delta)
    );

    if (next === this.scroll) return;

    this.scroll = next;
    this._drawRows();
  }

  _drawRows() {
    const s = this.L.s;
    const maxWidth = this.L.rw - 66 * s;

    const colors = {
      new: COL.textLight,
      asked: COL.textAsked,
      locked: COL.textLocked,
      dim: COL.textDim
    };

    this.rows.forEach((row, index) => {
      const entryIndex = this.scroll + index;
      const entry = this._entries[entryIndex];
      const visible = Boolean(entry);

      row.bg.setVisible(visible);
      row.num.setVisible(visible);
      row.label.setVisible(visible);

      if (!entry) return;

      row.bg.setFillStyle(COL.gold, 0);

      row.label
        .setText(entry.label + (entry.suffix || ''))
        .setColor(colors[entry.style] || COL.textLight);

      this._fitWidth(
        row.label,
        maxWidth,
        16 * s,
        11 * s
      );

      row.num.setText(
        entryIndex < 9 && !entry.disabled
          ? String(entryIndex + 1)
          : ''
      );

      row.num.setColor(
        entry.style === 'new' ? COL.goldS : COL.textDim
      );
    });

    this.arrowUp.show(this.scroll > 0);

    this.arrowDown.show(
      this.scroll + MAX_ROWS < this._entries.length
    );

    this._applyListAlpha();
  }

  _applyListAlpha() {
    const alpha = this._listActive() ? 1 : 0.4;

    this.rows.forEach(row => {
      row.num.setAlpha(alpha);
      row.label.setAlpha(alpha);
    });

    for (const key of ['topics', 'evidence']) {
      this.tabBtns[key].rect.setAlpha(alpha);
      this.tabBtns[key].text.setAlpha(alpha);
    }

    this.choiceTitle.setAlpha(alpha);
  }

  _pickIndex(index) {
    if (
      !this.isOpen ||
      !this.session ||
      !this._listActive()
    ) {
      return;
    }

    const entry = this._entries[index];

    if (!entry || entry.disabled) return;

    if (this.mode === 'choices') {
      this._applyResult(this.session.choose(index));
    } else if (this.tab === 'topics') {
      const topic = this._topics[index];

      if (topic) {
        this._applyResult(this.session.ask(topic.id));
      }
    } else {
      const evidence = this._evidence[index];

      if (evidence) {
        this._applyResult(this.session.present(evidence.id));
      }
    }
  }

  // ------------------------------------------------------------------
  // Tone / trust
  // ------------------------------------------------------------------

  _refreshTones() {
    if (!this.session) return;

    const enabled = this.mode === 'topics';
    const tones = this.session.getTones();

    const current = tones.find(
      tone => tone.id === this.session.tone
    );

    if (!current || !current.enabled) {
      this.session.setTone('polite');
    }

    tones.forEach((tone, index) => {
      const button = this.toneBtns[index];

      if (!button) return;

      button.text.setText(
        tone.id === 'bribe'
          ? `BRIBE $${tone.cost}`
          : tone.label
      );

      button.state = !tone.enabled
        ? 'disabled'
        : this.session.tone === tone.id
          ? 'selected'
          : 'normal';

      this._styleBtn(button);

      button.rect.setAlpha(enabled ? 1 : 0.5);
      button.text.setAlpha(enabled ? 1 : 0.5);
    });

    this._setHint(
      TONES[this.session.tone]?.hint || ''
    );
  }

  _setHint(text) {
    this.toneHint.setText(text || '');
  }

  _refreshBye() {
    this.byeBtn.state =
      this.mode === 'topics' ? 'normal' : 'disabled';

    this._styleBtn(this.byeBtn);
  }

  _updateTrust() {
    if (!this.session) return;

    const trust = this.session.getTrust();
    const filled = Math.round(trust.value / 10);

    this.segs.forEach((segment, index) => {
      segment.setFillStyle(
        index < filled ? trust.level.color : COL.segEmpty
      );
    });

    this.levelText
      .setText(trust.level.label)
      .setColor(trust.level.hex);

    this.numText.setText(String(trust.value));
  }

  _showToasts(result) {
    if (!this.session) return;

    const showTrust = this.session.def.showTrust !== false;
    let slot = 0;

    if (result.spent) {
      this._toast(`-$${result.spent}`, '#e8c25a', slot++);
    }

    const trust = result.trust;

    if (showTrust && trust && trust.delta !== 0) {
      this._toast(
        `TRUST ${trust.delta > 0 ? '+' : ''}${trust.delta}`,
        trust.delta > 0 ? '#8fcb68' : '#e0604f',
        slot++
      );

      if (trust.levelChanged) {
        this._toast(
          `${this.session.def.name.toUpperCase()} IS NOW ${trust.level.label}`,
          trust.level.hex,
          slot++
        );

        this._toast(
          randomBlurb(trust.level),
          trust.level.hex,
          slot++,
          ELITE,
          14
        );
      }
    }

    for (const label of result.gained || []) {
      this._toast(`GOT: ${label}`, '#9fd0ff', slot++);
    }
  }

  _toast(text, color, slot, font = PRESS, size = 9) {
    const L = this.L;
    const s = L.s;

    const toast = this.scene.add.text(
      L.lx,
      L.py - (14 + slot * 24) * s,
      text,
      {
        fontFamily: font,
        fontSize: `${size * s}px`,
        color,
        stroke: '#000000',
        strokeThickness: 4 * s
      }
    )
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(this.opts.depth + 2)
      .setResolution(2);

    this._toastSet.add(toast);

    this._addTween({
      targets: toast,
      y: toast.y - 16 * s,
      alpha: 0,
      delay: 1700,
      duration: 700,
      onComplete: () => {
        this._toastSet.delete(toast);

        if (toast.scene) toast.destroy();
      }
    });
  }

  // ------------------------------------------------------------------
  // Text fitting
  // ------------------------------------------------------------------

  _fit(text) {
    const s = this.L.s;
    let size = 19 * s;
    const min = 13 * s;
    let wrapped = String(text);

    for (;;) {
      this.body.setFontSize(size);
      this.body.setLineSpacing(5 * s);

      wrapped = this.body
        .getWrappedText(String(text))
        .join('\n');

      const lineCount = wrapped.split('\n').length;

      if (
        lineCount * (size * 1.25 + 5 * s) <= this.L.bodyH ||
        size <= min
      ) {
        break;
      }

      size -= 1;
    }

    return wrapped;
  }
}