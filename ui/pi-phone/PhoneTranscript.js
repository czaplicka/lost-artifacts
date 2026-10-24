import { DW, DH, FONT_TEXT, FONT_PIXEL, SFX, ART, AMBER, AMBER_CSS, GREEN, GREEN_CSS, RED, CREAM_CSS, FAINT_CSS, SCREEN_TEXT, DIAL_X, DIAL_Y, STOP_ANGLE, HOLE_RING, MON_X, MON_Y, MON_W, MON_H, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, LEDS, VU_BARS, mulberry32 } from './PhoneConfig.js';

export const PhoneTranscript = {
  clearLog() {
    this.logItems.forEach(item => {
      item.timer?.remove?.(false);
      item.container?.destroy?.(true);
    });

    this.logItems = [];
    this.typingItem = null;
  }
,
  addBubble(speaker, text, isYou) {
    const s = this.scene;
    const maxW = 430;

    const container = s.add.container(0, 0);

    const body = s.add.text(0, 0, text, {
      fontFamily: FONT_TEXT,
      fontSize: '19px',
      color: isYou ? '#ffe6b8' : '#d9f5e8',
      wordWrap: { width: maxW - 28 }
    });

    // Mierzymy pełny tekst z góry, żeby dymek nie "rósł" podczas pisania.
    const textW = Math.ceil(body.width);
    const textH = Math.ceil(body.height);
    const w = Math.min(maxW, textW + 28);
    const h = textH + 18;

    body.setText('');

    const label = s.add.text(0, 0, String(speaker).toUpperCase(), {
      fontFamily: FONT_PIXEL,
      fontSize: '8px',
      color: isYou ? AMBER_CSS : GREEN_CSS
    });

    const xOff = isYou ? SCREEN_W - 36 - w : 0;

    label.setPosition(xOff + 4, 0);

    const bg = s.add.graphics();
    bg.fillStyle(isYou ? 0x2a2010 : 0x14261d, 1);
    bg.fillRoundedRect(xOff, 16, w, h, 8);
    bg.lineStyle(1, isYou ? AMBER : GREEN, 0.6);
    bg.strokeRoundedRect(xOff, 16, w, h, 8);

    body.setPosition(xOff + 14, 16 + 9);

    container.add([bg, label, body]);
    this.logContainer.add(container);

    const item = {
      container,
      body,
      full: text,
      height: 16 + h + 8,
      typing: false,
      timer: null
    };

    this.logItems.push(item);
    this.layoutLog();

    return item;
  }
,
  addSystemNote(text) {
    const s = this.scene;

    const container = s.add.container(0, 0);

    const note = s.add.text(
      (SCREEN_W - 36) / 2,
      6,
      text,
      {
        fontFamily: FONT_TEXT,
        fontSize: '15px',
        color: FAINT_CSS,
        align: 'center',
        wordWrap: { width: SCREEN_W - 70 }
      }
    ).setOrigin(0.5, 0);

    container.add(note);
    this.logContainer.add(container);

    const item = {
      container,
      body: note,
      full: text,
      height: Math.ceil(note.height) + 18,
      typing: false,
      timer: null
    };

    this.logItems.push(item);
    this.layoutLog();

    return item;
  }
,
  layoutLog() {
    const available = SCREEN_H - 62;

    const total = () =>
      this.logItems.reduce((sum, item) => sum + item.height, 0);

    // Najstarsze wiadomości znikają, gdy ekran się zapełni.
    while (this.logItems.length > 1 && total() > available) {
      const old = this.logItems.shift();
      old.timer?.remove?.(false);
      old.container?.destroy?.(true);
    }

    let y = 0;

    this.logItems.forEach(item => {
      item.container.setY(y);
      y += item.height;
    });
  }
,
  typeItem(item) {
    item.typing = true;
    this.typingItem = item;

    const full = item.full;
    let index = 0;

    const timer = this.scene.time.addEvent({
      delay: 18,
      loop: true,
      callback: () => {
        index += 2;

        if (index >= full.length) {
          this.finishTyping(item);
          return;
        }

        item.body.setText(full.slice(0, index));
      }
    });

    item.timer = timer;
    this.timers.add(timer);
  }
,
  finishTyping(item) {
    if (!item?.typing) return;

    item.typing = false;
    item.timer?.remove?.(false);
    this.timers.delete(item.timer);
    item.timer = null;

    item.body?.setText?.(item.full);

    if (this.typingItem === item) this.typingItem = null;

    this.render();
  }

  // ─── Budowa widoku (raz) ──────────────────────────────────────────────────
};
