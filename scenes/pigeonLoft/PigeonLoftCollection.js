import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { W, H, ORDER, LOCAL, P, FONT, BEAM, BEAM_CENTER, WINDOW_FLY, LINES, pick, timeText, goldPlate } from './PigeonLoftData.js';
import { PIGEON_FINDS, PIGEON_COLLECTIONS } from '../../config/pigeonConfig.js';

export const pigeonLoftCollection = {
  openModal(kind) {
    if (kind === 'rename') {
      const bird = this.birdOf(this.selectedSlot);
      if (bird) this.naming.startRename(bird);
      return;
    }
    if (this.pigeonNameEditor) return;
    this.hideTip(); this.closeDialogue(); this.modal = kind; this.renderLoft();
  },
  closeModal() { this.modal = null; this.renderLoft(); },
  renderModal() {
    this.modalLayer = this.add.container(0, 0).setDepth(800);
    const { width, height } = this.scale;
    this.modalLayer.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive());
    this.renderCollection();
  },
  renderCollection() {
    const { width: sw, height: sh } = this.scale;
    const X = Math.round(sw * 0.06), Y = Math.round(sh * 0.09), WW = Math.round(sw * 0.88), HH = Math.round(sh * 0.82);
    const m = this.modalLayer, g = this.add.graphics(); goldPlate(g, X, Y, WW, HH, 0.98); m.add(g);
    m.add(this.add.text(X + 36, Y + 32, __dialogueText("scenes/PigeonLoftScene.js", "t_0e2a5d6bf0bf5285df5a"), { fontFamily: FONT.pixel, fontSize: '18px', color: '#d4af37' }));
    const close = this.makeButton(m, 0, Y + 18, 'CLOSE', () => this.closeModal(), { size: 12 });
    close.setX(X + WW - 36 - close.btnWidth);

    const rows = PIGEON_COLLECTIONS.length, top = Y + 96, rowH = Math.floor((HH - 96 - 90) / Math.max(1, rows));
    PIGEON_COLLECTIONS.forEach((set, row) => {
      const ry = top + row * rowH, known = set.ids.filter(id => (this.state.collection[id] || 0) > 0).length;
      const complete = known === set.ids.length;
      m.add(this.add.text(X + 36, ry, `${set.name}${__dialogueText("scenes/PigeonLoftScene.js", "t_0aad7da77d2ed59c396c")}${known}${__dialogueText("scenes/PigeonLoftScene.js", "t_8a5edab282632443219e")}${set.ids.length}${complete ? __dialogueText("scenes/PigeonLoftScene.js", "t_293bc8233b419125dc46") : ''}`,
        { fontFamily: FONT.pixel, fontSize: '14px', color: complete ? P.GREEN : '#ffd86b' }));
      const gap = 24, cardW = Math.floor((WW - 72 - gap * (set.ids.length - 1)) / set.ids.length), cardH = Math.min(190, rowH - 70);
      const cy = ry + 36, shelf = this.add.graphics();
      shelf.fillStyle(0x3b2512, 1); shelf.fillRect(X + 28, cy + cardH, WW - 56, 14);
      shelf.fillStyle(0x6a4524, 1); shelf.fillRect(X + 28, cy + cardH, WW - 56, 4);
      m.add(shelf);
      set.ids.forEach((id, col) => this.collectionCard(m, id, X + 36 + col * (cardW + gap), cy, cardW, cardH));
    });
    m.add(this.add.text(X + 36, Y + HH - 56, `${__dialogueText("scenes/PigeonLoftScene.js", "t_52c8a2fdb6ed1d122f49")}${this.state.junkDiscarded}${__dialogueText("scenes/PigeonLoftScene.js", "t_eb2687fbc3fe9556e9a1")}`,
      { fontFamily: FONT.body, fontSize: '19px', color: P.TOPIC_USED }));
  },
  collectionCard(parent, id, x, y, w, h) {
    const find = PIGEON_FINDS.find(f => f.id === id), n = this.state.collection[id] || 0, known = n > 0;
    const g = this.add.graphics();
    g.fillStyle(0x0b0805, 0.92); g.fillRect(x, y, w, h);
    g.lineStyle(2, known ? 0xd4af37 : 0x5a4a22, 1); g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle(known ? 0x2a1c0c : 0x120d07, 1); g.fillRect(x + 14, y + 14, 112, h - 28);
    this.drawFindIcon(g, id, x + 70, y + h / 2, 42, known);
    parent.add(g);
    if (!known) parent.add(this.add.text(x + 70, y + h / 2, "?", { fontFamily: FONT.pixel, fontSize: '34px', color: '#5a4a22' }).setOrigin(0.5));
    const tx = x + 144, tw = w - 144 - 16;
    parent.add(this.add.text(tx, y + 18, known ? (find?.name ?? id) : __dialogueText("scenes/PigeonLoftScene.js", "t_a03b221c6c6eae7122ca"), { fontFamily: FONT.body, fontSize: '22px', color: known ? P.TEXT : P.TOPIC_USED, wordWrap: { width: tw } }));
    parent.add(this.add.text(tx, y + 58, known ? (find?.description || '') : __dialogueText("scenes/PigeonLoftScene.js", "t_3c30651c5fa63183b431"),
      { fontFamily: FONT.body, fontSize: '16px', color: known ? '#b8bdbb' : P.TOPIC_USED, wordWrap: { width: tw }, lineSpacing: 3 }));
    if (known) parent.add(this.add.text(x + w - 16, y + h - 14, `${"x"}${n}`, { fontFamily: FONT.pixel, fontSize: '12px', color: P.AMBER }).setOrigin(1, 1));
  },
  drawFindIcon(g, id, cx, cy, r, known) {
    if (!known) { g.fillStyle(0x1b140b, 1); g.fillCircle(cx, cy, r); return; }
    const caps = { cap_fizz: 0xe8892b, cap_coo: 0x4fb3a8, cap_noir: 0x34343e };
    const buttons = { button_gold: 0xd4af37, button_blue: 0x3d6fd1, button_anchor: 0x1f2f4f };
    if (caps[id] !== undefined) {
      g.fillStyle(caps[id], 1); g.fillCircle(cx, cy, r);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; g.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.13); }
      g.fillStyle(0x000000, 0.25); g.fillCircle(cx, cy, r * 0.68);
      g.fillStyle(0xffffff, 0.35); g.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.14);
    } else if (buttons[id] !== undefined) {
      g.fillStyle(buttons[id], 1); g.fillCircle(cx, cy, r);
      g.lineStyle(3, 0xffffff, 0.35); g.strokeCircle(cx, cy, r * 0.78);
      if (id === 'button_anchor') {
        g.lineStyle(3, 0xcfe0f5, 1); g.strokeCircle(cx, cy - r * 0.42, r * 0.14);
        g.lineBetween(cx, cy - r * 0.28, cx, cy + r * 0.45); g.lineBetween(cx - r * 0.25, cy - r * 0.08, cx + r * 0.25, cy - r * 0.08);
        g.lineBetween(cx - r * 0.42, cy + r * 0.18, cx, cy + r * 0.45); g.lineBetween(cx + r * 0.42, cy + r * 0.18, cx, cy + r * 0.45);
      } else {
        g.fillStyle(0x000000, 0.45);
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillCircle(cx + dx * r * 0.22, cy + dy * r * 0.22, r * 0.09);
      }
    } else { g.fillStyle(0x8a6d1f, 1); g.fillCircle(cx, cy, r * 0.8); }
  }
};
