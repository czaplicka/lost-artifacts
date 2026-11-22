import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { ABOUT_TIP, PRIVACY_TIP } from './ComputerSearchShared.js';
import { bindSearchClick } from './ComputerSearchActions.js';
const FILE = 'ui/pi-computer/ComputerSearchHome.js';
const t = id => __dialogueText(FILE, id);

export class ComputerSearchHome {
  queryBar(x, y, width, options = {}) {
    const { large = false, button = true } = options;
    const d = this.ui.drawing;
    const height = large ? 46 : 38;
    const inputWidth = button ? Math.max(120, width - 118) : width;
    d.bevel(x, y, inputWidth, height, 0xffffff, true);
    const iconSize = large ? 24 : 20;
    if (!this.art('search_magnifier', x + 12, y + (height - iconSize) / 2, iconSize, iconSize)) {
      this.drawMagnifier(x + 12, y + (height - iconSize) / 2, iconSize);
    }
    let currentX = x + 14 + iconSize + 10;
    if (!this.terms.length) {
      const hint = d.text(currentX, y + (height - 18) / 2, t('t_79f1571485d358debca5'), large ? 16 : 14, '#a19f90');
      d.fit(hint, hint.text, Math.max(1, inputWidth - (currentX - x) - 14));
    }
    const chipMax = Math.max(24, (inputWidth - (currentX - x) - 50) / 2 - 8);
    for (const id of this.terms) {
      const keyword = this.definition.keywords.find(item => item.id === id);
      if (!keyword) continue;
      currentX += this.chip(currentX, y + 6, keyword.label, {
        color: this.cloudColor(keyword), height: height - 12,
        maxWidth: chipMax, onClick: () => this.selectKeyword(id)
      }) + 8;
    }
    if (this.terms.length) {
      const clear = d.text(x + inputWidth - 28, y + (height - 24) / 2, 'x', 22, '#8a8878').setPadding(6, 0, 6, 0);
      bindSearchClick(this, clear, () => this.clearQuery(), () => this.terms.length > 0);
    }
    if (button) d.button(x + inputWidth + 8, y + Math.round((height - 32) / 2), t('t_49c266baaaa70981ea18'), () => this.search(), this.terms.length > 0);
  }

  suggestions(x, y, width, options = {}) {
    const d = this.ui.drawing;
    const bottomLimit = options.bottom ?? Infinity;
    const known = this.definition.keywords.filter(keyword => this.progress.known.includes(keyword.id));
    if (!known.length) {
      if (y + 36 <= bottomLimit) {
        const message = d.text(x + width / 2, y, 'Your Field Notes are empty. Go and find a clue first.', 14, '#8a8d80', width)
          .setOrigin(0.5, 0).setAlign('center');
        message.setMaxLines?.(2);
      }
      return Math.min(bottomLimit, y + 48);
    }
    const open = known.filter(keyword => !this.terms.includes(keyword.id));
    if (!open.length || y + 50 > bottomLimit) return y;
    d.text(x, y, t('t_53caa00ae8da56773560'), 13, '#7a7d72');
    y += 24;
    const full = this.terms.length >= 2;
    const rowHeight = 32;
    const maxRows = Math.max(1, Math.min(3, Math.floor((bottomLimit - y - 20) / rowHeight)));
    let currentX = x;
    let row = 0;
    let shown = 0;
    for (const keyword of open) {
      const chipWidth = this.chipWidth(keyword.label, 14, width);
      if (currentX > x && currentX + chipWidth > x + width) {
        if (row + 1 >= maxRows) break;
        row++;
        currentX = x;
      }
      if (y + row * rowHeight + 26 > bottomLimit) break;
      this.chip(currentX, y + row * rowHeight, keyword.label, {
        color: full ? 0x9aa096 : this.cloudColor(keyword), maxWidth: width,
        onClick: full ? null : () => this.selectKeyword(keyword.id)
      });
      currentX += chipWidth + 8;
      shown++;
    }
    let bottom = y + (row + 1) * rowHeight;
    if (shown < open.length && bottom + 16 <= bottomLimit) {
      d.text(x, bottom, `${t('t_a318c24216defe206fee')}${open.length - shown}${t('t_bc84c886066afca08239')}`, 12, '#8a8d80');
      bottom += 20;
    }
    return bottom;
  }

  drawSearch(area) {
    if (this.view === 'home') this.drawHome(area);
    else this.drawResults(area);
  }

  drawHome(area) {
    const d = this.ui.drawing;
    const centerX = area.x + area.w / 2;
    const footerY = area.y + area.h - 26;
    const barWidth = Math.max(120, Math.min(820, area.w - 64));
    const barX = centerX - barWidth / 2;
    const logoHeight = Math.max(64, Math.min(110, area.h * 0.22));
    const logoWidth = Math.min(540, barWidth, logoHeight * 540 / 140);
    let y = area.y + 14;
    if (this.textureOk('search_logo')) {
      this.art('search_logo', centerX - logoWidth / 2, y, logoWidth, logoHeight);
    } else {
      const size = Math.max(24, Math.min(40, logoHeight * 0.36));
      const owlScale = logoHeight / 130;
      const owlWidth = 88 * owlScale;
      const total = owlWidth + 18 + this.brandWidth(size);
      const startX = centerX - total / 2;
      this.drawOwl(startX + owlWidth / 2, y + logoHeight / 2, owlScale);
      this.brand(startX + owlWidth + 18, y + logoHeight / 2 - size / 2, size);
    }
    y += logoHeight + 6;
    const tagline = d.text(centerX, y, this.tagline, 15, '#7a7d72').setOrigin(0.5, 0);
    d.fit(tagline, this.tagline, barWidth);
    y += 30;
    this.queryBar(barX, y, barWidth, { large: true, button: false });
    y += 58;
    d.button(centerX - 165, y, t('t_6f6ca128fbbdf22488f9'), () => this.search(), this.terms.length > 0);
    d.button(centerX + 5, y, t('t_b17b3d04a36aad75c3ef'), () => this.hooty());
    y += 48;
    y = this.suggestions(barX, y, barWidth, { bottom: footerY - 18 }) + 10;
    const recent = this.recentSearches(3);
    if (recent.length && y + 52 < footerY - 12) {
      d.text(barX, y, t('t_dd533644289cc811322f'), 13, '#7a7d72');
      y += 24;
      let currentX = barX;
      for (const terms of recent) {
        const label = this.termLabels(terms).join(' + ');
        const width = this.chipWidth(label, 14, barWidth);
        if (currentX > barX && currentX + width > barX + barWidth) {
          currentX = barX;
          y += 32;
        }
        if (y + 26 > footerY - 12) break;
        this.chip(currentX, y, label, { color: 0x6b7a74, maxWidth: barWidth, onClick: () => this.runQuery(terms) });
        currentX += width + 8;
      }
    }
    d.text(centerX - 150, footerY, 'Owl Search', 13, '#81847c');
    for (const [label, offset, line] of [
      [t('t_4efca0d10c5feb8e9b35'), 0, ABOUT_TIP],
      [t('t_54a57c3147c49f33de58'), 80, PRIVACY_TIP]
    ]) {
      const link = d.text(centerX - 40 + offset, footerY, label, 13, '#4b6d9a');
      bindSearchClick(this, link, () => this.say(line), () => this.tip !== line);
    }
    if (this.tip) this.drawHomeMessage(area);
  }

  drawHomeMessage(area) {
    const d = this.ui.drawing;
    const message = String(this.tip);
    if (this._homeMessageText !== message) {
      this._homeMessageText = message;
      this._homeMessagePage = 0;
    }
    const width = Math.max(80, Math.min(680, area.w - 32));
    const height = Math.max(100, Math.min(224, area.h - 24));
    const x = area.x + (area.w - width) / 2;
    const y = area.y + (area.h - height) / 2;
    const shade = d.rectangle(area.x, area.y, area.w, area.h, 0x14201b, 0.3).setInteractive();
    shade.on('pointerdown', (pointer, lx, ly, event) => event?.stopPropagation());
    d.rectangle(x + 5, y + 6, width, height, 0x000000, 0.25);
    d.bevel(x, y, width, height, 0xeee9d7);
    d.rectangle(x + 4, y + 4, width - 8, 28, 0x244452);
    d.pixel(x + 12, y + 13, 'OWL message', 9, '#fff0cc');
    this.browserButton(x + width - 38, y + 4, 32, 26, 'X', () => {
      this.tip = '';
      this._homeMessagePage = 0;
      this.refresh();
    });
    const pages = this.paginate([[message]], Math.max(1, width - 40), Math.max(25, height - 94));
    this._homeMessagePage = Math.max(0, Math.min(this._homeMessagePage || 0, pages.length - 1));
    for (const word of pages[this._homeMessagePage]) {
      d.text(x + 20 + word.x, y + 45 + word.y, word.text, 16, '#5a4d3b');
    }
    if (pages.length > 1) {
      this.browserButton(x + 14, y + height - 36, 42, 26, '<', () => {
        this._homeMessagePage--;
        this.refresh();
      }, this._homeMessagePage > 0);
      d.text(x + 70, y + height - 31, `${this._homeMessagePage + 1} / ${pages.length}`, 14, '#5a4d3b');
      this.browserButton(x + width - 56, y + height - 36, 42, 26, '>', () => {
        this._homeMessagePage++;
        this.refresh();
      }, this._homeMessagePage < pages.length - 1);
    }
  }
}
