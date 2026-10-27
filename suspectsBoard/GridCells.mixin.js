import { COLORS } from './gridConstants.js';
import { formatCellValue } from './gridHelpers.js';

const LONG_FIELDS = new Set([
  'material_profile',
  'dust_profile'
]);

const WIDE_FIELD_WIDTHS = {
  material_profile: 360,
  dust_profile: 340,
  fiber_profile: 260,
  skills: 280,
  habitus: 260,
  alibi: 340,
  motive: 340
};

export const GridCellsMixin = {
  drawGrid(L) {
    const g = L.grid;
    const { nameW, headerH, sceneRowH, rowH } = L;
    const fields = this.rows;

    this.gridCluesById = new Map();
    this.gridCrimeSceneFields = new Set();

    for (const clue of this.clueCards) {
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

    const baseColW = Phaser.Math.Clamp(
      Math.floor(bodyW / Math.max(1, fields.length)),
      Math.max(160, L.minColW),
      Math.max(160, L.maxColW)
    );

    let totalWidth = 0;

    const columns = fields.map((field) => {
      const width = Math.max(
        baseColW,
        WIDE_FIELD_WIDTHS[field.id] || 0
      );

      const column = {
        field,
        width,
        centerX: totalWidth + width / 2
      };

      totalWidth += width;
      return column;
    });

    this.minScrollX = Math.min(0, bodyW - totalWidth);
    this.minScrollY = Math.min(
      0,
      bodyH - this.suspects.length * rowH
    );

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

    const sceneBg = this.add
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
      sceneBg,
      sceneLabel
    ]);

    columns.forEach(({ field, width, centerX }) => {
      const bg = this.add
        .rectangle(
          centerX,
          headerH / 2,
          width,
          headerH,
          COLORS.headerSuspect,
          1
        )
        .setStrokeStyle(1, 0x8b704b, 1);

      const text = this.add
        .text(centerX, headerH / 2, field.label, {
          fontFamily: 'PressStart2P',
          fontSize: '9px',
          color: '#f5e7c6',
          align: 'center',
          wordWrap: {
            width: width - 14,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0.5);

      if (
        LONG_FIELDS.has(field.id) &&
        text.height > headerH - 8
      ) {
        text.setScale((headerH - 8) / text.height);
      }

      this.headerContainer.add([bg, text]);

      this.createEvidenceCell({
        container: this.sceneContainer,
        region: this.regions.scene,
        x: centerX,
        y: sceneRowH / 2,
        width,
        height: sceneRowH,
        field: field.id,
        suspect: null,
        alternate: false
      });
    });

    this.suspects.forEach((suspect, index) => {
      const y = index * rowH;

      this.createSuspectNameCell(
        suspect,
        y,
        nameW,
        rowH,
        index
      );

      columns.forEach(({ field, width, centerX }) => {
        this.createEvidenceCell({
          container: this.bodyContainer,
          region: this.regions.body,
          x: centerX,
          y: y + rowH / 2,
          width,
          height: rowH,
          field: field.id,
          suspect,
          alternate: index % 2 === 1
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

  createSuspectNameCell(suspect, y, nameW, rowH, index) {
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
          : index % 2
            ? 0x211816
            : 0x281d18,
        1
      )
      .setStrokeStyle(1, COLORS.line, 1);

    const btnW = 92;
    const textW = nameW - btnW - 30;

    const name = this.add
      .text(10, y + 6, this.getSuspectDisplayName(suspect), {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: unlikely ? '#a38b85' : '#fff0cb',
        wordWrap: {
          width: textW,
          useAdvancedWrap: true
        }
      })
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

    const x = nameW - btnW / 2 - 8;
    const cy = y + rowH / 2;

    const btn = this.add
      .rectangle(
        x,
        cy,
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
      .text(x, cy, unlikely ? 'UNLIKELY' : 'POSSIBLE', {
        fontFamily: 'PressStart2P',
        fontSize: '7px',
        color: unlikely ? '#ffd1c8' : '#d5ffd2'
      })
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
      if (
        this.modalOpen ||
        this.dragMoved ||
        !this.inRect(pointer, this.regions.names)
      ) {
        return;
      }

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

    const placed = this.gridCluesById.get(
      this.placedCluesByCell[this.getCellKey(target)]
    );

    const auto = suspect
      ? this.getAutoSuspectValue(suspect, field)
      : null;

    const hasCard =
      !suspect && this.gridCrimeSceneFields.has(field);

    const noData = !suspect && !hasCard && !placed;

    const unlikely =
      Boolean(suspect) &&
      this.markedUnlikelyBySuspectId[suspect.id] === true;

    const waiting =
      Boolean(this.gridSelectedClue) &&
      !placed &&
      auto === null &&
      this.isTargetForClue(this.gridSelectedClue, target);

    const value =
      auto || (placed ? formatCellValue(placed.value) : '');

    const clickable = auto === null && !noData;

    const fill = waiting
      ? COLORS.cellWaiting
      : auto
        ? COLORS.cellAuto
        : placed
          ? COLORS.cellFilled
          : alternate
            ? COLORS.cellB
            : COLORS.cellA;

    const bg = this.add
      .rectangle(x, y, width, height, fill, 1)
      .setStrokeStyle(
        waiting ? 3 : 1,
        waiting ? COLORS.gold : COLORS.line,
        1
      );

    if (clickable) {
      bg.setInteractive({ useHandCursor: true });
    }

    const long = LONG_FIELDS.has(field);

    const text = this.add
      .text(x, y, value || (noData ? '—' : '?'), {
        fontFamily: value ? 'SpecialElite' : 'PressStart2P',
        fontSize: value
          ? long
            ? '14px'
            : '20px'
          : '14px',
        color: value ? '#f6dfa3' : '#756351',
        align: 'center',
        wordWrap: {
          width: width - 12,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5);

    if (long && value) {
      for (
        let size = 13;
        text.height > height - 10 && size >= 9;
        size--
      ) {
        text.setFontSize(size);
      }

      const scale = Math.min(
        1,
        (height - 10) / Math.max(1, text.height),
        (width - 12) / Math.max(1, text.width)
      );

      if (scale < 1) {
        text.setScale(scale);
      }
    }

    if (unlikely) {
      bg.setAlpha(0.45);
      text.setAlpha(0.45);
    }

    if (clickable) {
      bg.on('pointerover', () => {
        if (!this.modalOpen) {
          bg.setFillStyle(
            placed ? 0x4d3a20 : COLORS.cellHover,
            1
          );
        }
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(fill, 1);
      });

      bg.on('pointerup', (pointer) => {
        if (
          this.modalOpen ||
          this.dragMoved ||
          !this.inRect(pointer, region)
        ) {
          return;
        }

        this.onCellClick(target, placed);
      });
    }

    container.add([bg, text]);
  }
};