import { saveManager } from '../saveGameService.js';

export const SAVE_LOCATION_TYPES = Object.freeze([
  'office',
  'hotel'
]);

const SLOT_KEYS = [
  'slot_1',
  'slot_2',
  'slot_3'
];

const DEPTH = 20000;

const W = 680;
const H = 680;

const stop = event => {
  event?.stopPropagation?.();
};

export class OfficeSaveUI {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.locationType = String(
      options.locationType ?? 'office'
    ).trim().toLowerCase();

    if (!SAVE_LOCATION_TYPES.includes(this.locationType)) {
      throw new Error('Invalid save location.');
    }

    this.locationCode =
      options.locationCode ||
      (
        this.locationType === 'hotel'
          ? 'hotel_room'
          : 'agency_headquarters'
      );

    this.cityCode =
      options.cityCode ||
      (
        this.locationType === 'hotel'
          ? 'unknown_city'
          : 'hq'
      );

    this.button = null;
    this.panel = null;
    this.backdrop = null;
    this.statusText = null;
    this.closeButton = null;

    this.slotButtons = [];

    this.isOpen = false;
    this.isSaving = false;
    this.destroyed = false;

    this._buttonLocked = false;
    this._openToken = null;
    this._slots = [];
    this._saveRevision = 0;

    this.onResize = this.layout.bind(this);

    this.scene.scale.on(
      'resize',
      this.onResize
    );
  }

  _isCurrentOpening(token) {
    return Boolean(
      !this.destroyed &&
      !this.scene._cleanupDone &&
      this.isOpen &&
      this._openToken === token &&
      this.panel?.active
    );
  }

  _notifyPanelState() {
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

    const hud =
      this.scene.getPlayerHud?.() ??
      this.scene.getPlayerHudScene?.();

    this.scene.applyLock?.(
      Boolean(
        this.isOpen ||
        this.scene.isChoosingHotel ||
        this.scene.isSleeping ||
        this.scene.isSleepMenuOpen ||
        this.scene.isLeaving ||
        this.scene.isTransitioning ||
        this.scene.agencyLedgerUI?.isOpen ||
        hud?.isAnyPanelOpen?.()
      )
    );
  }

  createButton() {
    if (
      this.destroyed ||
      this.button?.active
    ) {
      return;
    }

    if (this.scene.textures.exists('btnSave')) {
      this.button = this.scene.add
        .image(0, 0, 'btnSave')
        .setScale(0.5);
    } else {
      this.button = this.scene.add.text(
        0,
        0,
        'SAVE',
        {
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: '#f1d480',
          backgroundColor: '#1c1109',
          padding: {
            x: 12,
            y: 8
          }
        }
      );
    }

    this.button
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.button.on(
      'pointerdown',
      (pointer, x, y, event) => {
        stop(event);

        if (
          pointer?.event?.button !== undefined &&
          pointer.event.button !== 0
        ) {
          return;
        }

        if (
          this.destroyed ||
          this._buttonLocked ||
          this.scene.uiLocked ||
          this.isOpen ||
          this.isSaving
        ) {
          return;
        }

        void this.open().catch(error => {
          console.error(
            '[OfficeSaveUI] Opening failed:',
            error
          );
        });
      }
    );

    this.layout();
    this.setLocked(this._buttonLocked);
  }

  setLocked(locked) {
    this._buttonLocked = Boolean(locked);

    if (!this.button?.active) return;

    this.button.setAlpha(
      this._buttonLocked ? 0.4 : 1
    );

    if (this._buttonLocked) {
      this.button.disableInteractive();
    } else {
      this.button.setInteractive({
        useHandCursor: true
      });
    }
  }

  layout() {
    if (this.destroyed) return;

    const { width, height } = this.scene.scale;

    this.button?.setPosition(
      Math.min(1780, width - 95),
      height - 66
    );

    this.backdrop
      ?.setPosition(0, 0)
      .setSize(width, height);

    if (!this.panel?.active) return;

    const fit = Math.max(
      0.01,
      Math.min(
        1,
        width * 0.94 / W,
        height * 0.92 / H
      )
    );

    this.panel
      .setScale(fit)
      .setPosition(
        (width - W * fit) / 2,
        (height - H * fit) / 2
      );
  }

  addText(
    parent,
    x,
    y,
    text,
    size = 18,
    color = '#463525',
    font = 'SpecialElite'
  ) {
    const object = this.scene.add.text(
      x,
      y,
      text,
      {
        fontFamily: font,
        fontSize: `${size}px`,
        color
      }
    ).setScrollFactor(0);

    parent.add(object);

    return object;
  }

  async open() {
    if (
      this.destroyed ||
      this.scene._cleanupDone ||
      this.isOpen ||
      this.isSaving ||
      !this.scene.sys.isActive()
    ) {
      return;
    }

    const token = Symbol('save-panel');

    this._openToken = token;
    this.isOpen = true;

    try {
      this.scene.getPlayerHudScene?.()
        ?.closeAllUIPanels?.();

      this.createPanel();

      this._slots = SLOT_KEYS.map(slotKey => ({
        slotKey,
        localMeta: saveManager.readLocalMeta(slotKey),
        cloudMeta: null,
        preferredSource: 'local'
      }));

      this.createSlotButtons(this._slots);

      this.setStatus(
        'Choose a file. Local saving is ready.'
      );

      this._notifyPanelState();
    } catch (error) {
      this.close();

      console.error(
        '[OfficeSaveUI] Panel creation failed:',
        error
      );

      throw error;
    }

    const revision = this._saveRevision;

    try {
      const slots = await saveManager.listSlots();

      if (
        !this._isCurrentOpening(token) ||
        this.isSaving ||
        revision !== this._saveRevision
      ) {
        return;
      }

      if (!Array.isArray(slots)) {
        throw new Error('Invalid save slot list.');
      }

      this.createSlotButtons(slots);

      this.setStatus(
        'Select a file to save your investigation.'
      );
    } catch (error) {
      console.warn(
        '[OfficeSaveUI] Slot listing failed:',
        error
      );

      if (
        this._isCurrentOpening(token) &&
        !this.isSaving &&
        revision === this._saveRevision
      ) {
        this.setStatus(
          'Cloud unavailable. Local saving is ready.',
          '#843b32'
        );
      }
    }
  }

  createPanel() {
    const scene = this.scene;

    const { width, height } = scene.scale;

    this.backdrop = scene.add.rectangle(
      0,
      0,
      width,
      height,
      0x080a0b,
      0.86
    )
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setInteractive();

    this.backdrop.on(
      'pointerdown',
      (pointer, x, y, event) => {
        stop(event);

        if (!this.isSaving) {
          this.close();
        }
      }
    );

    this.panel = scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    const art = scene.add.graphics()
      .setScrollFactor(0);

    art.fillStyle(0x000000, 0.4);
    art.fillRoundedRect(
      9, 12, W - 9, H - 12, 8
    );

    art.fillStyle(0x433023, 1);
    art.fillRoundedRect(
      0, 0, W - 10, H - 12, 8
    );

    art.lineStyle(2, 0x96734b, 1);
    art.strokeRoundedRect(
      0, 0, W - 10, H - 12, 8
    );

    art.fillStyle(0xc3a16c, 1);
    art.fillRoundedRect(
      20, 20, 225, 40, 5
    );

    art.fillStyle(0xe7d7b5, 1);
    art.fillRect(
      20, 52, W - 50, H - 85
    );

    art.lineStyle(1, 0xbca782, 0.3);

    for (
      let y = 161;
      y < H - 50;
      y += 23
    ) {
      art.lineBetween(
        33, y, W - 43, y
      );
    }

    this.panel.add(art);

    const panelHit = scene.add.rectangle(
      0,
      0,
      W - 10,
      H - 12,
      0x000000,
      0
    )
      .setOrigin(0)
      .setScrollFactor(0)
      .setInteractive();

    panelHit.on(
      'pointerdown',
      (pointer, x, y, event) => {
        stop(event);
      }
    );

    this.panel.add(panelHit);

    this.addText(
      this.panel,
      36,
      31,
      'MARK AGENCY / ARCHIVE',
      10,
      '#38291d',
      'PressStart2P'
    );

    this.addText(
      this.panel,
      42,
      74,
      'SAVE YOUR CASE FILE',
      26,
      '#30271f'
    );

    this.addText(
      this.panel,
      43,
      111,
      this.locationType === 'hotel'
        ? 'Room service for unfinished business.'
        : 'Unfinished business. Carefully filed.',
      17,
      '#79654c'
    );

    this.addText(
      this.panel,
      43,
      154,
      'INVESTIGATION RECORDS',
      10,
      '#71604b',
      'PressStart2P'
    );

    this.closeButton = this.addText(
      this.panel,
      W - 76,
      77,
      '[ X ]',
      15,
      '#843b32'
    ).setInteractive({
      useHandCursor: true
    });

    this.closeButton.on(
      'pointerdown',
      (pointer, x, y, event) => {
        stop(event);

        if (!this.isSaving) {
          this.close();
        }
      }
    );

    this.closeButton.on('pointerover', () => {
      if (!this.isSaving) {
        this.closeButton?.setColor('#bc4d38');
      }
    });

    this.closeButton.on('pointerout', () => {
      this.closeButton?.setColor('#843b32');
    });

    this.statusText = this.addText(
      this.panel,
      43,
      H - 64,
      '',
      16,
      '#75634d'
    );

    this.statusText.setWordWrapWidth(W - 96);

    this.layout();
  }

  _destroySlotButtons() {
    for (const slot of this.slotButtons) {
      slot.card?.destroy(true);
    }

    this.slotButtons = [];
  }

  getPreferredMeta(slot) {
    if (!slot) return null;

    if (slot.preferredSource === 'cloud') {
      return (
        slot.cloudMeta ??
        slot.localMeta ??
        null
      );
    }

    return (
      slot.localMeta ??
      slot.cloudMeta ??
      null
    );
  }

  getDetectiveName(meta) {
    const name = typeof meta?.agentName === 'string'
      ? meta.agentName.trim()
      : '';

    return name || 'Unknown detective';
  }

  getDescription(meta) {
    if (!meta) {
      return 'No investigation on record.';
    }

    const location = String(
      meta.locationCode || 'Unknown location'
    ).replace(/_/g, ' ');

    const city = String(
      meta.cityCode || 'Unknown city'
    ).replace(/_/g, ' ');

    const day = meta.dayNumber ?? 1;

    const hour = String(
      meta.inGameHour ?? 8
    ).padStart(2, '0');

    const timestamp =
      meta.savedAt ??
      meta.updatedAt;

    const date = timestamp
      ? new Date(timestamp)
      : null;

    const savedAt =
      date && Number.isFinite(date.getTime())
        ? date.toLocaleString()
        : 'Unknown time';

    return (
      `${location} / ${city}  |  Day ${day}, ${hour}:00\n` +
      `Saved: ${savedAt}`
    );
  }

  createSlotButtons(slots = []) {
    if (
      this.destroyed ||
      !this.isOpen ||
      !this.panel?.active
    ) {
      return;
    }

    this._slots = Array.isArray(slots)
      ? slots
      : [];

    this._destroySlotButtons();

    const width = W - 94;
    const height = 126;

    SLOT_KEYS.forEach((slotKey, index) => {
      const slot = this._slots.find(
        entry => entry.slotKey === slotKey
      );

      const meta = this.getPreferredMeta(slot);
      const hasSave = Boolean(meta);

      const card = this.scene.add
        .container(42, 184 + index * 140)
        .setScrollFactor(0);

      this.panel.add(card);

      const art = this.scene.add.graphics()
        .setScrollFactor(0);

      card.add(art);

      const draw = (hover = false) => {
        art.clear();

        art.fillStyle(
          0x3a2919,
          hover ? 0.22 : 0.12
        );

        art.fillRect(
          3, 5, width, height
        );

        art.fillStyle(
          hasSave
            ? (hover ? 0xfff5d8 : 0xf5e9cc)
            : (hover ? 0xeee2c5 : 0xd9ceb5),
          1
        );

        art.fillRect(
          0, 0, width, height
        );

        art.lineStyle(
          1,
          hover
            ? 0x947047
            : (
                hasSave
                  ? 0xb49a70
                  : 0xb8a98d
              ),
          1
        );

        art.strokeRect(
          0, 0, width, height
        );

        art.fillStyle(
          hasSave ? 0x87533d : 0xa99c82,
          1
        );

        art.fillRect(
          0, 0, 5, height
        );

        art.lineStyle(
          1,
          0xbaa483,
          0.55
        );

        art.lineBetween(
          17, 66, width - 17, 66
        );
      };

      draw();

      this.addText(
        card,
        18,
        12,
        `FILE 0${index + 1}`,
        9,
        '#806c50',
        'PressStart2P'
      );

      const name = this.addText(
        card,
        18,
        33,
        hasSave
          ? this.getDetectiveName(meta)
          : 'Unassigned file',
        24,
        hasSave ? '#30281f' : '#8f816c'
      );

      for (
        let size = 24;
        size >= 14;
        size--
      ) {
        name.setFontSize(size);

        if (name.width <= width - 36) break;
      }

      if (name.width > width - 36) {
        name.setScale(
          (width - 36) / name.width
        );
      }

      const description = this.addText(
        card,
        18,
        75,
        this.getDescription(meta),
        hasSave ? 14 : 16,
        hasSave ? '#68583f' : '#8f816c'
      );

      if (description.width > width - 36) {
        description.setScale(
          (width - 36) / description.width
        );
      }

      const action = this.addText(
        card,
        width - 18,
        13,
        hasSave ? 'REPLACE >' : 'SAVE >',
        10,
        '#8e4d37'
      ).setOrigin(1, 0);

      const hit = this.scene.add.rectangle(
        0,
        0,
        width,
        height,
        0x000000,
        0
      )
        .setOrigin(0)
        .setScrollFactor(0)
        .setInteractive({
          useHandCursor: true
        });

      card.add(hit);

      hit.on('pointerover', () => {
        if (this.isSaving) return;

        draw(true);
        action.setColor('#b1492d');
      });

      hit.on('pointerout', () => {
        draw(false);
        action.setColor('#8e4d37');
      });

      hit.on(
        'pointerdown',
        (pointer, x, y, event) => {
          stop(event);

          if (
            pointer?.event?.button !== undefined &&
            pointer.event.button !== 0
          ) {
            return;
          }

          if (
            this.destroyed ||
            !this.isOpen ||
            this.isSaving
          ) {
            return;
          }

          void this.saveToSlot(slotKey);
        }
      );

      this.slotButtons.push({
        slotKey,
        card,
        hit
      });
    });

    this.setSlotButtonsEnabled(
      !this.isSaving
    );
  }

  async saveToSlot(slotKey) {
    if (
      this.destroyed ||
      !this.isOpen ||
      this.isSaving ||
      !SLOT_KEYS.includes(slotKey)
    ) {
      return;
    }

    const token = this._openToken;

    this.isSaving = true;
    this._saveRevision += 1;

    this.setSlotButtonsEnabled(false);

    this.closeButton?.setAlpha(0.45);

    this.setStatus(
      'Filing your investigation locally...',
      '#79654c'
    );

    try {
      const result = await saveManager.save(
        slotKey,
        {
          locationType: this.locationType,
          locationCode: this.locationCode,
          cityCode: this.cityCode,
          sceneKey: this.scene.sys.settings.key,

          onLocalSaved: payload => {
            if (!this._isCurrentOpening(token)) {
              return;
            }

            this.updateSlot(
              slotKey,
              payload.meta,
              false
            );

            this.setStatus(
              'Browser copy filed. Checking account archive...',
              '#42613c'
            );
          }
        }
      );

      if (!this._isCurrentOpening(token)) {
        return;
      }

      if (
        !result?.ok ||
        !result.payload?.meta
      ) {
        throw new Error(
          'Save was not confirmed.'
        );
      }

      this.updateSlot(
        slotKey,
        result.payload.meta,
        result.mode === 'cloud+local'
      );

      if (result.mode === 'cloud+local') {
        this.setStatus(
          'Filed safely: THIS BROWSER + ACCOUNT ARCHIVE.',
          '#42613c'
        );
      } else if (result.mode === 'local-fallback') {
        this.setStatus(
          'Browser copy saved. Account archive not confirmed.',
          '#843b32'
        );
      } else {
        this.setStatus(
          'Filed in THIS BROWSER. No active cloud session.',
          '#42613c'
        );
      }
    } catch (error) {
      console.error(
        '[OfficeSaveUI] Save failed:',
        error
      );

      if (this._isCurrentOpening(token)) {
        this.setStatus(
          'Save failed: ' +
            (
              error?.message ||
              String(error)
            ),
          '#a13e32'
        );
      }
    } finally {
      this.isSaving = false;

      if (this._isCurrentOpening(token)) {
        this.setSlotButtonsEnabled(true);
        this.closeButton?.setAlpha(1);
      }
    }
  }

  updateSlot(
    slotKey,
    meta,
    cloudConfirmed
  ) {
    const previous = this._slots.find(
      slot => slot.slotKey === slotKey
    );

    this._slots = this._slots
      .filter(slot =>
        slot.slotKey !== slotKey
      )
      .concat({
        slotKey,
        localMeta: meta,

        cloudMeta: cloudConfirmed
          ? meta
          : previous?.cloudMeta ?? null,

        preferredSource: 'local'
      });

    this.createSlotButtons(this._slots);
  }

  setSlotButtonsEnabled(enabled) {
    for (const slot of this.slotButtons) {
      if (!slot.hit?.active) continue;

      if (enabled) {
        slot.hit.setInteractive({
          useHandCursor: true
        });
      } else {
        slot.hit.disableInteractive();
      }

      slot.card?.setAlpha(
        enabled ? 1 : 0.65
      );
    }
  }

  setStatus(
    text,
    color = '#75634d'
  ) {
    if (!this.statusText?.active) return;

    this.statusText
      .setText(text)
      .setColor(color);
  }

  close() {
    this._openToken = null;

    const wasOpen = this.isOpen;

    this.isOpen = false;

    this._destroySlotButtons();

    this.panel?.destroy(true);
    this.backdrop?.destroy();

    this.panel = null;
    this.backdrop = null;
    this.statusText = null;
    this.closeButton = null;

    if (wasOpen) {
      this._notifyPanelState();
    }
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    this.scene.scale.off(
      'resize',
      this.onResize
    );

    this.close();

    this.button?.destroy();
    this.button = null;
  }
}