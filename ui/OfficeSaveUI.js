import { saveManager } from '../saveGameService.js';

export const SAVE_LOCATION_TYPES = Object.freeze([
  'office',
  'hotel'
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

  return value.trim().toLowerCase() || fallback;
}

export class OfficeSaveUI {
  constructor(scene, options = {}) {
    this.scene = scene;

    const requestedType =
      options.locationType ?? 'office';

    this.locationType =
      normalizeLocationType(requestedType);

    if (!this.locationType) {
      throw new Error(
        `[OfficeSaveUI] Invalid locationType "${requestedType}". ` +
        `Expected: ${SAVE_LOCATION_TYPES.join(', ')}.`
      );
    }

    this.locationCode = normalizeSaveCode(
      options.locationCode,
      this.locationType === 'hotel'
        ? 'hotel_room'
        : 'agency_headquarters'
    );

    this.cityCode = normalizeSaveCode(
      options.cityCode,
      this.locationType === 'hotel'
        ? 'unknown_city'
        : 'hq'
    );

    this.button = null;
    this.panel = null;
    this.backdrop = null;
    this.slotButtons = [];
    this.statusText = null;

    this.isOpen = false;
    this.isSaving = false;

    this.destroyed = false;
    this._openToken = null;
    this._closeTimer = null;
    this._buttonLocked = false;
    this._buttonBaseScale = 1;
  }

  _isCurrentOpening(token) {
    return Boolean(
      !this.destroyed &&
      this.isOpen &&
      this._openToken === token &&
      this.panel?.active
    );
  }

  _notifyPanelState() {
    if (!this.scene) {
      return;
    }

    this.scene.events?.emit(
      'ui-panel-state-changed',
      {
        panel: 'save',
        isOpen: this.isOpen
      }
    );

    if (
      typeof this.scene.refreshPanelLock === 'function'
    ) {
      this.scene.refreshPanelLock();
      return;
    }

    // Zgodność z obecną wersją OfficeScene i HotelScene.
    const hud =
      this.scene.getPlayerHud?.() ??
      this.scene.getPlayerHudScene?.();

    const locked = Boolean(
      this.isOpen ||
      this.scene.agencyLedgerUI?.isOpen ||
      hud?.isAnyPanelOpen?.()
    );

    this.scene.applyLock?.(locked);
  }

  createButton() {
    if (this.destroyed || this.button?.active) {
      return;
    }

    const { width, height } = this.scene.scale;

    const x = Math.min(1780, width - 95);
    const y = height - 66;

    const hasTexture =
      this.scene.textures.exists('btnSave');

    this._buttonBaseScale = hasTexture ? 0.5 : 1;

    if (hasTexture) {
      this.button = this.scene.add.image(
        x,
        y,
        'btnSave'
      ).setScale(this._buttonBaseScale);
    } else {
      this.button = this.scene.add.text(
        x,
        y,
        'SAVE',
        {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '12px',
          color: '#f1d480',
          backgroundColor: '#1c1109',
          stroke: '#000000',
          strokeThickness: 2,
          padding: {
            left: 8,
            right: 8,
            top: 5,
            bottom: 5
          }
        }
      );
    }

    this.button
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({
        useHandCursor: true
      });

    this.button.on('pointerover', () => {
      if (
        this.destroyed ||
        this._buttonLocked ||
        this.scene.uiLocked ||
        this.isOpen ||
        this.isSaving
      ) {
        return;
      }

      this.button.setScale(
        this._buttonBaseScale * 1.08
      );

      if (!hasTexture) {
        this.button.setColor('#fff1b7');
      }
    });

    this.button.on('pointerout', () => {
      if (!this.button?.active) {
        return;
      }

      this.button.setScale(
        this._buttonBaseScale
      );

      if (!hasTexture) {
        this.button.setColor('#f1d480');
      }
    });

    this.button.on('pointerdown', () => {
      if (
        this.destroyed ||
        this._buttonLocked ||
        this.scene.uiLocked ||
        this.isOpen ||
        this.isSaving
      ) {
        return;
      }

      void this.open();
    });

    this.setLocked(this._buttonLocked);
  }

  setLocked(locked) {
    this._buttonLocked = Boolean(locked);

    if (!this.button?.active) {
      return;
    }

    this.button.setScale(
      this._buttonBaseScale
    );

    if (this._buttonLocked) {
      this.button
        .disableInteractive()
        .setAlpha(0.4);
    } else {
      this.button
        .setInteractive({
          useHandCursor: true
        })
        .setAlpha(1);
    }
  }

  async open() {
    if (
      this.destroyed ||
      this.isOpen ||
      this.isSaving ||
      !this.scene?.sys?.isActive()
    ) {
      return;
    }

    const token = Symbol('save-panel');
    this._openToken = token;

    this.isOpen = true;

    const { width, height } = this.scene.scale;

    this.backdrop = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.78
    )
      .setScrollFactor(0)
      .setDepth(1500)
      .setInteractive();

    this.backdrop.on(
      'pointerdown',
      (pointer, x, y, event) => {
        event?.stopPropagation();

        if (!this.isSaving) {
          this.close();
        }
      }
    );

    this.panel = this.scene.add.container(
      width / 2,
      height / 2
    )
      .setScrollFactor(0)
      .setDepth(1501);

    const panelBg = this.scene.add.rectangle(
      0,
      0,
      560,
      500,
      0x17100b,
      1
    )
      .setStrokeStyle(4, 0xc99738, 1)
      .setInteractive();

    panelBg.on(
      'pointerdown',
      (pointer, x, y, event) => {
        event?.stopPropagation();
      }
    );

    const title = this.scene.add.text(
      0,
      -205,
      this.locationType === 'hotel'
        ? 'HOTEL SAFE'
        : 'AGENCY ARCHIVES',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '31px',
        color: '#f2d989',
        stroke: '#000000',
        strokeThickness: 5
      }
    ).setOrigin(0.5);

    const subtitle = this.scene.add.text(
      0,
      -163,
      'Choose a case file to save your investigation.',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '19px',
        color: '#d4c4a6',
        align: 'center'
      }
    ).setOrigin(0.5);

    const closeButton = this.scene.add.text(
      235,
      -218,
      '×',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        color: '#f0c2b6'
      }
    )
      .setOrigin(0.5)
      .setInteractive({
        useHandCursor: true
      });

    closeButton.on(
      'pointerdown',
      (pointer, x, y, event) => {
        event?.stopPropagation();

        if (!this.isSaving) {
          this.close();
        }
      }
    );

    closeButton.on('pointerover', () => {
      closeButton
        .setColor('#ffffff')
        .setScale(1.15);
    });

    closeButton.on('pointerout', () => {
      closeButton
        .setColor('#f0c2b6')
        .setScale(1);
    });

    this.statusText = this.scene.add.text(
      0,
      190,
      'Reading case files...',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '18px',
        color: '#d8c49a',
        align: 'center',
        wordWrap: {
          width: 470
        }
      }
    ).setOrigin(0.5);

    this.panel.add([
      panelBg,
      title,
      subtitle,
      closeButton,
      this.statusText
    ]);

    this._notifyPanelState();

    try {
      const slots = await saveManager.listSlots();

      if (!this._isCurrentOpening(token)) {
        return;
      }

      this.createSlotButtons(slots);
      this.setStatus('Choose a save slot.');
    } catch (error) {
      if (!this._isCurrentOpening(token)) {
        return;
      }

      console.error(
        '[OfficeSaveUI] Failed to read save slots:',
        error
      );

      this.createSlotButtons([]);

      this.setStatus(
        'Archive unavailable. You may still save locally.',
        '#ffbbb0'
      );
    }
  }

  _destroySlotButtons() {
    for (const slot of this.slotButtons) {
      slot.background?.destroy();
      slot.text?.destroy();
    }

    this.slotButtons = [];
  }

  createSlotButtons(slots = []) {
    if (
      this.destroyed ||
      !this.isOpen ||
      !this.panel?.active
    ) {
      return;
    }

    this._destroySlotButtons();

    const validSlots = Array.isArray(slots)
      ? slots
      : [];

    for (let index = 0; index < 3; index += 1) {
      const slotKey = `slot_${index + 1}`;

      const slot = validSlots.find(
        item => item.slotKey === slotKey
      );

      const meta = this.getPreferredMeta(slot);

      const label = meta
        ? this.formatSlotLabel(index + 1, meta)
        : `SLOT ${index + 1}\nEmpty case file`;

      const y = -95 + index * 100;

      const background = this.scene.add.rectangle(
        0,
        y,
        470,
        76,
        0x24170e,
        1
      )
        .setStrokeStyle(2, 0x8f6b35, 1)
        .setInteractive({
          useHandCursor: true
        });

      const text = this.scene.add.text(
        0,
        y,
        label,
        {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '18px',
          color: meta ? '#f1deb0' : '#a99a80',
          align: 'center',
          lineSpacing: 6
        }
      ).setOrigin(0.5);

      this.panel.add([background, text]);

      background.on('pointerover', () => {
        if (this.isSaving) {
          return;
        }

        background
          .setFillStyle(0x4a3219, 1)
          .setStrokeStyle(2, 0xe0b354, 1);

        text.setColor('#ffffff');
      });

      background.on('pointerout', () => {
        if (this.isSaving) {
          return;
        }

        background
          .setFillStyle(0x24170e, 1)
          .setStrokeStyle(2, 0x8f6b35, 1);

        text.setColor(
          meta ? '#f1deb0' : '#a99a80'
        );
      });

      background.on(
        'pointerdown',
        (pointer, x, y, event) => {
          event?.stopPropagation();
          void this.saveToSlot(slotKey);
        }
      );

      this.slotButtons.push({
        background,
        text
      });
    }
  }

  getPreferredMeta(slot) {
    if (!slot || slot.preferredSource === 'none') {
      return null;
    }

    return slot.preferredSource === 'cloud'
      ? slot.cloudMeta
      : slot.localMeta;
  }

  formatSlotLabel(slotNumber, meta) {
    const city = meta.cityCode
      ? String(meta.cityCode).toUpperCase()
      : 'UNKNOWN CITY';

    const location = meta.locationCode
      ? String(meta.locationCode).replaceAll('_', ' ')
      : 'unknown location';

    const hour = String(
      meta.inGameHour ?? 8
    ).padStart(2, '0');

    return [
      `SLOT ${slotNumber} — ${city}`,
      `Day ${meta.dayNumber ?? 1}, ${hour}:00 — ${location}`
    ].join('\n');
  }

  async saveToSlot(slotKey) {
    if (
      this.destroyed ||
      !this.isOpen ||
      this.isSaving
    ) {
      return;
    }

    const token = this._openToken;

    this._clearCloseTimer();

    this.isSaving = true;
    this.setSlotButtonsEnabled(false);

    this.setStatus(
      'Securing evidence...',
      '#f1d480'
    );

    try {
      const result = await saveManager.save(
        slotKey,
        {
          locationType: this.locationType,
          locationCode: this.locationCode,
          cityCode: this.cityCode,
          sceneKey: this.scene.scene.key
        }
      );

      if (!this._isCurrentOpening(token)) {
        return;
      }

      if (!result?.ok) {
        throw new Error(
          'Save manager did not confirm the save.'
        );
      }

      const slotName = slotKey
        .replace('_', ' ')
        .toUpperCase();

      if (result.mode === 'cloud+local') {
        this.setStatus(
          `${slotName} saved locally and in Agency Archives.`,
          '#a8e796'
        );
      } else if (result.mode === 'local-fallback') {
        this.setStatus(
          `${slotName} saved locally. Agency Archives are unavailable.`,
          '#f3d28a'
        );
      } else {
        this.setStatus(
          `${slotName} saved locally.`,
          '#a8e796'
        );
      }

      // Nie parsujemy ponownie całego zapisu tylko
      // w celu weryfikacji zakończonego writeLocal().
      this._closeTimer =
        this.scene.time.delayedCall(2600, () => {
          this._closeTimer = null;

          if (this._isCurrentOpening(token)) {
            this.close();
          }
        });
    } catch (error) {
      if (!this._isCurrentOpening(token)) {
        return;
      }

      console.error(
        '[OfficeSaveUI] Save failed:',
        error
      );

      this.setStatus(
        `Save failed: ${error?.message || String(error)}`,
        '#ff9f91'
      );

      this.setSlotButtonsEnabled(true);
    } finally {
      // Podczas zamkniętego okna nadal blokujemy
      // ponowne open(), dopóki request nie wróci.
      this.isSaving = false;
    }
  }

  setSlotButtonsEnabled(enabled) {
    for (const slot of this.slotButtons) {
      if (!slot.background?.active) {
        continue;
      }

      if (enabled) {
        slot.background.setInteractive({
          useHandCursor: true
        });
      } else {
        slot.background.disableInteractive();
      }

      slot.background.setAlpha(
        enabled ? 1 : 0.55
      );

      slot.text?.setAlpha(
        enabled ? 1 : 0.55
      );
    }
  }

  setStatus(message, color = '#d8c49a') {
    if (!this.statusText?.active) {
      return;
    }

    this.statusText
      .setText(message)
      .setColor(color);
  }

  _clearCloseTimer() {
    this._closeTimer?.remove(false);
    this._closeTimer = null;
  }

  close() {
    this._clearCloseTimer();
    this._openToken = null;

    const wasOpen = this.isOpen;
    this.isOpen = false;

    this._destroySlotButtons();

    this.panel?.destroy(true);
    this.backdrop?.destroy();

    this.panel = null;
    this.backdrop = null;
    this.statusText = null;

    if (wasOpen) {
      this._notifyPanelState();
    }
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.close();

    this.button?.destroy();
    this.button = null;
  }
}