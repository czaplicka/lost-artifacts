import { MONTHLY_SPILL_ISSUE as ISSUE } from './MonthlySpillIssue.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { isEditableTarget } from '../../config/newsstandConfig.js';

const WIDTH = 740;
const HEIGHT = 1000;
const MARGIN = 44;
const INNER = WIDTH - MARGIN * 2;
const GAP = 12;
const INK = '#27231e';
const MUTED = '#605447';
const PAPER = 0xf4ecd8;
const RULE = 0x4f4438;

export class MonthlySpillReader {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.page = 0;
    this.root = null;
    this.previousOpening = false;

    this.onKey = event => {
      if (!this.isOpen || isEditableTarget(event) || event.repeat ||
          event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault();
        this.turn(event.code === 'ArrowRight' ? 1 : -1);
      }
    };

    scene.input.keyboard?.on('keydown', this.onKey);
  }

  open() {
    if (this.isOpen || !ISSUE.pages.length) return;

    const saved = Number(gameState.monthlyMagazineReader?.[ISSUE.id]);
    this.page = Number.isInteger(saved)
      ? Math.max(0, Math.min(ISSUE.pages.length - 1, saved))
      : 0;

    this.previousOpening = this.scene.isOpeningNewspaper;
    this.scene.hotspots?.setDebugMode(false);
    this.scene.isOpeningNewspaper = true;
    this.isOpen = true;
    this.root = this.scene.add.container(0, 0)
      .setDepth(2000)
      .setScrollFactor(0);

    this.rustle();
    this.render();
  }

  save() {
    const marks = gameState.monthlyMagazineReader;
    if (!marks || typeof marks !== 'object' || Array.isArray(marks)) {
      gameState.monthlyMagazineReader = {};
    }

    gameState.monthlyMagazineReader[ISSUE.id] = this.page;
    requestAutosave();
  }

  rustle() {
    if (this.scene.cache.audio?.exists('paper_rustle')) {
      this.scene.sound.play('paper_rustle', { volume: 0.2 });
    }
  }

  groups() {
    const { width, height } = this.scene.scale;
    const count = ISSUE.pages.length;

    if (width < 760 || width < height * 1.15) {
      return ISSUE.pages.map((_, index) => [index]);
    }

    const groups = [[0]];
    for (let i = 1; i < count - 1; i += 2) {
      groups.push(i + 1 < count - 1 ? [i, i + 1] : [i]);
    }
    if (count > 1) groups.push([count - 1]);
    return groups;
  }

  groupIndex(groups) {
    return Math.max(0, groups.findIndex(group => group.includes(this.page)));
  }

  goTo(index) {
    if (!this.isOpen || !Number.isInteger(index) ||
        index < 0 || index >= ISSUE.pages.length || index === this.page) return;

    this.page = index;
    this.save();
    this.rustle();
    this.render();
  }

  turn(direction) {
    const groups = this.groups();
    const next = groups[this.groupIndex(groups) + direction];
    if (next) this.goTo(next[0]);
  }

  resize() {
    if (this.isOpen) this.render();
  }

  close() {
    if (!this.isOpen) return;
    this.save();
    this.rustle();
    this.dispose();
  }

  dispose() {
    this.root?.destroy(true);
    this.root = null;
    this.isOpen = false;
    this.scene.isOpeningNewspaper = Boolean(this.previousOpening);
  }

  destroy() {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    if (this.isOpen) this.dispose();
  }

  rect(parent, x, y, width, height, color, alpha = 1) {
    const shape = this.scene.add.rectangle(x, y, width, height, color, alpha)
      .setOrigin(0);
    parent.add(shape);
    return shape;
  }

  text(parent, x, y, value, width, height, size, options = {}) {
    const text = this.scene.add.text(x, y, String(value ?? ''), {
      fontFamily: options.pixel ? 'PressStart2P' : 'SpecialElite',
      fontSize: `${size}px`,
      color: options.color || INK,
      align: options.align || 'left',
      lineSpacing: options.lineSpacing ?? 5,
      wordWrap: { width, useAdvancedWrap: true }
    });

    while ((text.height > height || text.width > width) && size > 12) {
      text.setFontSize(--size);
    }

    if (text.height > height || text.width > width) {
      text.setScale(Math.min(width / text.width, height / text.height));
    }

    parent.add(text);
    return text;
  }

  control(parent, x, y, width, label, action, enabled = true) {
    const box = this.rect(parent, x, y, width, 36, enabled ? 0x3a3329 : 0x25231e);
    const caption = this.text(parent, 0, 0, label, width - 12, 22, 11, {
      pixel: true,
      color: enabled ? '#f4ecd8' : '#988b77'
    });

    caption.setPosition(x + (width - caption.displayWidth) / 2, y + 12);

    if (enabled) {
      box.setInteractive({ useHandCursor: true });
      box.on('pointerup', (_pointer, _x, _y, event) => {
        event?.stopPropagation();
        action();
      });
    }
  }

  render() {
    if (!this.root) return;
    this.root.removeAll(true);

    const { width, height } = this.scene.scale;
    const backdrop = this.rect(this.root, 0, 0, width, height, 0x16130f, 0.97)
      .setInteractive();

    for (const name of ['pointerdown', 'pointerup', 'pointermove', 'wheel']) {
      backdrop.on(name, (...args) => args.at(-1)?.stopPropagation?.());
    }

    const groups = this.groups();
    const groupIndex = this.groupIndex(groups);
    const group = groups[groupIndex];
    const spreadWidth = group.length * WIDTH + (group.length - 1) * GAP;
    const paperTop = 51;
    const paperHeight = Math.max(1, height - 104);
    const scale = Math.min(Math.max(1, width - 20) / spreadWidth, paperHeight / HEIGHT);

    const stage = this.scene.add.container(
      (width - spreadWidth * scale) / 2,
      paperTop + (paperHeight - HEIGHT * scale) / 2
    ).setScale(scale);

    this.root.add(stage);
    group.forEach((index, n) => this.drawPage(stage, n * (WIDTH + GAP), index));

    this.control(this.root, width - 87, 8, 77, 'CLOSE', () => this.close());

    const navY = height - 44;
    const navWidth = Math.min(112, Math.max(58, Math.floor((width - 105) / 2)));
    this.control(this.root, 10, navY, navWidth, '< PREV', () => this.turn(-1), groupIndex > 0);
    this.control(this.root, width - 10 - navWidth, navY, navWidth, 'NEXT >',
      () => this.turn(1), groupIndex < groups.length - 1);

    const label = `${group.map(index => index + 1).join('–')} / ${ISSUE.pages.length}`;
    const count = this.text(this.root, 0, navY + 10, label,
      Math.max(25, width - 2 * navWidth - 28), 20, 16, { color: '#f4ecd8' });
    count.setX((width - count.displayWidth) / 2);
  }

  drawPage(parent, x, index) {
    const page = this.scene.add.container(x, 0);
    parent.add(page);

    this.rect(page, 5, 6, WIDTH, HEIGHT, 0x000000, 0.25);
    this.rect(page, 0, 0, WIDTH, HEIGHT, PAPER);

    const data = ISSUE.pages[index];
    const cover = data.type === 'cover';

    this.text(page, MARGIN, 30, cover ? ISSUE.edition : ISSUE.title,
      INNER, 26, 18, { color: MUTED });
    this.rect(page, MARGIN, 64, INNER, 2, RULE);

    if (cover) this.drawFront(page, data);
    else if (data.type === 'contents') this.drawContents(page, data);
    else if (data.type === 'horoscope') this.drawHoroscope(page, data);
    else this.drawArticle(page, data);

    this.rect(page, MARGIN, 941, INNER, 2, RULE);
    this.text(page, MARGIN, 957, ISSUE.edition, INNER - 60, 25, 16, { color: MUTED });
    this.text(page, WIDTH - MARGIN - 32, 955, index + 1, 32, 28, 20);
  }

  drawFront(page, data) {
    this.text(page, MARGIN, 84, ISSUE.title.toUpperCase(), INNER, 100, 63);
    this.text(page, MARGIN, 190, ISSUE.tagline, INNER, 40, 23, { color: MUTED });
    this.rect(page, MARGIN, 240, INNER, 4, RULE);
    this.rect(page, MARGIN, 249, INNER, 1, RULE);

    this.text(page, MARGIN, 282, data.headline, INNER, 245, 76);
    this.text(page, MARGIN, 542, data.deck, INNER, 120, 31);
    this.rect(page, MARGIN, 688, INNER, 2, RULE);
    this.text(page, MARGIN, 709, 'INSIDE THIS ISSUE', INNER, 30, 20);

    (data.teasers || []).forEach((line, i) => {
      this.text(page, MARGIN, 754 + i * 44, line, INNER, 40, 24);
    });
  }

  drawHeading(page, data) {
    this.text(page, MARGIN, 87, data.section, INNER, 28, 19, { color: MUTED });
    this.text(page, MARGIN, 127, data.headline, INNER, 154, 55);
    this.text(page, MARGIN, 298, data.deck, INNER, 92, 27, { color: MUTED });
    this.rect(page, MARGIN, 400, INNER, 1, RULE);
  }

  drawArticle(page, data) {
    this.drawHeading(page, data);

    this.columns(page, data.body, 426, data.quote || data.fine ? 336 : 476);

    if (data.quote) {
      this.rect(page, MARGIN, 784, INNER, 1, RULE);
      this.text(page, MARGIN, 804, `“${data.quote}”`, INNER, 70, 25);
    }
    if (data.fine) {
      this.text(page, MARGIN, 884, data.fine, INNER, 40, 17, { color: MUTED });
    }
  }

  columns(page, paragraphs, y, height) {
    const body = Array.isArray(paragraphs) ? paragraphs.join('\n\n') : String(paragraphs ?? '');
    if (!body.trim()) return;

    const middle = Math.floor(body.length / 2);
    const breakpoints = [...body.matchAll(/\s+/g)].map(match => match.index);
    const splitAt = breakpoints.reduce((best, index) =>
      Math.abs(index - middle) < Math.abs(best - middle) ? index : best,
    body.length);

    const left = body.slice(0, splitAt).trim();
    const right = body.slice(splitAt).trim();

    if (!left || !right) {
      this.text(page, MARGIN, y, body, INNER, height, 26);
      return;
    }

    const gutter = 28;
    const columnWidth = (INNER - gutter) / 2;
    this.rect(page, MARGIN + columnWidth + gutter / 2, y, 1, height, RULE, 0.3);

    const a = this.text(page, MARGIN, y, left, columnWidth, height, 25);
    const b = this.text(page, MARGIN + columnWidth + gutter, y,
      right, columnWidth, height, 25);
    const sharedSize = Math.min(a.displayHeight / a.height * parseFloat(a.style.fontSize),
      b.displayHeight / b.height * parseFloat(b.style.fontSize));

    a.setScale(1).setFontSize(sharedSize);
    b.setScale(1).setFontSize(sharedSize);
  }

  drawContents(page, data) {
    this.drawHeading(page, data);
    this.columns(page, data.body, 424, 172);

    if (data.quote) {
      this.text(page, MARGIN, 615, `“${data.quote}”`, INNER, 55, 23, { color: MUTED });
    }

    this.text(page, MARGIN, 687, 'IN THIS ISSUE', INNER, 28, 20);
    const rows = data.contents || [];
    const rowH = Math.min(38, 212 / Math.max(1, rows.length));

    rows.forEach(([number, label], i) => {
      const y = 719 + i * rowH;
      const row = this.rect(page, MARGIN, y, INNER, rowH, i % 2 ? 0xe7ddc5 : 0xefe6d0)
        .setInteractive({ useHandCursor: true });
      this.text(page, MARGIN + 8, y + 4, label, INNER - 64, rowH - 7, 21);
      this.text(page, WIDTH - MARGIN - 45, y + 4, number, 37, rowH - 7, 21);
      row.on('pointerup', (_pointer, _x, _y, event) => {
        event?.stopPropagation();
        this.goTo(Number(number) - 1);
      });
    });
  }

  drawHoroscope(page, data) {
    this.drawHeading(page, data);

    const rows = data.entries || [];
    const rowH = Math.min(58, 510 / Math.max(1, rows.length));
    rows.forEach(([sign, prediction], i) => {
      const y = 414 + i * rowH;
      this.rect(page, MARGIN, y + rowH - 2, INNER, 1, RULE, 0.35);
      this.text(page, MARGIN, y + 7, sign, 143, rowH - 10, 19);
      this.text(page, MARGIN + 155, y + 7, prediction, INNER - 155, rowH - 10, 20);
    });
  }
}