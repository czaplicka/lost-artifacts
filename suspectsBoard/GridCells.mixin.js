import { COLORS } from './gridConstants.js';
import { formatCellValue } from './gridHelpers.js';

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

    this.uiRoot.add(this.add.rectangle(g.x + g.w / 2, g.y + g.h / 2,
      g.w, g.h, 0x171112, 1).setStrokeStyle(2, 0x725d40, 1));
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

    const fixedLabel = (y, height, value, fill) => {
      const bg = this.add.rectangle(g.x + nameW / 2, y + height / 2, nameW, height, fill, 1)
        .setStrokeStyle(1, 0x8b704b, 1);
      const text = this.add.text(g.x + nameW / 2, y + height / 2, value, {
        fontFamily: 'PressStart2P', fontSize: '10px', color: '#ffdc73',
        align: 'center', wordWrap: { width: nameW - 24, useAdvancedWrap: true }
      }).setOrigin(0.5);
      this.uiRoot.add([bg, text]);
    };
    fixedLabel(g.y, headerH, 'SUSPECTS', 0x38291d);
    fixedLabel(sceneY, sceneRowH, 'CRIME SCENE', COLORS.headerScene);

    columns.forEach(({ field, width, centerX }) => {
      const bg = this.add.rectangle(centerX, headerH / 2, width, headerH, COLORS.headerSuspect, 1)
        .setStrokeStyle(1, 0x8b704b, 1);
      const text = this.add.text(centerX, headerH / 2, field.label, {
        fontFamily: 'PressStart2P', fontSize: '10px', color: '#f5e7c6', align: 'center',
        wordWrap: { width: width - 28, useAdvancedWrap: true }
      }).setOrigin(0.5);
      this.headerContainer.add([bg, text]);
      this.createEvidenceCell({ container: this.sceneContainer, region: this.regions.scene,
        x: centerX, y: sceneRowH / 2, width, height: sceneRowH,
        field: field.id, suspect: null, alternate: false });
    });
    this.suspects.forEach((suspect, index) => {
      const y = index * rowH;
      this.createSuspectNameCell(suspect, y, nameW, rowH, index);
      columns.forEach(({ field, width, centerX }) => {
        this.createEvidenceCell({ container: this.bodyContainer, region: this.regions.body,
          x: centerX, y: y + rowH / 2, width, height: rowH,
          field: field.id, suspect, alternate: index % 2 === 1 });
      });
    });
    if (this.minScrollX < 0 || this.minScrollY < 0) {
      this.uiRoot.add(this.add.text(g.x + g.w - 8, g.y + g.h - 12,
        'DRAG TABLE / SHIFT + WHEEL: HORIZONTAL', {
          fontFamily: 'SpecialElite', fontSize: '13px', color: '#d9c998',
          backgroundColor: '#171112', padding: { x: 6, y: 3 }
        }).setOrigin(1, 0.5).setDepth(5));
    }
  },

  createSuspectNameCell(suspect, y, nameW, rowH, index) {
    const unlikely = this.markedUnlikelyBySuspectId[suspect.id] === true;
    const bg = this.add.rectangle(nameW / 2, y + rowH / 2, nameW, rowH,
      unlikely ? 0x3a1b18 : index % 2 ? 0x211816 : 0x281d18, 1)
      .setStrokeStyle(1, COLORS.line, 1);
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
    const x = nameW / 2, cy = y + rowH - 24;
    const btn = this.add.rectangle(x, cy, 116, 32,
      unlikely ? COLORS.noFill : COLORS.okFill, 1)
      .setStrokeStyle(2, unlikely ? COLORS.noStroke : COLORS.okStroke, 1)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(x, cy, unlikely ? 'UNLIKELY' : 'POSSIBLE', {
      fontFamily: 'PressStart2P', fontSize: '8px', color: unlikely ? '#ffd1c8' : '#d5ffd2'
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(unlikely ? 0x823b31 : 0x35613a, 1));
    btn.on('pointerout', () => btn.setFillStyle(unlikely ? COLORS.noFill : COLORS.okFill, 1));
    btn.on('pointerup', pointer => {
      if (this.modalOpen || this.dragMoved || !this.inRect(pointer, this.regions.names)) return;
      this.toggleSuspectMark(suspect.id);
    });
    this.nameContainer.add([bg, name, occupation, btn, label]);
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
    const fill = waiting ? COLORS.cellWaiting : auto ? COLORS.cellAuto : placed ? COLORS.cellFilled :
      alternate ? COLORS.cellB : COLORS.cellA;
    const bg = this.add.rectangle(x, y, width, height, fill, 1)
      .setStrokeStyle(waiting ? 3 : 1, waiting ? COLORS.gold : COLORS.line, 1);
    if (clickable) bg.setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, value || (noData ? '—' : '?'), {
      fontFamily: value ? 'SpecialElite' : 'PressStart2P',
      fontSize: value ? `${CELL_FONT}px` : '16px', lineSpacing: 3,
      color: value ? '#f6dfa3' : '#9c8974', align: 'center',
      wordWrap: { width: width - CELL_PADDING * 2, useAdvancedWrap: true }
    }).setOrigin(0.5);
    // Marked suspects remain readable; the name cell carries the stronger status colour.
    if (unlikely) { bg.setAlpha(0.65); text.setAlpha(0.8); }
    if (clickable) {
      bg.on('pointerover', () => {
        if (!this.modalOpen) bg.setFillStyle(placed ? 0x4d3a20 : COLORS.cellHover, 1);
      });
      bg.on('pointerout', () => bg.setFillStyle(fill, 1));
      bg.on('pointerup', pointer => {
        if (this.modalOpen || this.dragMoved || !this.inRect(pointer, region)) return;
        this.onCellClick(target, placed);
      });
    }
    container.add([bg, text]);
  }
};