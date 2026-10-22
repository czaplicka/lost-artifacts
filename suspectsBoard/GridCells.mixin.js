import { COLORS } from './gridConstants.js';
import { formatCellValue } from './gridHelpers.js';

export const GridCellsMixin = {
  drawGrid(L) {
    const g = L.grid;
    const { nameW, headerH, sceneRowH, rowH } = L;
    const fields = this.rows;

    this.gridCluesById = new Map();
    this.gridCrimeSceneFields = new Set();

    for (const clue of this.clueCards) {
      // Zachowujemy wynik pierwszego dopasowania, jak wcześniej find().
      if (!this.gridCluesById.has(clue.id)) {
        this.gridCluesById.set(clue.id, clue);
      }

      if (clue.type === 'crime_scene_fact') {
        this.gridCrimeSceneFields.add(clue.field);
      }
    }

    this.gridSelectedClue =
      this.gridCluesById.get(this.selectedClueId) || null;

    this.uiRoot.add(
      this.add
        .rectangle(
          g.x + g.w / 2,
          g.y + g.h / 2,
          g.w,
          g.h,
          0x171112,
          1
        )
        .setStrokeStyle(2, 0x725d40, 1)
    );

    const bodyX = g.x + nameW;
    const bodyW = g.w - nameW;
    const sceneY = g.y + headerH;
    const bodyY = sceneY + sceneRowH;
    const bodyH = g.h - headerH - sceneRowH;

    const colW = Phaser.Math.Clamp(
      Math.floor(bodyW / Math.max(1, fields.length)),
      L.minColW,
      L.maxColW
    );

    const contentW = fields.length * colW;
    const contentH = this.suspects.length * rowH;

    this.minScrollX = Math.min(0, bodyW - contentW);
    this.minScrollY = Math.min(0, bodyH - contentH);

    this.scrollX = Phaser.Math.Clamp(
      this.scrollX,
      this.minScrollX,
      0
    );

    this.scrollY = Phaser.Math.Clamp(
      this.scrollY,
      this.minScrollY,
      0
    );

    this.regions.body = {
      x: bodyX,
      y: bodyY,
      w: bodyW,
      h: bodyH
    };

    this.regions.scene = {
      x: bodyX,
      y: sceneY,
      w: bodyW,
      h: sceneRowH
    };

    this.regions.header = {
      x: bodyX,
      y: g.y,
      w: bodyW,
      h: headerH
    };

    this.regions.names = {
      x: g.x,
      y: bodyY,
      w: nameW,
      h: bodyH
    };

    this.gridOrigin = {
      bodyX,
      bodyY,
      sceneY,
      headerY: g.y,
      nameX: g.x
    };

    this.bodyContainer = this.add.container(bodyX, bodyY);
    this.headerContainer = this.add.container(bodyX, g.y);
    this.sceneContainer = this.add.container(bodyX, sceneY);
    this.nameContainer = this.add.container(g.x, bodyY);

    this.bodyContainer.setMask(
      this.makeMask(bodyX, bodyY, bodyW, bodyH)
    );

    this.headerContainer.setMask(
      this.makeMask(bodyX, g.y, bodyW, headerH)
    );

    this.sceneContainer.setMask(
      this.makeMask(bodyX, sceneY, bodyW, sceneRowH)
    );

    this.nameContainer.setMask(
      this.makeMask(g.x, bodyY, nameW, bodyH)
    );

    this.uiRoot.add([
      this.bodyContainer,
      this.headerContainer,
      this.sceneContainer,
      this.nameContainer
    ]);

    const corner = this.add
      .rectangle(
        g.x + nameW / 2,
        g.y + headerH / 2,
        nameW,
        headerH,
        0x38291d,
        1
      )
      .setStrokeStyle(1, 0x8b704b, 1);

    const cornerText = this.add
      .text(
        g.x + nameW / 2,
        g.y + headerH / 2,
        'SUSPECTS',
        {
          fontFamily: 'PressStart2P',
          fontSize: '9px',
          color: '#ffdc73'
        }
      )
      .setOrigin(0.5);

    const sceneLabelBg = this.add
      .rectangle(
        g.x + nameW / 2,
        sceneY + sceneRowH / 2,
        nameW,
        sceneRowH,
        COLORS.headerScene,
        1
      )
      .setStrokeStyle(1, 0x8b704b, 1);

    const sceneLabel = this.add
      .text(
        g.x + nameW / 2,
        sceneY + sceneRowH / 2,
        'CRIME SCENE',
        {
          fontFamily: 'PressStart2P',
          fontSize: '10px',
          color: '#ffdc73'
        }
      )
      .setOrigin(0.5);

    this.uiRoot.add([
      corner,
      cornerText,
      sceneLabelBg,
      sceneLabel
    ]);

    fields.forEach((row, index) => {
      const cx = index * colW + colW / 2;

      const headerBg = this.add
        .rectangle(
          cx,
          headerH / 2,
          colW,
          headerH,
          COLORS.headerSuspect,
          1
        )
        .setStrokeStyle(1, 0x8b704b, 1);

      const headerText = this.add
        .text(cx, headerH / 2, row.label, {
          fontFamily: 'PressStart2P',
          fontSize: '9px',
          color: '#f5e7c6',
          align: 'center',
          wordWrap: {
            width: colW - 14,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0.5);

      this.headerContainer.add([headerBg, headerText]);

      this.createEvidenceCell({
        container: this.sceneContainer,
        region: this.regions.scene,
        x: cx,
        y: sceneRowH / 2,
        width: colW,
        height: sceneRowH,
        field: row.id,
        suspect: null,
        alternate: false
      });
    });

    this.suspects.forEach((suspect, rowIndex) => {
      const y = rowIndex * rowH;

      this.createSuspectNameCell(
        suspect,
        y,
        nameW,
        rowH,
        rowIndex
      );

      fields.forEach((row, index) => {
        this.createEvidenceCell({
          container: this.bodyContainer,
          region: this.regions.body,
          x: index * colW + colW / 2,
          y: y + rowH / 2,
          width: colW,
          height: rowH,
          field: row.id,
          suspect,
          alternate: rowIndex % 2 === 1
        });
      });
    });

    if (this.minScrollX < 0 || this.minScrollY < 0) {
      this.uiRoot.add(
        this.add
          .text(
            g.x + g.w - 8,
            g.y + g.h - 12,
            'DRAG OR SCROLL TABLE',
            {
              fontFamily: 'PressStart2P',
              fontSize: '6px',
              color: '#aa9263'
            }
          )
          .setOrigin(1, 0.5)
          .setDepth(5)
      );
    }
  },

  createSuspectNameCell(suspect, y, nameW, rowH, rowIndex) {
    const unlikely =
      this.markedUnlikelyBySuspectId[suspect.id] === true;

    const bg = this.add
      .rectangle(
        nameW / 2,
        y + rowH / 2,
        nameW,
        rowH,
        unlikely
          ? 0x3a1b18
          : rowIndex % 2
            ? 0x211816
            : 0x281d18,
        1
      )
      .setStrokeStyle(1, COLORS.line, 1);

    const btnW = 92;
    const textW = nameW - btnW - 30;

    const name = this.add
      .text(
        10,
        y + 6,
        this.getSuspectDisplayName(suspect),
        {
          fontFamily: 'SpecialElite',
          fontSize: '16px',
          color: unlikely ? '#a38b85' : '#fff0cb',
          wordWrap: {
            width: textW,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0, 0);

    const occupation = this.add
      .text(
        10,
        name.y + name.height + 1,
        this.getSuspectOccupation(suspect),
        {
          fontFamily: 'SpecialElite',
          fontSize: '12px',
          color: unlikely ? '#85726d' : '#b9a57a',
          wordWrap: {
            width: textW,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0, 0);

    const btnX = nameW - btnW / 2 - 8;
    const btnY = y + rowH / 2;

    const btn = this.add
      .rectangle(
        btnX,
        btnY,
        btnW,
        30,
        unlikely ? COLORS.noFill : COLORS.okFill,
        1
      )
      .setStrokeStyle(
        2,
        unlikely ? COLORS.noStroke : COLORS.okStroke,
        1
      )
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(
        btnX,
        btnY,
        unlikely ? 'UNLIKELY' : 'POSSIBLE',
        {
          fontFamily: 'PressStart2P',
          fontSize: '7px',
          color: unlikely ? '#ffd1c8' : '#d5ffd2'
        }
      )
      .setOrigin(0.5);

    btn.on('pointerover', () => {
      btn.setFillStyle(
        unlikely ? 0x823b31 : 0x35613a,
        1
      );
    });

    btn.on('pointerout', () => {
      btn.setFillStyle(
        unlikely ? COLORS.noFill : COLORS.okFill,
        1
      );
    });

    btn.on('pointerup', (pointer) => {
      if (this.modalOpen || this.dragMoved) return;
      if (!this.inRect(pointer, this.regions.names)) return;

      this.toggleSuspectMark(suspect.id);
    });

    this.nameContainer.add([
      bg,
      name,
      occupation,
      btn,
      label
    ]);
  },

  createEvidenceCell({
    container,
    region,
    x,
    y,
    width,
    height,
    field,
    suspect,
    alternate
  }) {
    const target = suspect
      ? {
          type: 'suspect',
          suspectId: suspect.id,
          field
        }
      : {
          type: 'crime_scene',
          suspectId: null,
          field
        };

    const key = this.getCellKey(target);

    const placedClue = this.gridCluesById.get(
      this.placedCluesByCell[key]
    );

    const autoValue = suspect
      ? this.getAutoSuspectValue(suspect, field)
      : null;

    const sceneHasCard =
      !suspect && this.gridCrimeSceneFields.has(field);

    const noData =
      !suspect && !sceneHasCard && !placedClue;

    const unlikely =
      Boolean(suspect) &&
      this.markedUnlikelyBySuspectId[suspect.id] === true;

    const selectedClue = this.gridSelectedClue;

    const waiting =
      Boolean(selectedClue) &&
      !placedClue &&
      autoValue === null &&
      this.isTargetForClue(selectedClue, target);

    const displayValue =
      autoValue ||
      (placedClue ? formatCellValue(placedClue.value) : '');

    const clickable = autoValue === null && !noData;

    const baseFill = waiting
      ? COLORS.cellWaiting
      : autoValue
        ? COLORS.cellAuto
        : placedClue
          ? COLORS.cellFilled
          : alternate
            ? COLORS.cellB
            : COLORS.cellA;

    const bg = this.add
      .rectangle(x, y, width, height, baseFill, 1)
      .setStrokeStyle(
        waiting ? 3 : 1,
        waiting ? COLORS.gold : COLORS.line,
        1
      );

    if (clickable) {
      bg.setInteractive({ useHandCursor: true });
    }

    const text = this.add
      .text(
        x,
        y,
        displayValue || (noData ? '—' : '?'),
        {
          fontFamily: displayValue
            ? 'SpecialElite'
            : 'PressStart2P',
          fontSize: displayValue ? '20px' : '14px',
          color: displayValue ? '#f6dfa3' : '#756351',
          align: 'center',
          wordWrap: {
            width: width - 12,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5);

    if (unlikely) {
      bg.setAlpha(0.45);
      text.setAlpha(0.45);
    }

    if (clickable) {
      bg.on('pointerover', () => {
        if (this.modalOpen) return;

        bg.setFillStyle(
          placedClue ? 0x4d3a20 : COLORS.cellHover,
          1
        );
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(baseFill, 1);
      });

      bg.on('pointerup', (pointer) => {
        if (this.modalOpen || this.dragMoved) return;
        if (!this.inRect(pointer, region)) return;

        this.onCellClick(target, placedClue);
      });
    }

    container.add([bg, text]);
  }
};