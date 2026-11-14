import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { COLORS } from './gridConstants.js';
import { formatCellValue } from './gridHelpers.js';
import { THEME, AVATAR_COLORS, bevelBox, hatch, hashString, tapeStrip } from './gridTheme.js';

const WIDE_FIELD_WIDTHS = {
  material_profile: 440, dust_profile: 420, fiber_profile: 360,
  skills: 380, habitus: 360, alibi: 440, motive: 440
};
const CELL_FONT = 18;
const CELL_PADDING = 18;

export const GridCellsMixin = {
  drawGrid(L) {
    const g = L.grid;
    const fields = this.rows;
    // Keep the frozen name column compact enough to leave a usable table viewport.
    const nameW = Math.min(300, Math.max(190, Math.floor(g.w * 0.34)));
    const headerH = 64;
    this.gridCluesById = new Map();
    this.gridCrimeSceneFields = new Set();
    for (const clue of this.clueCards) {
      if (!this.gridCluesById.has(clue.id)) this.gridCluesById.set(clue.id, clue);
      if (clue.type === 'crime_scene_fact') this.gridCrimeSceneFields.add(clue.field);
    }
    this.gridSelectedClue = this.gridCluesById.get(this.selectedClueId) || null;

    const probe = this.add.text(0, 0, '', {
      fontFamily: 'SpecialElite', fontSize: `${CELL_FONT}px`,
      lineSpacing: 3, wordWrap: { width: 250, useAdvancedWrap: true }
    }).setVisible(false);
    const measure = (value, width) => {
      probe.setWordWrapWidth(Math.max(40, width), true);
      probe.setText(String(value ?? ''));
      return probe.height;
    };
    const getValue = (field, suspect) => {
      const target = { type: suspect ? 'suspect' : 'crime_scene', suspectId: suspect?.id ?? null, field };
      const placed = this.gridCluesById.get(this.placedCluesByCell[this.getCellKey(target)]);
      const auto = suspect ? this.getAutoSuspectValue(suspect, field) : null;
      return auto || (placed ? formatCellValue(placed.value) : '');
    };
    const sceneTextLimit = Math.max(32, Math.min(118, g.h - headerH - 110));
    let totalWidth = 0;
    const columns = fields.map(field => {
      const sceneValue = getValue(field.id, null);
      const suspectValues = this.suspects.map(s => getValue(field.id, s));
      let width = WIDE_FIELD_WIDTHS[field.id] || 260;
      // Grow the column, never shrink the font to make a paragraph fit.
      for (let attempt = 0; attempt < 80; attempt++) {
        const inner = width - CELL_PADDING * 2;
        const sceneFits = !sceneValue || measure(sceneValue, inner) <= sceneTextLimit;
        const suspectsFit = suspectValues.every(value => !value || measure(value, inner) <= 130);
        if (sceneFits && suspectsFit) break;
        width += 80;
      }
      const column = { field, width, centerX: totalWidth + width / 2, sceneValue, suspectValues };
      totalWidth += width;
      return column;
    });
    let rowH = 112;
    let sceneRowH = 98;
    for (const col of columns) {
      if (col.sceneValue) sceneRowH = Math.max(sceneRowH,
        measure(col.sceneValue, col.width - CELL_PADDING * 2) + 30);
      for (const value of col.suspectValues) {
        if (value) rowH = Math.max(rowH, measure(value, col.width - CELL_PADDING * 2) + 30);
      }
    }
    const nameTextW = nameW - 24;
    for (const suspect of this.suspects) {
      const nameHeight = measure(this.getSuspectDisplayName(suspect), nameTextW);
      probe.setFontSize(14);
      const jobHeight = measure(this.getSuspectOccupation(suspect), nameTextW);
      probe.setFontSize(CELL_FONT);
      rowH = Math.max(rowH, nameHeight + jobHeight + 62);
    }
    probe.destroy();
    rowH = Math.ceil(rowH);
    sceneRowH = Math.ceil(sceneRowH);
    L.nameW = nameW; L.headerH = headerH; L.sceneRowH = sceneRowH; L.rowH = rowH;

    this.uiRoot.add(bevelBox(this, g.x, g.y, g.w, g.h, { fill: 0x171112, stroke: 0x725d40 }));

    const bodyX = g.x + nameW;
    const bodyW = Math.max(1, g.w - nameW);
    const sceneY = g.y + headerH;
    const bodyY = sceneY + sceneRowH;
    const bodyH = Math.max(1, g.h - headerH - sceneRowH);
    this.minScrollX = Math.min(0, bodyW - totalWidth);
    this.minScrollY = Math.min(0, bodyH - this.suspects.length * rowH);
    this.scrollX = Phaser.Math.Clamp(this.scrollX, this.minScrollX, 0);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, this.minScrollY, 0);
    this.regions.body = { x: bodyX, y: bodyY, w: bodyW, h: bodyH };
    this.regions.scene = { x: bodyX, y: sceneY, w: bodyW, h: sceneRowH };
    this.regions.header = { x: bodyX, y: g.y, w: bodyW, h: headerH };
    this.regions.names = { x: g.x, y: bodyY, w: nameW, h: bodyH };
    this.gridOrigin = { bodyX, bodyY, sceneY, headerY: g.y, nameX: g.x };
    this.bodyContainer = this.add.container(bodyX, bodyY);
    this.headerContainer = this.add.container(bodyX, g.y);
    this.sceneContainer = this.add.container(bodyX, sceneY);
    this.nameContainer = this.add.container(g.x, bodyY);
    this.bodyContainer.setMask(this.makeMask(bodyX, bodyY, bodyW, bodyH));
    this.headerContainer.setMask(this.makeMask(bodyX, g.y, bodyW, headerH));
    this.sceneContainer.setMask(this.makeMask(bodyX, sceneY, bodyW, sceneRowH));
    this.nameContainer.setMask(this.makeMask(g.x, bodyY, nameW, bodyH));
    this.uiRoot.add([this.bodyContainer, this.headerContainer, this.sceneContainer, this.nameContainer]);

    /* ---- frozen corner labels ---- */
    const fixedLabel = (y, height, value, fill, withMagnifier) => {
      const bg = this.add.rectangle(g.x + nameW / 2, y + height / 2, nameW, height, fill, 1)
        .setStrokeStyle(1, 0x8b704b, 1);
      const rule = this.add.rectangle(g.x + nameW / 2, y + height - 1.5, nameW, 3, THEME.gold, 0.85);
      const text = this.add.text(g.x + nameW / 2 + (withMagnifier ? 8 : 0), y + height / 2, value, {
        fontFamily: 'PressStart2P', fontSize: '10px', color: '#ffdc73',
        align: 'center', wordWrap: { width: nameW - 24, useAdvancedWrap: true }
      }).setOrigin(0.5);
      this.uiRoot.add([bg, rule, text]);
      if (withMagnifier) {
        const icon = this.add.graphics();
        const ix = g.x + 22, iy = y + height / 2 - 3;
        icon.lineStyle(2, THEME.goldBright, 1);
        icon.strokeCircle(ix, iy, 6);
        icon.lineBetween(ix + 4.5, iy + 4.5, ix + 11, iy + 11);
        this.uiRoot.add(icon);
      }
    };
    fixedLabel(g.y, headerH, 'SUSPECTS', 0x38291d, false);
    fixedLabel(sceneY, sceneRowH, __dialogueText("suspectsBoard/GridCells.mixin.js", "t_149dbafdfa19fa96352e"), COLORS.headerScene, true);

    /* ---- header + crime scene row ---- */
    columns.forEach(({ field, width, centerX }) => {
      const bg = this.add.rectangle(centerX, headerH / 2, width, headerH, COLORS.headerSuspect, 1)
        .setStrokeStyle(1, 0x8b704b, 1);
      const rule = this.add.rectangle(centerX, headerH - 1.5, width, 3, THEME.gold, 0.85);
      const text = this.add.text(centerX, headerH / 2, field.label, {
        fontFamily: 'PressStart2P', fontSize: '10px', color: '#f5e7c6', align: 'center',
        wordWrap: { width: width - 28, useAdvancedWrap: true }
      }).setOrigin(0.5);
      this.headerContainer.add([bg, rule, text]);
      this.createEvidenceCell({ container: this.sceneContainer, region: this.regions.scene,
        x: centerX, y: sceneRowH / 2, width, height: sceneRowH,
        field: field.id, suspect: null, alternate: false });
    });

    /* ---- suspect rows ---- */
    this.suspects.forEach((suspect, index) => {
      const y = index * rowH;
      this.createSuspectNameCell(suspect, y, nameW, rowH, index);
      columns.forEach(({ field, width, centerX }) => {
        this.createEvidenceCell({ container: this.bodyContainer, region: this.regions.body,
          x: centerX, y: y + rowH / 2, width, height: rowH,
          field: field.id, suspect, alternate: index % 2 === 1 });
      });
    });

    /* ---- hover crosshair (drawn above the cells, low alpha) ---- */
    const totalH = this.suspects.length * rowH;
    const hoverCol = this.add.rectangle(0, 0, 10, totalH, THEME.goldBright, 0.07)
      .setOrigin(0).setVisible(false);
    const hoverRow = this.add.rectangle(0, 0, totalWidth, rowH, THEME.goldBright, 0.07)
      .setOrigin(0).setVisible(false);
    this.bodyContainer.add([hoverCol, hoverRow]);
    this.gridHover = { col: hoverCol, row: hoverRow, bodyH: totalH };

    /* ---- decorations above the containers ---- */
    this.uiRoot.add(tapeStrip(this, g.x + 1, bodyY - 5, g.w - 2, 5, 12).setAlpha(0.9));
    [0.28, 0.16, 0.07].forEach((alpha, i) => {
      this.uiRoot.add(
        this.add.rectangle(bodyX + i * 3, g.y, 3, g.h, 0x000000, alpha).setOrigin(0)
      );
    });
    this.uiRoot.add(this.add.rectangle(bodyX, g.y, 2, g.h, 0x8b704b, 0.9).setOrigin(0));

    const scrollX = this.minScrollX < 0, scrollY = this.minScrollY < 0;
    if (scrollX) {
      this.addScrollbar('gridH', {
        axis: 'h', start: bodyX, fixed: g.y + g.h - 8,
        trackLen: bodyW - (scrollY ? 10 : 0), viewport: bodyW,
        content: bodyW - this.minScrollX,
        getScroll: () => this.scrollX, getMin: () => this.minScrollX
      });
    }
    if (scrollY) {
      this.addScrollbar('gridV', {
        axis: 'v', start: bodyY, fixed: g.x + g.w - 8,
        trackLen: bodyH - (scrollX ? 10 : 0), viewport: bodyH,
        content: bodyH - this.minScrollY,
        getScroll: () => this.scrollY, getMin: () => this.minScrollY
      });
    }
    if (scrollX || scrollY) {
      this.uiRoot.add(this.add.text(g.x + g.w - 16, g.y + g.h - 18,
        __dialogueText("suspectsBoard/GridCells.mixin.js", "t_bd2413479c75695b401f"), {
          fontFamily: 'SpecialElite', fontSize: '12px', color: '#d9c998',
          backgroundColor: '#171112', padding: { x: 6, y: 3 }
        }).setOrigin(1, 1).setDepth(5));
    }
  },

  createSuspectNameCell(suspect, y, nameW, rowH, index) {
    const unlikely = this.markedUnlikelyBySuspectId[suspect.id] === true;
    const parts = [];

    parts.push(
      this.add.rectangle(nameW / 2, y + rowH / 2, nameW, rowH,
        unlikely ? 0x3a1b18 : index % 2 ? 0x211816 : 0x281d18, 1)
        .setStrokeStyle(1, COLORS.line, 1)
    );
    if (unlikely) {
      parts.push(hatch(this, 0, y, nameW, rowH, { spacing: 9, color: COLORS.noStroke, alpha: 0.12 }));
    }
    parts.push(
      this.add.rectangle(0, y, 5, rowH, unlikely ? COLORS.noStroke : COLORS.okStroke, 1).setOrigin(0)
    );

    const name = this.add.text(12, y + 12, this.getSuspectDisplayName(suspect), {
      fontFamily: 'SpecialElite', fontSize: '18px', lineSpacing: 3,
      color: unlikely ? '#bca29a' : '#fff0cb',
      wordWrap: { width: nameW - 24, useAdvancedWrap: true }
    });
    const occupation = this.add.text(12, name.y + name.height + 5,
      this.getSuspectOccupation(suspect), {
        fontFamily: 'SpecialElite', fontSize: '14px', lineSpacing: 3,
        color: unlikely ? '#a28c84' : '#c9b58a',
        wordWrap: { width: nameW - 24, useAdvancedWrap: true }
      });
    parts.push(name, occupation);

    // Mugshot (bottom-right)
    const ax = nameW - 12 - 32, ay = y + rowH - 8 - 32;
    const mug = this.add.graphics();
    mug.fillStyle(unlikely ? 0x3a2927
      : AVATAR_COLORS[hashString(suspect.id || '') % AVATAR_COLORS.length], 1);
    mug.fillRect(ax, ay, 32, 32);
    mug.fillStyle(0xffffff, unlikely ? 0.12 : 0.28);
    mug.fillCircle(ax + 16, ay + 12, 6);
    mug.fillTriangle(ax + 3, ay + 32, ax + 29, ay + 32, ax + 16, ay + 19);
    mug.lineStyle(1, 0xffffff, 0.25);
    for (let i = 1; i <= 3; i++) mug.lineBetween(ax + 28, ay + i * 8, ax + 32, ay + i * 8);
    mug.lineStyle(2, 0x8b704b, 1);
    mug.strokeRect(ax, ay, 32, 32);
    if (unlikely) {
      mug.lineStyle(3, COLORS.noStroke, 0.9);
      mug.lineBetween(ax + 3, ay + 3, ax + 29, ay + 29);
      mug.lineBetween(ax + 29, ay + 3, ax + 3, ay + 29);
    }
    parts.push(mug);

    // Possible / Unlikely toggle (bottom-left)
    const bx = 70, cy = y + rowH - 24;
    const btn = this.add.rectangle(bx, cy, 116, 32,
      unlikely ? COLORS.noFill : COLORS.okFill, 1)
      .setStrokeStyle(2, unlikely ? COLORS.noStroke : COLORS.okStroke, 1)
      .setInteractive({ useHandCursor: true });
    const led = this.add.rectangle(bx - 46, cy, 8, 8,
      unlikely ? COLORS.noStroke : COLORS.okStroke, 1);
    const label = this.add.text(bx + 6, cy, unlikely ? __dialogueText("suspectsBoard/GridCells.mixin.js", "t_b389fa48055a366d973b") : __dialogueText("suspectsBoard/GridCells.mixin.js", "t_49ed77f8cd66eb4ca16f"), {
      fontFamily: 'PressStart2P', fontSize: '8px', color: unlikely ? '#ffd1c8' : '#d5ffd2'
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(unlikely ? 0x823b31 : 0x35613a, 1));
    btn.on('pointerout', () => btn.setFillStyle(unlikely ? COLORS.noFill : COLORS.okFill, 1));
    btn.on('pointerup', pointer => {
      if (this.modalOpen || this.dragMoved || !this.inRect(pointer, this.regions.names)) return;
      this.toggleSuspectMark(suspect.id);
    });
    parts.push(btn, led, label);

    this.nameContainer.add(parts);
  },

  createEvidenceCell({ container, region, x, y, width, height, field, suspect, alternate }) {
    const target = { type: suspect ? 'suspect' : 'crime_scene', suspectId: suspect?.id ?? null, field };
    const placed = this.gridCluesById.get(this.placedCluesByCell[this.getCellKey(target)]);
    const auto = suspect ? this.getAutoSuspectValue(suspect, field) : null;
    const hasCard = !suspect && this.gridCrimeSceneFields.has(field);
    const noData = !suspect && !hasCard && !placed;
    const unlikely = Boolean(suspect) && this.markedUnlikelyBySuspectId[suspect.id] === true;
    const waiting = Boolean(this.gridSelectedClue) && !placed && auto === null &&
      this.isTargetForClue(this.gridSelectedClue, target);
    const value = auto || (placed ? formatCellValue(placed.value) : '');
    const clickable = auto === null && !noData;

    const baseFill = noData ? 0x181212
      : !suspect ? 0x2f2314
      : alternate ? COLORS.cellB : COLORS.cellA;
    const fill = waiting ? COLORS.cellWaiting : auto ? COLORS.cellAuto : placed ? COLORS.cellFilled : baseFill;

    const parts = [];
    const bg = this.add.rectangle(x, y, width, height, fill, 1)
      .setStrokeStyle(waiting ? 3 : 1, waiting ? COLORS.gold : COLORS.line, 1);
    if (clickable) bg.setInteractive({ useHandCursor: true });
    parts.push(bg);

    // Subtle inner frame + top shine
    if (!noData) {
      parts.push(
        this.add.rectangle(x, y, width - 10, height - 10).setStrokeStyle(1, 0xffffff, value ? 0.04 : 0.07),
        this.add.rectangle(x, y - height / 2 + 2, width - 4, 1, 0xffffff, 0.05)
      );
    }

    // Corner marker: blue = already on file, gold/green = clue placed from the lab
    const marker = auto ? THEME.blue : placed ? (suspect ? THEME.green : THEME.gold) : null;
    if (marker !== null) {
      const tri = this.add.graphics();
      const lx = x - width / 2 + 1, ty = y - height / 2 + 1;
      tri.fillStyle(marker, 1);
      tri.fillTriangle(lx, ty, lx + 14, ty, lx, ty + 14);
      parts.push(tri);
    }

    const showPlaceHint = waiting && !value;
    const label = showPlaceHint ? __dialogueText("suspectsBoard/GridCells.mixin.js", "t_ba1431e78244ee016973") : (value || (noData ? '—' : '?'));
    const text = this.add.text(x, y, label, showPlaceHint ? {
      fontFamily: 'PressStart2P', fontSize: '8px', color: '#ffdc73', align: 'center', lineSpacing: 6
    } : {
      fontFamily: value ? 'SpecialElite' : 'PressStart2P',
      fontSize: value ? `${CELL_FONT}px` : '16px', lineSpacing: 3,
      color: value ? (suspect ? '#f6dfa3' : '#ffe9a8') : '#9c8974', align: 'center',
      wordWrap: { width: width - CELL_PADDING * 2, useAdvancedWrap: true }
    }).setOrigin(0.5);
    if (value) text.setShadow(1, 1, '#000000', 2, false, true);
    parts.push(text);

    if (waiting) {
      const glow = this.add.rectangle(x, y, width - 4, height - 4).setStrokeStyle(2, 0xffdc73, 1);
      parts.push(glow);
      this.trackTween({
        targets: showPlaceHint ? [glow, text] : [glow],
        alpha: { from: 0.3, to: 1 }, duration: 650, yoyo: true, repeat: -1
      });
    }

    // Marked suspects remain readable; the name cell carries the stronger status colour.
    if (unlikely) { bg.setAlpha(0.65); text.setAlpha(0.8); }

    if (clickable) {
      const showHover = () => {
        const hv = this.gridHover;
        if (!hv) return;
        hv.col.setPosition(x - width / 2, 0).setSize(width, hv.bodyH).setVisible(true);
        if (suspect) hv.row.setPosition(0, y - height / 2).setSize(hv.row.width, height).setVisible(true);
        else hv.row.setVisible(false);
      };
      const hideHover = () => {
        this.gridHover?.col.setVisible(false);
        this.gridHover?.row.setVisible(false);
      };
      bg.on('pointerover', () => {
        if (this.modalOpen) return;
        bg.setFillStyle(placed ? 0x4d3a20 : COLORS.cellHover, 1);
        showHover();
      });
      bg.on('pointerout', () => { bg.setFillStyle(fill, 1); hideHover(); });
      bg.on('pointerup', pointer => {
        if (this.modalOpen || this.dragMoved || !this.inRect(pointer, region)) return;
        this.onCellClick(target, placed);
      });
    }
    container.add(parts);
  }
};