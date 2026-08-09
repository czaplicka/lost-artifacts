import { saveManager } from './saveGameService.js';

export const SAVE_LOCATION_TYPES = Object.freeze([
  'office'
]);

function normalizeLocationType(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return SAVE_LOCATION_TYPES.includes(normalized)
    ? normalized
    : null;
}

function normalizeSaveCode(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  return normalized || fallback;
}

export class OfficeSaveUI {
  constructor(scene, options = {}) {
    this.scene = scene;

    const requestedLocationType = options.locationType ?? 'office';

    const locationType = normalizeLocationType(
      requestedLocationType
    );

    if (!locationType) {
      throw new Error(
        `[OfficeSaveUI] Invalid locationType "${requestedLocationType}". ` +
        `Expected one of: ${SAVE_LOCATION_TYPES.join(', ')}.`
      );
    }

    this.locationType = locationType;

    this.locationCode = normalizeSaveCode(
      options.locationCode,
      'agency_headquarters'
    );

    this.cityCode = normalizeSaveCode(
      options.cityCode,
      'hq'
    );

    this.button = null;
    this.panel = null;
    this.backdrop = null;
    this.slotButtons = [];
    this.statusText = null;

    this.isOpen = false;
    this.isSaving = false;
  }

  createButton() {
    const { height } = this.scene.scale;

    /*
     * Keep the Save button in its current position:
     * bottom-right area, x = 1780.
     */
    const buttonX = 1780;
    const buttonY = height - 66;

    const textureCandidates = [
      'btnSave',
    ];

    const textureKey = textureCandidates.find((key) => {
      return this.scene.textures.exists(key);
    });

    if (textureKey) {
      this.button = this.scene.add.image(
        buttonX,
        buttonY,
        textureKey,
      )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1000)
        .setScale(0.5)
        .setInteractive({
          useHandCursor: true,
        });

      this.button.on('pointerover', () => {
        if (this.scene.uiLocked || this.isOpen) {
          return;
        }

        this.button.setScale(0.54);
      });

      this.button.on('pointerout', () => {
        this.button.setScale(0.5);
      });
    } else {
      this.button = this.scene.add.text(
        buttonX,
        buttonY,
        'SAVE',
        {
          fontFamily: 'Special Elite, monospace',
          fontSize: '12px',
          color: '#f1d480',
          backgroundColor: '#1c1109',
          stroke: '#000000',
          strokeThickness: 2,
          padding: {
            left: 8,
            right: 8,
            top: 5,
            bottom: 5,
          },
        },
      )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1000)
        .setInteractive({
          useHandCursor: true,
        });

      this.button.on('pointerover', () => {
        if (this.scene.uiLocked || this.isOpen) {
          return;
        }

        this.button.setScale(1.08);
        this.button.setColor('#fff1b7');
      });

      this.button.on('pointerout', () => {
        this.button.setScale(1);
        this.button.setColor('#f1d480');
      });
    }

    this.button.on('pointerdown', () => {
      if (this.scene.uiLocked || this.isOpen) {
        return;
      }

      this.open();
    });
  }

  setLocked(isLocked) {
    if (!this.button) {
      return;
    }

    if (isLocked) {
      this.button.disableInteractive();
      this.button.setAlpha(0.4);
      return;
    }

    this.button.setInteractive({
      useHandCursor: true,
    });

    this.button.setAlpha(1);
  }

  async open() {
    if (this.isOpen || this.isSaving) {
      return;
    }

    this.isOpen = true;
    this.scene.applyLock(true);

    const { width, height } = this.scene.scale;

    /*
     * No setInteractive() here.
     * Otherwise the fullscreen backdrop can consume slot clicks.
     */
    this.backdrop = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.78,
    )
      .setScrollFactor(0)
      .setDepth(1500);

    this.panel = this.scene.add.container(
      width / 2,
      height / 2,
    )
      .setScrollFactor(0)
      .setDepth(1501);

    const panelBg = this.scene.add.rectangle(
      0,
      0,
      560,
      500,
      0x17100b,
      1,
    )
      .setStrokeStyle(4, 0xc99738, 1);

    const title = this.scene.add.text(
      0,
      -205,
      'AGENCY ARCHIVES',
      {
        fontFamily: 'Special Elite, monospace',
        fontSize: '31px',
        color: '#f2d989',
        stroke: '#000000',
        strokeThickness: 5,
      },
    ).setOrigin(0.5);

    const subtitle = this.scene.add.text(
      0,
      -163,
      'Choose a case file to save your investigation.',
      {
        fontFamily: 'Special Elite, monospace',
        fontSize: '19px',
        color: '#d4c4a6',
        align: 'center',
      },
    ).setOrigin(0.5);

    const closeButton = this.scene.add.text(
      235,
      -218,
      '×',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        color: '#f0c2b6',
      },
    )
      .setOrigin(0.5)
      .setInteractive({
        useHandCursor: true,
      });

    closeButton.on('pointerdown', () => {
      if (!this.isSaving) {
        this.close();
      }
    });

    closeButton.on('pointerover', () => {
      closeButton.setColor('#ffffff');
      closeButton.setScale(1.15);
    });

    closeButton.on('pointerout', () => {
      closeButton.setColor('#f0c2b6');
      closeButton.setScale(1);
    });

    this.statusText = this.scene.add.text(
      0,
      190,
      'Reading case files...',
      {
        fontFamily: 'Special Elite, monospace',
        fontSize: '18px',
        color: '#d8c49a',
        align: 'center',
        wordWrap: {
          width: 470,
        },
      },
    ).setOrigin(0.5);

    this.panel.add([
      panelBg,
      title,
      subtitle,
      closeButton,
      this.statusText,
    ]);

    try {
      const slots = await saveManager.listSlots();

      if (!this.isOpen || !this.panel) {
        return;
      }

      this.createSlotButtons(slots);

      this.setStatus(
        'Choose a save slot.',
        '#d8c49a',
      );
    } catch (error) {
      console.error(
        '[OfficeSaveUI] Failed to read save slots:',
        error,
      );

      this.createSlotButtons([]);

      this.setStatus(
        'Archive unavailable. You may still save locally.',
        '#ffbbb0',
      );
    }
  }

  createSlotButtons(slots) {
    const { width, height } = this.scene.scale;

    const panelX = width / 2;
    const panelY = height / 2;

    const slotY = [
      -95,
      5,
      105,
    ];

    for (let index = 0; index < 3; index += 1) {
      const slotKey = `slot_${index + 1}`;

      const slot = slots.find((item) => {
        return item.slotKey === slotKey;
      });

      const meta = this.getPreferredMeta(slot);

      const label = meta
        ? this.formatSlotLabel(index + 1, meta)
        : `SLOT ${index + 1}\nEmpty case file`;

      /*
       * Important:
       * - They are not children of this.panel.
       * - They use scrollFactor(0), so camera scroll does not move them.
       * - They are above the panel visually and for pointer input.
       */
      const buttonBg = this.scene.add.rectangle(
        panelX,
        panelY + slotY[index],
        470,
        76,
        0x24170e,
        1,
      )
        .setScrollFactor(0)
        .setDepth(1600)
        .setStrokeStyle(2, 0x8f6b35, 1)
        .setInteractive({
          useHandCursor: true,
        });

      const buttonText = this.scene.add.text(
        panelX,
        panelY + slotY[index],
        label,
        {
          fontFamily: 'Special Elite, monospace',
          fontSize: '18px',
          color: meta ? '#f1deb0' : '#a99a80',
          align: 'center',
          lineSpacing: 6,
        },
      )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1601);

      buttonBg.on('pointerover', () => {
        if (this.isSaving) {
          return;
        }

        buttonBg.setFillStyle(0x4a3219, 1);
        buttonBg.setStrokeStyle(2, 0xe0b354, 1);
        buttonText.setColor('#ffffff');
      });

      buttonBg.on('pointerout', () => {
        if (this.isSaving) {
          return;
        }

        buttonBg.setFillStyle(0x24170e, 1);
        buttonBg.setStrokeStyle(2, 0x8f6b35, 1);
        buttonText.setColor(meta ? '#f1deb0' : '#a99a80');
      });

      buttonBg.on('pointerdown', () => {
        console.log(
          '[OfficeSaveUI] Slot clicked:',
          slotKey,
        );

        this.setStatus(
          `Slot clicked: ${slotKey}`,
          '#f1d480',
        );

        this.saveToSlot(slotKey);
      });

      this.slotButtons.push({
        background: buttonBg,
        text: buttonText,
      });
    }
  }

  getPreferredMeta(slot) {
    if (!slot || slot.preferredSource === 'none') {
      return null;
    }

    if (slot.preferredSource === 'cloud') {
      return slot.cloudMeta;
    }

    return slot.localMeta;
  }

  formatSlotLabel(slotNumber, meta) {
    const city = meta.cityCode
      ? String(meta.cityCode).toUpperCase()
      : 'UNKNOWN CITY';

    const location = meta.locationCode
      ? String(meta.locationCode).replaceAll('_', ' ')
      : 'unknown location';

    const day = meta.dayNumber ?? 1;
    const hour = String(meta.inGameHour ?? 8).padStart(2, '0');

    return [
      `SLOT ${slotNumber} — ${city}`,
      `Day ${day}, ${hour}:00 — ${location}`,
    ].join('\n');
  }

  async saveToSlot(slotKey) {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;

    this.setSlotButtonsEnabled(false);

    this.setStatus(
      'Securing evidence...',
      '#f1d480',
    );

    try {
      console.log(
        '[OfficeSaveUI] Saving to slot:',
        slotKey,
      );

      const result = await saveManager.save(slotKey, {
        locationType: this.locationType,
        locationCode: this.locationCode,
        cityCode: this.cityCode,
        sceneKey: this.scene.scene.key,
      });

      console.log(
        '[OfficeSaveUI] Save result:',
        result,
      );

      const localSave = saveManager.safeReadLocal(slotKey);

      if (!localSave) {
        throw new Error(
          `Local save verification failed for ${slotKey}.`,
        );
      }

      if (result.mode === 'cloud+local') {
        this.setStatus(
          `Slot ${slotKey.replace('_', ' ').toUpperCase()} saved locally and in Agency Archives.`,
          '#a8e796',
        );
      } else if (result.mode === 'local-fallback') {
        this.setStatus(
          `Slot ${slotKey.replace('_', ' ').toUpperCase()} saved locally. Agency Archives are unavailable.`,
          '#f3d28a',
        );
      } else {
        this.setStatus(
          `Slot ${slotKey.replace('_', ' ').toUpperCase()} saved locally.`,
          '#a8e796',
        );
      }

      this.scene.time.delayedCall(2600, () => {
        this.close();
      });
    } catch (error) {
      console.error(
        '[OfficeSaveUI] Save failed:',
        error,
      );

      this.setStatus(
        `Save failed: ${error.message}`,
        '#ff9f91',
      );

      this.isSaving = false;
      this.setSlotButtonsEnabled(true);
    }
  }

  setSlotButtonsEnabled(enabled) {
    this.slotButtons.forEach((slotButton) => {
      if (!slotButton?.background) {
        return;
      }

      if (enabled) {
        slotButton.background.setInteractive({
          useHandCursor: true,
        });

        slotButton.background.setAlpha(1);
        slotButton.text.setAlpha(1);
      } else {
        slotButton.background.disableInteractive();

        slotButton.background.setAlpha(0.55);
        slotButton.text.setAlpha(0.55);
      }
    });
  }

  setStatus(message, color = '#d8c49a') {
    if (!this.statusText) {
      return;
    }

    this.statusText.setText(message);
    this.statusText.setColor(color);
  }

  close() {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.isSaving = false;

    this.slotButtons.forEach((slotButton) => {
      if (slotButton.background?.active) {
        slotButton.background.removeAllListeners();
        slotButton.background.destroy();
      }

      if (slotButton.text?.active) {
        slotButton.text.destroy();
      }
    });

    this.slotButtons = [];

    if (this.panel) {
      this.panel.destroy(true);
      this.panel = null;
    }

    if (this.backdrop) {
      this.backdrop.destroy();
      this.backdrop = null;
    }

    this.statusText = null;

    this.scene.applyLock(false);
  }

  destroy() {
    this.close();

    if (!this.button) {
      return;
    }

    this.button.removeAllListeners();

    if (this.button.active && this.button.scene) {
      this.button.destroy();
    }

    this.button = null;
  }
}