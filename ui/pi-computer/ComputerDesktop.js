import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { COLORS, FONTS } from './ComputerTheme.js';
import { formatStampDate } from '../../managers/PassportManager.js';
import { thiefdokuService } from '../../systems/thiefdoku/ThiefdokuService.js';
import {
  ownsNewPIOffice,
  needsOfficeMoveIn
} from '../../managers/PIOfficeShopManager.js';

const INK = 0x1b2530;
const FILE = 'ui/pi-computer/ComputerDesktop.js';
const text = id => __dialogueText(FILE, id);

const TRASH_JOKES = [
  't_b97a7e1def5238e7e8f9',
  't_fbce81e8e34bfbead2f4',
  't_5c103f95f815703b3941'
];

const CAT_JOKES = [
  't_b9e9024c49644145016d',
  't_4f92ae935d19a05b64ee',
  't_e1dffebc7ef845a3cfd9'
];

const SEARCH_ICON_Y = 310;
const THIEFDOKU_ICON_Y = SEARCH_ICON_Y - 100;
const AUDIO_ICON_Y = SEARCH_ICON_Y + 100;
const ALIBI_BOOKS_ICON_Y = 210;

export class ComputerDesktop {
  constructor(ui) {
    this.ui = ui;
  }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    const dh = h - 36;

    const entries = [
      ['mail', text('t_07ed6ccf6bf6393d1868'), 'envelope', 0xe6d9ab],
      ['ledger', text('t_051fe5f19c9e64fa9532'), 'ledger', 0xa5c397],
      ['classifieds', text('t_c2a15c2c550a91eda017'), 'paper', 0xd1d6d8],
      ['investigations', text('t_21476f00fdcfab750c7e'), 'board', 0xc69d7d],
      ['travel', text('t_86991929b8126f48abce'), 'globe', 0x98b9ce],
      ['chat', 'IMEGO', 'chat', 0x8db7a6]
    ];

    entries.forEach(([app, label, kind, color], i) => {
      this.createIcon(
        x + 12, y + 10 + i * 100, 128,
        label, kind, color, () => ui.openApp(app)
      );
    });

    if (ownsNewPIOffice() && !needsOfficeMoveIn()) {
      this.createIcon(
        x + 292, y + ALIBI_BOOKS_ICON_Y, 128,
        'Alibi Books', 'alibi-books', 0xd4af37,
        () => ui.openApp('alibi-books')
      );
    }

    if (thiefdokuService.isInstalled()) {
      this.createIcon(
        x + 152, y + THIEFDOKU_ICON_Y, 128,
        text('t_5cf46358ab38145b427c'), 'boards', 0xd9a7b5,
        () => ui.openApp('thiefdoku')
      );
    }

    this.createIcon(
      x + 152, y + AUDIO_ICON_Y, 128,
      text('t_5ddde5a18bc919b6ce35'), 'audio', 0x93ba99,
      () => ui.openApp('audio')
    );

    this.createIcon(
      x + w - 290, y + dh - 108, 128,
      text('t_f4493be34bca100d58f4'), 'cat', 0xe0a458,
      () => this.joke(CAT_JOKES)
    );

    this.createIcon(
      x + w - 150, y + dh - 108, 128,
      text('t_718039dbb2044f35d9a5'), 'trash', 0x8b99a3,
      () => this.joke(TRASH_JOKES)
    );

    this.renderStickyNote(x + 252, y + 130);

    d.pixel(x + w - 22, y + 22, text('t_feb0d25e891e512dec77'), 12, '#e6edf5')
      .setOrigin(1, 0)
      .setAlign('right')
      .setLineSpacing(6)
      .setShadow(2, 2, '#0a1226', 0, true, true);

    d.text(x + w - 22, y + 74, text('t_84d36929c0f74dc93d6d'), 14, '#9db3d6')
      .setOrigin(1, 0)
      .setShadow(1, 1, '#0a1226', 0, true, true);

    this.renderDate(x + w - 22, y + 104);

    if (ui.notice && !ui.shell?.visibleCount()) {
      this.renderNotice();
    }
  }

  renderDate(x, y) {
    const ui = this.ui;
    const label = ui.drawing.text(x, y, '', 16, '#e6edf5')
      .setOrigin(1, 0)
      .setShadow(1, 1, '#0a1226', 0, true, true);

    let previous = '';
    const update = () => {
      const value = formatStampDate().label;
      if (value !== previous) {
        previous = value;
        label.setText(value);
      }
    };

    update();
    ui.scene.events.on('update', update);
    label.once('destroy', () => ui.scene.events.off('update', update));
  }

  joke(list) {
    const ui = this.ui;
    ui.notice = text(list[ui.jokeIndex % list.length]);
    ui.jokeIndex++;
    ui.render();
  }

  renderStickyNote(cx, cy) {
    const ui = this.ui;
    const scene = ui.scene;
    const note = scene.add.container(cx, cy);

    note.add(scene.add.rectangle(5, 6, 150, 150, 0x000000, 0.28));
    note.add(scene.add.rectangle(0, 0, 150, 150, 0xf4e27a));
    note.add(scene.add.rectangle(0, -72, 62, 16, 0xe8e2c8, 0.7).setAngle(2));

    note.add(scene.add.text(-64, -58, text('t_be4e2fcd31e118ccfde8'), {
      fontFamily: FONTS.body,
      fontSize: '13px',
      color: '#4a3d12',
      lineSpacing: 3
    }));

    note.setAngle(-3);
    ui.drawing.add(note);
  }

  renderNotice() {
    const ui = this.ui;
    const d = ui.drawing;
    const scene = ui.scene;
    const { x, y, w, h } = ui.layout;
    const dw = 480;

    const probe = scene.add.text(0, 0, ui.notice, {
      fontFamily: FONTS.body,
      fontSize: '16px',
      wordWrap: { width: dw - 110 }
    });

    const th = probe.height;
    probe.destroy();

    const dh = Math.max(150, th + 118);
    const dx = x + Math.round((w - dw) / 2);
    const dy = y + Math.round((h - 36 - dh) / 2);

    d.rectangle(dx + 8, dy + 8, dw, dh, 0x050a10, 0.5);
    d.bevel(dx, dy, dw, dh, COLORS.window);
    d.rectangle(dx + 4, dy + 4, dw - 8, 28, COLORS.titlebar);
    d.pixel(dx + 14, dy + 12, text('t_fbf041a1eeccd5b4078f'), 10, COLORS.titleText);

    const g = scene.add.graphics();
    ui.content.add(g);
    g.fillStyle(0x294b70, 1);
    g.fillCircle(dx + 40, dy + 70, 20);
    g.lineStyle(2, INK, 1);
    g.strokeCircle(dx + 40, dy + 70, 20);

    d.pixel(dx + 33, dy + 63, 'i', 14, '#ffffff');
    d.text(dx + 76, dy + 48, ui.notice, 16, COLORS.text, dw - 110);

    d.button(dx + dw - 76, dy + dh - 50, text('t_565339bc4d33d72817b5'), () => {
      ui.notice = '';
      ui.render();
    });
  }

  createIcon(x, y, width, label, kind, color, callback) {
    const ui = this.ui;
    const d = ui.drawing;
    const scene = ui.scene;

    if (label === text('t_d04fc7d7e19702f8b611') ||
        label === text('t_6f6ca128fbbdf22488f9')) {
      x = ui.layout.x + 152;
      y = ui.layout.y + SEARCH_ICON_Y;
      kind = 'owl_search';
    }

    if (label === text('t_5ddde5a18bc919b6ce35')) {
      x = ui.layout.x + 152;
      y = ui.layout.y + AUDIO_ICON_Y;
    }

    const cx = x + width / 2;
    const top = y + 5;
    const highlight = d.rectangle(x + 4, y, width - 8, 94, 0x2b5a9a, 0);
    const key = kind === 'alibi-books' ? null : ui.shell?.iconKey(kind);

    if (key) {
      d.rectangle(cx - 20, top + 50, 40, 6, 0x000000, 0.28);
      d.add(scene.add.image(cx, top + 27, key).setDisplaySize(48, 48));
    } else {
      const g = scene.add.graphics();
      ui.content.add(g);
      this.drawGlyph(g, kind, cx, top, color);
    }

    d.text(cx, y + 58, label, 15, '#ffffff', width - 4)
      .setOrigin(0.5, 0)
      .setAlign('center')
      .setShadow(1, 1, '#0a1226', 0, true, true);

    const hit = d.rectangle(x, y, width, 94, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      highlight.setFillStyle(0x2b5a9a, 0.45);
      highlight.setStrokeStyle(2, 0xd4af37, 0.9);
    });

    hit.on('pointerout', () => {
      highlight.setFillStyle(0x2b5a9a, 0);
      highlight.setStrokeStyle();
    });

    hit.on('pointerdown', () => {
      ui.options.onSfx?.('click');
      callback();
    });
  }

  drawGlyph(g, kind, cx, top, color) {
    const fill = (x, y, w, h, c, alpha = 1) => {
      g.fillStyle(c, alpha);
      g.fillRect(cx + x, top + y, w, h);
    };
    const stroke = (x, y, w, h) => g.strokeRect(cx + x, top + y, w, h);
    const line = (x1, y1, x2, y2) =>
      g.lineBetween(cx + x1, top + y1, cx + x2, top + y2);
    const circle = (x, y, r, c) => {
      g.fillStyle(c, 1);
      g.fillCircle(cx + x, top + y, r);
    };
    const circleLine = (x, y, r) => g.strokeCircle(cx + x, top + y, r);
    const triangle = (x1, y1, x2, y2, x3, y3, c) => {
      g.fillStyle(c, 1);
      g.fillTriangle(cx + x1, top + y1, cx + x2, top + y2, cx + x3, top + y3);
    };
    const ellipse = (x, y, w, h, c, alpha = 1) => {
      g.fillStyle(c, alpha);
      g.fillEllipse(cx + x, top + y, w, h);
    };
    const polygon = points => points.map(([x, y]) => ({ x: cx + x, y: top + y }));

    g.lineStyle(2, INK, 1);

    switch (kind) {
      case 'envelope':
        fill(-22, 16, 52, 34, 0x000000, 0.3);
        fill(-26, 10, 52, 34, color);
        stroke(-26, 10, 52, 34);
        line(-26, 10, 0, 30);
        line(26, 10, 0, 30);
        line(-26, 44, -8, 28);
        line(26, 44, 8, 28);
        fill(13, 14, 9, 11, 0xc0504a);
        break;

      case 'alibi-books':
      case 'ledger': {
        const company = kind === 'alibi-books';
        const binding = company ? 0x744f28 : 0x2d5a3d;
        fill(-17, 7, 44, 48, 0x000000, 0.3);
        fill(-22, 2, 44, 48, color);
        stroke(-22, 2, 44, 48);
        fill(-22, 2, 8, 48, binding);
        fill(-8, 8, 24, 18, 0xf1ecd6);
        stroke(-8, 8, 24, 18);
        fill(2, 10, 3, 14, binding);
        fill(-2, 13, 11, 2, binding);
        fill(-2, 19, 11, 2, binding);

        for (let r = 0; r < 3; r++) {
          line(-8, 33 + r * 5, 16, 33 + r * 5);
        }

        if (company) {
          circle(19, 42, 9, 0x9e4537);
          circleLine(19, 42, 9);
          fill(15, 41, 8, 2, 0xffedbc);
          fill(18, 38, 2, 8, 0xffedbc);
        }
        break;
      }

      case 'paper':
        fill(-19, 9, 44, 46, 0x000000, 0.3);
        fill(-20, 2, 44, 46, 0xbfc3c4);
        stroke(-20, 2, 44, 46);
        fill(-24, 6, 44, 46, 0xe9e6da);
        stroke(-24, 6, 44, 46);
        fill(-21, 9, 38, 8, 0x2b3340);
        fill(-21, 20, 16, 12, 0x647585);
        for (let r = 0; r < 3; r++) {
          line(-2, 22 + r * 4, 16, 22 + r * 4);
          line(-21, 36 + r * 4, 16, 36 + r * 4);
        }
        break;

      case 'board':
      case 'boards':
        fill(-24, 9, 56, 44, 0x000000, 0.3);
        fill(-28, 3, 56, 44, 0x6b4529);
        stroke(-28, 3, 56, 44);
        fill(-24, 7, 48, 36, color);

        if (kind === 'boards') {
          g.lineStyle(2, 0x28232a, 1);
          for (let i = 1; i < 4; i++) {
            line(-24 + i * 12, 7, -24 + i * 12, 43);
            line(-24, 7 + i * 9, 24, 7 + i * 9);
          }
          circle(-12, 16, 3, 0xf0dfac);
          circle(12, 34, 3, 0xf0dfac);
        } else {
          fill(-20, 11, 15, 16, 0xf0dfac);
          fill(5, 22, 15, 15, 0xf0dfac);
          g.lineStyle(2, 0xa23232, 1);
          line(-12, 15, 12, 26);
          circle(-12, 15, 2.5, 0xa23232);
          circle(12, 26, 2.5, 0xa23232);
        }
        break;

      case 'owl_search':
        ellipse(3, 52, 42, 8, 0x000000, 0.3);
        ellipse(0, 29, 42, 43, 0x76553a);
        triangle(-21, 17, -18, 1, -6, 12, 0x76553a);
        triangle(21, 17, 18, 1, 6, 12, 0x76553a);
        g.strokeEllipse(cx, top + 29, 42, 43);
        circle(-10, 23, 10, 0xffffff);
        circle(10, 23, 10, 0xffffff);
        circleLine(-10, 23, 10);
        circleLine(10, 23, 10);
        circle(-10, 23, 4, INK);
        circle(10, 23, 4, INK);
        triangle(-5, 32, 5, 32, 0, 40, 0xe4b44d);
        break;

      case 'globe':
        ellipse(3, 52, 38, 8, 0x000000, 0.3);
        circle(0, 24, 23, color);
        g.fillStyle(0x5c9a63, 1);
        g.fillPoints(polygon([[-14, 12], [-4, 8], [-2, 18], [-9, 26], [-16, 22]]), true);
        g.fillPoints(polygon([[4, 22], [16, 18], [14, 32], [6, 36]]), true);
        circleLine(0, 24, 23);
        g.strokeEllipse(cx, top + 24, 22, 46);
        line(-23, 24, 23, 24);
        line(-14, 50, 14, 50);
        break;

      case 'trash': {
        ellipse(3, 52, 38, 8, 0x000000, 0.3);
        circle(-8, 9, 6, 0xf1ecd6);
        circle(6, 7, 5, 0xf1ecd6);
        circleLine(-8, 9, 6);
        circleLine(6, 7, 5);
        const shape = polygon([[-18, 14], [18, 14], [14, 50], [-14, 50]]);
        g.fillStyle(color, 1);
        g.fillPoints(shape, true);
        g.strokePoints(shape, true);
        fill(-22, 10, 44, 6, 0xa9b4bb);
        stroke(-22, 10, 44, 6);
        for (let r = -1; r <= 1; r++) line(r * 8, 20, r * 7, 46);
        break;
      }

      case 'audio': {
        fill(-26, 6, 52, 38, 0x20382c);
        stroke(-26, 6, 52, 38);
        g.lineStyle(2, 0x95e0a6, 1);
        const heights = [5, 10, 17, 8, 23, 13, 6, 16, 8];
        heights.forEach((height, i) => {
          line(-20 + i * 5, 25 - height / 2, -20 + i * 5, 25 + height / 2);
        });
        break;
      }

      case 'cat':
      default:
        fill(-21, 10, 52, 44, 0x000000, 0.3);
        fill(-26, 4, 52, 44, 0x5a3f2a);
        stroke(-26, 4, 52, 44);
        fill(-21, 9, 42, 34, 0x9ec1d9);
        triangle(-14, 22, -8, 11, -3, 21, color);
        triangle(14, 22, 8, 11, 3, 21, color);
        circle(0, 30, 13, color);
        fill(-7, 27, 3, 5, INK);
        fill(4, 27, 3, 5, INK);
        triangle(-2, 33, 2, 33, 0, 36, 0xd96c7a);
        g.lineStyle(1, INK, 1);
        line(-18, 33, -8, 34);
        line(18, 33, 8, 34);
        break;
    }
  }
}