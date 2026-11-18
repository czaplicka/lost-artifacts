// ui/DialoguePanel.js
// Reusable dialogue panel for ANY scene. No portraits: nameplate + trust meter + typewriter text.
//
// Usage in a scene:
//   import { DialoguePanel } from '../ui/DialoguePanel.js';
//   create() {
//     super.create();
//     this.dialogue = new DialoguePanel(this);                 // once per scene
//     ...
//     this.dialogue.talk('curator_pemberton', { onClose: (summary) => { ... } });
//   }
// While this.dialogue.isOpen is true, block your own clicks / hotkeys in the scene.
//
// Keys: SPACE/ENTER = continue | 1-9 = pick row | 0 = goodbye | TAB = next tone
//       LEFT/RIGHT = switch TOPICS/EVIDENCE | UP/DOWN or mouse wheel = scroll list
// Fonts "Press Start 2P" and "Special Elite" must be loaded before the panel is created.

import { dialogueManager } from '../managers/DialogueManager.js';
import { TONES, TONE_ORDER, randomBlurb } from '../managers/TrustManager.js';

const PRESS = '"Press Start 2P", monospace';
const ELITE = '"Special Elite", "Courier New", monospace';

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
  action: '#8fb3c9',
};

const MAX_ROWS = 6;

export class DialoguePanel {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.opts = {
      depth: 9000,
      modal: true,            // swallow clicks on the scene underneath while open
      charDelay: 16,          // ms per character
      showTrustNumber: false, // debug: show the raw trust value
      onBlip: null,           // (kind) => play typing sound
      manager: dialogueManager,
      ...options,
    };
    this.m = this.opts.manager;

    this.session = null;
    this.isOpen = false;
    this.mode = 'closed'; // closed | busy | typing | waiting | endwait | topics | choices
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
    this._fadeTween = null;
    this._destroyed = false;

    this._computeLayout();
    this._build();
    this._bindInput();
    this.root.setVisible(false);
    scene.events.once('shutdown', this.destroy, this);
  }

  get isTalking() { return this.isOpen; }

  // ======================================================================
  // PUBLIC API
  // ======================================================================
  talk(npcId, { onClose, tone } = {}) {
    if (this._destroyed || this.isOpen) return false;
    const session = this.m.createSession(npcId);
    if (!session) return false;

    this.session = session;
    this.onClose = onClose || null;
    if (tone) session.setTone(tone);

    const def = session.def;
    this.isOpen = true;
    this.tab = 'topics';
    this.scroll = 0;

    this.nameText.setText(String(def.name).toUpperCase());
    this._fitWidth(this.nameText, this.L.lw - 210 * this.L.s, 14 * this.L.s, 8 * this.L.s);
    this.roleText.setText(def.role || '');

    const showTrust = def.showTrust !== false;
    this.meterObjs.forEach((o) => o.setVisible(showTrust));
    this.numText.setVisible(showTrust && this.opts.showTrustNumber);
    const useTones = def.useTones !== false;
    this.toneObjs.forEach((o) => o.setVisible(useTones));
    this.tabBtns.evidence.rect.setVisible(def.evidenceTab !== false);
    this.tabBtns.evidence.text.setVisible(def.evidenceTab !== false);

    this._updateTrust();
    this._show();
    this._applyResult(session.start());
    return true;
  }

  // One-off monologue / cutscene line(s) with any speaker, no trust, no topics.
  talkOnce(name, lines, opts = {}) {
    const id = '__once__';
    this.m.registerNpc({
      id, name, role: opts.role || '', showTrust: false, useTones: false, evidenceTab: false,
      topics: [], greeting: [{ say: lines, end: true }],
    });
    this.m.resetNpc(id);
    return this.talk(id, opts);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._cancelTyper();
    const sc = this.scene;
    try {
      if (sc.input && sc.input.keyboard) sc.input.keyboard.off('keydown', this._onKey);
      if (sc.input) sc.input.off('wheel', this._onWheel);
      sc.events.off('shutdown', this.destroy, this);
    } catch (e) { /* scene already torn down */ }
    this._toastSet.forEach((t) => t.destroy());
    this._toastSet.clear();
    if (this._arrowTween) this._arrowTween.remove();
    if (this._fadeTween) this._fadeTween.remove();
    if (this.root) this.root.destroy();
    if (this.blocker) this.blocker.destroy();
    this.session = null;
    this.isOpen = false;
    this.mode = 'closed';
  }

  // ======================================================================
  // LAYOUT / BUILD
  // ======================================================================
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
      lx: px + 20 * s, lw: leftW - 40 * s,
      rx: px + leftW + 16 * s, rw: pw - leftW - 32 * s,
      listY: py + 50 * s, rowH: 30 * s,
      bodyY: py + 88 * s, bodyH: ph - 158 * s,
    };
  }

  _txt(x, y, str, font, size, color, extra = {}) {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: font, fontSize: `${size}px`, color, ...extra })
      .setResolution(2);
    this.root.add(t);
    return t;
  }

  _fitWidth(txt, maxW, base, min) {
    let size = base;
    txt.setFontSize(size);
    while (txt.width > maxW && size > min) {
      size -= 1;
      txt.setFontSize(size);
    }
  }

  _build() {
    const sc = this.scene;
    const L = this.L;
    const s = L.s;
    const d = this.opts.depth;

    if (this.opts.modal) {
      this.blocker = sc.add.zone(0, 0, L.W, L.H).setOrigin(0).setScrollFactor(0).setDepth(d - 1).setInteractive();
      this.blocker.input.enabled = false;
      this.blocker.on('pointerdown', () => this._advance());
    }

    this.root = sc.add.container(0, 0).setDepth(d).setScrollFactor(0);

    // ---- frame ----
    const g = sc.add.graphics();
    g.fillStyle(COL.panel, 0.97);
    g.fillRect(L.px, L.py, L.pw, L.ph);
    g.lineStyle(Math.max(2, 3 * s), COL.gold, 1);
    g.strokeRect(L.px, L.py, L.pw, L.ph);
    g.lineStyle(1, COL.goldDim, 1);
    g.strokeRect(L.px + 6 * s, L.py + 6 * s, L.pw - 12 * s, L.ph - 12 * s);
    g.lineStyle(2, COL.divider, 1);
    g.lineBetween(L.px + L.leftW, L.py + 16 * s, L.px + L.leftW, L.py + L.ph - 16 * s);
    g.lineBetween(L.lx, L.py + 60 * s, L.lx + L.lw, L.py + 60 * s);
    g.fillStyle(COL.gold, 1);
    [[L.px, L.py], [L.px + L.pw, L.py], [L.px, L.py + L.ph], [L.px + L.pw, L.py + L.ph]].forEach(([x, y]) => {
      g.fillRect(x - 4 * s, y - 4 * s, 8 * s, 8 * s);
    });
    this.root.add(g);

    // ---- nameplate (no portrait) ----
    this.nameText = this._txt(L.lx, L.py + 16 * s, '', PRESS, 14 * s, COL.goldS);
    this.roleText = this._txt(L.lx, L.py + 38 * s, '', ELITE, 14 * s, COL.textAsked);

    // ---- trust meter ----
    const mx = L.lx + L.lw - 190 * s;
    this.meterObjs = [];
    this.meterObjs.push(this._txt(mx, L.py + 16 * s, 'TRUST', PRESS, 8 * s, COL.textAsked));
    this.segs = [];
    for (let i = 0; i < 10; i++) {
      const seg = sc.add
        .rectangle(mx + i * 18 * s, L.py + 30 * s, 15 * s, 12 * s, COL.segEmpty)
        .setOrigin(0)
        .setStrokeStyle(1, COL.divider);
      this.root.add(seg);
      this.segs.push(seg);
      this.meterObjs.push(seg);
    }
    this.levelText = this._txt(mx, L.py + 46 * s, '', PRESS, 8 * s, COL.goldS);
    this.meterObjs.push(this.levelText);
    this.numText = this._txt(mx + 177 * s, L.py + 16 * s, '', PRESS, 8 * s, COL.textAsked).setOrigin(1, 0);

    // ---- speaker tag + body text ----
    this.speakerText = this._txt(L.lx, L.py + 68 * s, '', PRESS, 9 * s, COL.npc);
    this.body = this._txt(L.lx, L.bodyY, '', ELITE, 19 * s, COL.textLight, {
      wordWrap: { width: L.lw, useAdvancedWrap: true },
      lineSpacing: 5 * s,
    });

    // click anywhere on the text area = continue
    this.textHit = sc.add
      .rectangle(L.lx, L.py + 62 * s, L.lw, L.bodyH + 26 * s, 0x000000, 0)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    this.textHit.on('pointerdown', () => this._advance());
    this.root.add(this.textHit);

    this.contArrow = sc.add.graphics();
    this.contArrow.fillStyle(COL.gold, 1);
    this.contArrow.fillTriangle(0, 0, 14 * s, 0, 7 * s, 9 * s);
    this.contArrow.setPosition(L.lx + L.lw - 18 * s, L.py + L.ph - 84 * s);
    this.contArrow.setVisible(false);
    this.root.add(this.contArrow);
    this._arrowTween = sc.tweens.add({
      targets: this.contArrow, y: this.contArrow.y + 4 * s, duration: 400, yoyo: true, repeat: -1,
    });

    // ---- tone row ----
    const ty = L.py + L.ph - 66 * s;
    this.toneObjs = [];
    this.toneObjs.push(this._txt(L.lx, ty + 8 * s, 'TONE', PRESS, 8 * s, COL.textAsked));
    const tx0 = L.lx + 56 * s;
    const gap = 6 * s;
    const tw = (L.lw - 56 * s - gap * 3) / 4;
    this.toneBtns = TONE_ORDER.map((id, i) => {
      const b = this._btn(
        tx0 + i * (tw + gap), ty, tw, 24 * s, TONES[id].label, 8 * s,
        () => {
          if (this.mode !== 'topics' || !this.session) return;
          this.session.setTone(id);
          this._refreshTones();
        },
        () => this._setHint(TONES[id].hint),
        () => this._setHint(this.session ? TONES[this.session.tone].hint : ''),
      );
      this.toneObjs.push(b.rect, b.text);
      return b;
    });
    this.toneHint = this._txt(L.lx, L.py + L.ph - 34 * s, '', ELITE, 13 * s, COL.textAsked);
    this.toneObjs.push(this.toneHint);

    // ---- right column: tabs ----
    const tabW = (L.rw - 8 * s) / 2;
    this.tabBtns = {
      topics: this._btn(L.rx, L.py + 14 * s, tabW, 26 * s, 'TOPICS', 8 * s, () => this._setTab('topics')),
      evidence: this._btn(L.rx + tabW + 8 * s, L.py + 14 * s, tabW, 26 * s, 'EVIDENCE', 8 * s, () => this._setTab('evidence')),
    };
    this.choiceTitle = this._txt(L.rx, L.py + 20 * s, 'YOUR REPLY:', PRESS, 9 * s, COL.goldS);
    this.choiceTitle.setVisible(false);

    // ---- right column: list rows ----
    this.rows = [];
    for (let i = 0; i < MAX_ROWS; i++) {
      const y = L.listY + i * L.rowH;
      const rh = L.rowH - 4 * s;
      const bg = sc.add.rectangle(L.rx, y, L.rw - 22 * s, rh, COL.gold, 0).setOrigin(0)
        .setInteractive({ useHandCursor: true });
      this.root.add(bg);
      const num = this._txt(L.rx + 8 * s, y + rh / 2, '', PRESS, 9 * s, COL.goldS).setOrigin(0, 0.5);
      const label = this._txt(L.rx + 34 * s, y + rh / 2, '', ELITE, 16 * s, COL.textLight).setOrigin(0, 0.5);
      bg.on('pointerover', () => {
        const e = this._entries[this.scroll + i];
        if (e && !e.disabled && this._listActive()) bg.setFillStyle(COL.gold, 0.18);
      });
      bg.on('pointerout', () => bg.setFillStyle(COL.gold, 0));
      bg.on('pointerdown', () => this._pickIndex(this.scroll + i));
      this.rows.push({ bg, num, label });
    }

    const ax = L.rx + L.rw - 18 * s;
    this.arrowUp = this._arrow(ax, L.listY, true, () => this._scrollBy(-1));
    this.arrowDown = this._arrow(ax, L.listY + MAX_ROWS * L.rowH - 22 * s, false, () => this._scrollBy(1));

    // ---- goodbye ----
    this.byeBtn = this._btn(L.rx, L.py + L.ph - 50 * s, L.rw, 32 * s, '0   GOODBYE', 9 * s, () => this._goodbye());
  }

  _btn(x, y, w, h, label, size, onClick, onOver, onOut) {
    const rect = this.scene.add.rectangle(x, y, w, h, COL.btn).setOrigin(0)
      .setStrokeStyle(2, COL.goldDim).setInteractive({ useHandCursor: true });
    this.root.add(rect);
    const text = this._txt(x + w / 2, y + h / 2, label, PRESS, size, COL.goldS).setOrigin(0.5);
    const btn = { rect, text, state: 'normal', hover: false };
    rect.on('pointerover', () => { btn.hover = true; this._styleBtn(btn); if (onOver) onOver(); });
    rect.on('pointerout', () => { btn.hover = false; this._styleBtn(btn); if (onOut) onOut(); });
    rect.on('pointerdown', () => {
      if (this.isOpen && btn.state !== 'disabled' && onClick) onClick();
    });
    return btn;
  }

  _styleBtn(btn) {
    const { rect, text, state, hover } = btn;
    if (state === 'selected') {
      rect.setFillStyle(COL.gold).setStrokeStyle(2, COL.gold);
      text.setColor('#1a1208');
    } else if (state === 'disabled') {
      rect.setFillStyle(COL.btnOff).setStrokeStyle(2, 0x3a2f18);
      text.setColor(COL.textDim);
    } else {
      rect.setFillStyle(hover ? COL.btnHover : COL.btn).setStrokeStyle(2, hover ? COL.gold : COL.goldDim);
      text.setColor(COL.goldS);
    }
  }

  _arrow(x, y, up, cb) {
    const s = this.L.s;
    const hit = this.scene.add.rectangle(x, y, 18 * s, 18 * s, COL.btn).setOrigin(0)
      .setStrokeStyle(1, COL.goldDim).setInteractive({ useHandCursor: true });
    const g = this.scene.add.graphics();
    g.fillStyle(COL.gold, 1);
    if (up) g.fillTriangle(x + 9 * s, y + 5 * s, x + 4 * s, y + 13 * s, x + 14 * s, y + 13 * s);
    else g.fillTriangle(x + 4 * s, y + 5 * s, x + 14 * s, y + 5 * s, x + 9 * s, y + 13 * s);
    hit.on('pointerdown', () => { if (this.isOpen) cb(); });
    this.root.add([hit, g]);
    return {
      show: (v) => { hit.setVisible(v); g.setVisible(v); },
    };
  }

  // ======================================================================
  // INPUT
  // ======================================================================
  _bindInput() {
    this._onKey = (ev) => this._handleKey(ev);
    this._onWheel = (pointer, over, dx, dy) => this._handleWheel(pointer, dy);
    if (this.scene.input.keyboard) this.scene.input.keyboard.on('keydown', this._onKey);
    this.scene.input.on('wheel', this._onWheel);
  }

  _handleKey(ev) {
    if (!this.isOpen) return;
    const k = ev.key;
    if (k === ' ' || k === 'Enter') {
      if (ev.preventDefault) ev.preventDefault();
      this._advance();
    } else if (k === 'Tab') {
      if (ev.preventDefault) ev.preventDefault();
      this._cycleTone();
    } else if (k === '0') {
      this._goodbye();
    } else if (/^[1-9]$/.test(k)) {
      this._pickIndex(parseInt(k, 10) - 1);
    } else if (k === 'ArrowDown') {
      this._scrollBy(1);
    } else if (k === 'ArrowUp') {
      this._scrollBy(-1);
    } else if (k === 'ArrowLeft' || k === 'ArrowRight') {
      if (this.mode === 'topics') this._setTab(this.tab === 'topics' ? 'evidence' : 'topics');
    }
  }

  _handleWheel(pointer, dy) {
    if (!this.isOpen || !this._listActive()) return;
    const L = this.L;
    const inside = pointer.x >= L.rx && pointer.x <= L.rx + L.rw
      && pointer.y >= L.listY && pointer.y <= L.listY + MAX_ROWS * L.rowH;
    if (inside) this._scrollBy(dy > 0 ? 1 : -1);
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
    if (this.mode !== 'topics' || !this.session || this.session.def.useTones === false) return;
    const tones = this.session.getTones().filter((t) => t.enabled);
    if (!tones.length) return;
    const i = tones.findIndex((t) => t.id === this.session.tone);
    this.session.setTone(tones[(i + 1) % tones.length].id);
    this._refreshTones();
  }

  // ======================================================================
  // FLOW
  // ======================================================================
  _show() {
    this.root.setVisible(true);
    this.root.setAlpha(0);
    this.root.y = 24 * this.L.s;
    if (this.blocker) this.blocker.input.enabled = true;
    if (this._fadeTween) this._fadeTween.remove();
    this._fadeTween = this.scene.tweens.add({ targets: this.root, alpha: 1, y: 0, duration: 160 });
  }

  _hide() {
    if (this.blocker) this.blocker.input.enabled = false;
    if (this._fadeTween) this._fadeTween.remove();
    this._fadeTween = this.scene.tweens.add({
      targets: this.root, alpha: 0, duration: 140,
      onComplete: () => {
        if (!this._destroyed && !this.isOpen) this.root.setVisible(false);
      },
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
    this.speakerText.setColor(line.kind === 'player' ? COL.player : COL.npc);
    this.body.setColor(line.kind === 'action' ? COL.action : COL.textLight);
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
    const ch = this._full[this._idx++];
    this.body.setText(this._full.slice(0, this._idx));
    if (this.opts.onBlip && ch.trim() && this._idx % 3 === 0) this.opts.onBlip(this._curKind);
    if (this._idx >= this._full.length) {
      this._finishTyping();
      return;
    }
    const pause = /[.!?]/.test(ch) ? 8 : /[,;:]/.test(ch) ? 4 : 1;
    this._typer = this.scene.time.delayedCall(this.opts.charDelay * pause, () => this._tick());
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
    if (this._typer) {
      this._typer.remove(false);
      this._typer = null;
    }
  }

  _afterLines() {
    const r = this._current;
    this.contArrow.setVisible(false);
    if (r && r.end) {
      if (!r.lines.length) {
        this._close();
      } else {
        this._setMode('endwait');
        this.contArrow.setVisible(true);
      }
      return;
    }
    if (r && r.choices && r.choices.length) {
      this._showChoices(r.choices);
      return;
    }
    this._showTopics();
  }

  _close() {
    if (!this.isOpen || !this.session) return;
    const endedBy = (this._current && this._current.endedBy) || 'goodbye';
    const summary = this.session.close(endedBy);
    this.isOpen = false;
    this._setMode('closed');
    this._cancelTyper();
    this.contArrow.setVisible(false);
    this._hide();
    const cb = this.onClose;
    this.onClose = null;
    this.session = null;
    if (cb) cb(summary);
  }

  _goodbye() {
    if (!this.isOpen || this.mode !== 'topics') return;
    this._applyResult(this.session.leave());
  }

  // ======================================================================
  // LIST (topics / evidence / choices)
  // ======================================================================
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
    this.choiceTitle.setVisible(true);
    this.scroll = 0;
    this._setEntries(labels.map((l) => ({ label: l, style: 'new' })));
  }

  _setTabsVisible(v) {
    const evOk = this.session && this.session.def.evidenceTab !== false;
    this.tabBtns.topics.rect.setVisible(v);
    this.tabBtns.topics.text.setVisible(v);
    this.tabBtns.evidence.rect.setVisible(v && evOk);
    this.tabBtns.evidence.text.setVisible(v && evOk);
  }

  _setTab(tab) {
    if (this.mode !== 'topics') return;
    this.tab = tab;
    this.scroll = 0;
    this._refreshTabs();
    this._renderTab();
  }

  _refreshTabs() {
    this.tabBtns.evidence.text.setText(`EVIDENCE (${this._evidence.length})`);
    this.tabBtns.topics.state = this.tab === 'topics' ? 'selected' : 'normal';
    this.tabBtns.evidence.state = this.tab === 'evidence' ? 'selected' : 'normal';
    this._styleBtn(this.tabBtns.topics);
    this._styleBtn(this.tabBtns.evidence);
  }

  _renderTab() {
    let entries;
    if (this.tab === 'topics') {
      entries = this._topics.map((t) => ({
        label: t.label,
        style: t.locked ? 'locked' : t.asked ? 'asked' : 'new',
        suffix: t.locked ? '  [needs trust]' : '',
      }));
      if (!entries.length) {
        entries = [{ label: 'Nothing left to ask. Awkward silence.', style: 'dim', disabled: true }];
      }
    } else {
      entries = this._evidence.map((e) => ({ label: e.label, style: e.presented ? 'asked' : 'new' }));
      if (!entries.length) {
        entries = [{ label: 'Your pockets are empty. Go find evidence.', style: 'dim', disabled: true }];
      }
    }
    this._setEntries(entries);
  }

  _setEntries(entries) {
    this._entries = entries;
    this.scroll = Math.max(0, Math.min(this.scroll, entries.length - MAX_ROWS));
    this._drawRows();
  }

  _scrollBy(delta) {
    if (!this._listActive()) return;
    const max = Math.max(0, this._entries.length - MAX_ROWS);
    const next = Math.max(0, Math.min(max, this.scroll + delta));
    if (next !== this.scroll) {
      this.scroll = next;
      this._drawRows();
    }
  }

  _drawRows() {
    const s = this.L.s;
    const maxW = this.L.rw - 22 * s - 44 * s;
    const colors = {
      new: COL.textLight, asked: COL.textAsked, locked: COL.textLocked, dim: COL.textDim,
    };
    this.rows.forEach((row, i) => {
      const idx = this.scroll + i;
      const e = this._entries[idx];
      const vis = !!e;
      row.bg.setVisible(vis);
      row.num.setVisible(vis);
      row.label.setVisible(vis);
      if (!vis) return;
      row.bg.setFillStyle(COL.gold, 0);
      row.label.setText(e.label + (e.suffix || ''));
      row.label.setColor(colors[e.style] || COL.textLight);
      this._fitWidth(row.label, maxW, 16 * s, 11 * s);
      row.num.setText(idx < 9 && !e.disabled ? String(idx + 1) : '');
      row.num.setColor(e.style === 'new' ? COL.goldS : COL.textDim);
    });
    this.arrowUp.show(this.scroll > 0);
    this.arrowDown.show(this.scroll + MAX_ROWS < this._entries.length);
    this._applyListAlpha();
  }

  _applyListAlpha() {
    const a = this._listActive() ? 1 : 0.4;
    this.rows.forEach((r) => { r.num.setAlpha(a); r.label.setAlpha(a); });
    ['topics', 'evidence'].forEach((k) => {
      this.tabBtns[k].rect.setAlpha(a);
      this.tabBtns[k].text.setAlpha(a);
    });
    this.choiceTitle.setAlpha(a);
  }

  _pickIndex(idx) {
    if (!this.isOpen || !this.session || !this._listActive()) return;
    const e = this._entries[idx];
    if (!e || e.disabled) return;
    if (this.mode === 'choices') {
      this._applyResult(this.session.choose(idx));
    } else if (this.tab === 'topics') {
      const t = this._topics[idx];
      if (t) this._applyResult(this.session.ask(t.id));
    } else {
      const ev = this._evidence[idx];
      if (ev) this._applyResult(this.session.present(ev.id));
    }
  }

  // ======================================================================
  // TONES / TRUST / BYE
  // ======================================================================
  _refreshTones() {
    if (!this.session) return;
    const on = this.mode === 'topics';
    const tones = this.session.getTones();
    const cur = tones.find((t) => t.id === this.session.tone);
    if (!cur || !cur.enabled) this.session.setTone('polite');
    tones.forEach((t, i) => {
      const b = this.toneBtns[i];
      b.text.setText(t.id === 'bribe' ? `BRIBE $${t.cost}` : t.label);
      b.state = !t.enabled ? 'disabled' : (this.session.tone === t.id ? 'selected' : 'normal');
      this._styleBtn(b);
      b.rect.setAlpha(on ? 1 : 0.5);
      b.text.setAlpha(on ? 1 : 0.5);
    });
    this._setHint(TONES[this.session.tone].hint);
  }

  _setHint(text) {
    this.toneHint.setText(text || '');
  }

  _refreshBye() {
    this.byeBtn.state = this.mode === 'topics' ? 'normal' : 'disabled';
    this._styleBtn(this.byeBtn);
  }

  _updateTrust() {
    if (!this.session) return;
    const t = this.session.getTrust();
    const filled = Math.round(t.value / 10);
    this.segs.forEach((seg, i) => seg.setFillStyle(i < filled ? t.level.color : COL.segEmpty));
    this.levelText.setText(t.level.label);
    this.levelText.setColor(t.level.hex);
    this.numText.setText(String(t.value));
  }

  _showToasts(result) {
    if (!this.session) return;
    const showTrust = this.session.def.showTrust !== false;
    let slot = 0;
    if (result.spent) this._toast(`-$${result.spent}`, '#e8c25a', slot++);
    const tr = result.trust;
    if (showTrust && tr && tr.delta !== 0) {
      this._toast(`TRUST ${tr.delta > 0 ? '+' : ''}${tr.delta}`, tr.delta > 0 ? '#8fcb68' : '#e0604f', slot++);
      if (tr.levelChanged) {
        this._toast(`${this.session.def.name.toUpperCase()} IS NOW ${tr.level.label}`, tr.level.hex, slot++);
        this._toast(randomBlurb(tr.level), tr.level.hex, slot++, ELITE, 14);
      }
    }
    (result.gained || []).forEach((label) => this._toast(`GOT: ${label}`, '#9fd0ff', slot++));
  }

  _toast(text, color, slot, font = PRESS, size = 9) {
    const L = this.L;
    const s = L.s;
    const t = this.scene.add
      .text(L.lx, L.py - (14 + slot * 24) * s, text, {
        fontFamily: font, fontSize: `${size * s}px`, color, stroke: '#000000', strokeThickness: 4 * s,
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(this.opts.depth + 2)
      .setResolution(2);
    this._toastSet.add(t);
    this.scene.tweens.add({
      targets: t, y: t.y - 16 * s, alpha: 0, delay: 1700, duration: 700,
      onComplete: () => { this._toastSet.delete(t); t.destroy(); },
    });
  }

  // ======================================================================
  // TEXT FITTING (word-wrap first, so the typewriter never re-flows words)
  // ======================================================================
  _fit(text) {
    const s = this.L.s;
    let size = 19 * s;
    const min = 13 * s;
    let wrapped = text;
    for (;;) {
      this.body.setFontSize(size);
      this.body.setLineSpacing(5 * s);
      wrapped = this.body.getWrappedText(text).join('\n');
      const n = wrapped.split('\n').length;
      if (n * (size * 1.25 + 5 * s) <= this.L.bodyH || size <= min) break;
      size -= 1;
    }
    return wrapped;
  }
}