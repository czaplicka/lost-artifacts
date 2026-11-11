import {
  FORGER_CONFIG,
  getForgerAccess,
  ensureForgerRecord,
  getForgerRecord,
  getObservationEnergyCost,
  startObservationRound,
  getObservationBeat,
  inspectObservationBeat,
  nextObservationBeat,
  submitForgerIdentity
} from '../systems/ForgerObservation.js';

import { getEnergyManager } from '../managers/EnergyManager.js';
import { gameState } from '../GameData.js';

export class ForgerObservationUI {
  constructor(scene) {
    this.scene = scene;
    this.cityId = scene.cityId;
    this.root = null;
    this.snapshots = [];
    this.selectedId = null;
    this.detail = '';
    this.closed = false;
    this.page = 'workshop';
    this.busy = false;
    this.savedKeyboardEnabled = null;
    this.boundCleanup = () => this.cleanup();
  }

  open() {
    const access = getForgerAccess(this.cityId);

    if (!access.available || this.scene.activePopup) return false;

    ensureForgerRecord(this.cityId);

    this.scene.closeAllUIPanels();
    this.scene.activePopup = this;

    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const other = this.scene.scene.manager.keys[key];

      if (!other?.sys?.isActive()) continue;

      other.closeAllUIPanels?.();
      other.closeMenu?.(true);

      this.snapshots.push({
        scene: other,
        visible: other.sys.settings.visible,
        inputEnabled: other.input.enabled
      });

      other.scene.setVisible(false);
      other.input.enabled = false;
    }

    if (this.scene.input.keyboard) {
      this.savedKeyboardEnabled =
        this.scene.input.keyboard.enabled;

      this.scene.input.keyboard.enabled = false;
    }

    this.scene.events.once('shutdown', this.boundCleanup);

    this.render();

    return true;
  }

  style(size = 22, color = '#f4e8ce') {
    return {
      fontFamily: 'SpecialElite',
      fontSize: `${size}px`,
      color,
      lineSpacing: 7
    };
  }

  text(x, y, value, size = 22, width = null, color = '#f4e8ce') {
    const object = this.scene.add.text(
      x,
      y,
      value,
      {
        ...this.style(size, color),
        ...(width ? { wordWrap: { width } } : {})
      }
    );

    this.root.add(object);

    return object;
  }

  rect(x, y, width, height, color, alpha = 1) {
    const object = this.scene.add.rectangle(
      x,
      y,
      width,
      height,
      color,
      alpha
    ).setOrigin(0);

    this.root.add(object);

    return object;
  }

  button(x, y, width, label, callback, selected = false) {
    const background = this.rect(
      x,
      y,
      width,
      54,
      selected ? 0x775b32 : 0x493626
    ).setStrokeStyle(2, 0xc3a565)
      .setInteractive({ useHandCursor: true });

    this.text(
      x + 12,
      y + 14,
      label,
      20,
      width - 24,
      '#ffe0a3'
    );

    background.on('pointerover', () => {
      background.setFillStyle(0x775b32);
    });

    background.on('pointerout', () => {
      background.setFillStyle(selected ? 0x775b32 : 0x493626);
    });

    background.on('pointerdown', () => {
      if (this.closed || this.busy) return;
      callback();
    });

    return background;
  }

  render() {
    if (this.closed || !this.scene.sys.isActive()) return;

    this.root?.destroy(true);

    const record = getForgerRecord();

    if (!record) {
      this.cleanup();
      return;
    }

    const { width, height } = this.scene.scale;
    const scale = Math.min(width / 1920, height / 1080);

    this.root = this.scene.add.container(
      (width - 1920 * scale) / 2,
      (height - 1080 * scale) / 2
    ).setScale(scale).setDepth(60000);

    this.rect(-1920, -1080, 5760, 3240, 0x100d0b)
      .setInteractive();

    this.rect(35, 30, 1850, 1020, 0x211a14)
      .setStrokeStyle(3, 0xc3a565);

    this.text(
      70,
      58,
      'PASSPORT TO SOMEWHERE',
      30,
      null,
      '#ffdb90'
    ).setFontFamily('PressStart2P');

    this.text(
      70,
      110,
      'New identity. Same disappointing photograph.',
      24
    );

    this.button(
      1610,
      60,
      230,
      'Return to city',
      () => this.cleanup()
    );

    this.button(
      1330,
      60,
      250,
      this.page === 'notes' ? 'Workshop view' : 'Observation notes',
      () => {
        this.page = this.page === 'notes' ? 'workshop' : 'notes';
        this.render();
      }
    );

    if (this.page === 'notes') {
      this.renderNotes(record);
      return;
    }

    this.renderWorkshop(record);
    this.renderControls(record);
  }

  renderWorkshop(record) {
    const beat = getObservationBeat(record);

    this.rect(70, 170, 1130, 565, 0x38342b)
      .setStrokeStyle(2, 0x7c715d);

    this.rect(100, 195, 1070, 60, 0x171a17);

    this.text(
      130,
      211,
      'EXPRESS PHOTO / COPIES / ABSOLUTELY NO CRIME',
      22,
      1000,
      '#dfcfa4'
    );

    this.rect(590, 300, 105, 130, 0x76604c);
    this.rect(610, 260, 66, 66, 0xb69c7b);
    this.rect(190, 455, 800, 185, 0x5b4029);

    const desk = this.rect(
      170,
      430,
      850,
      230,
      0x000000,
      0.01
    ).setStrokeStyle(
      beat?.hotspot === 'desk' ? 4 : 1,
      beat?.hotspot === 'desk' ? 0xffdd87 : 0x77634a
    ).setInteractive({ useHandCursor: true });

    this.text(195, 670, 'Inspect desk / photograph', 23);

    desk.on('pointerdown', () => this.inspect('desk'));

    record.clients.forEach((client, index) => {
      const current = beat?.clientId === client.id;

      this.rect(
        230 + index * 245,
        480,
        215,
        105,
        client.color
      ).setStrokeStyle(
        current ? 4 : 1,
        current ? 0xffe5a0 : 0x31291f
      );

      this.text(
        245 + index * 245,
        500,
        client.label.replace(' ', '\n'),
        21,
        190
      );
    });

    const phone = this.rect(
      1030,
      400,
      125,
      140,
      0x211f1c
    ).setStrokeStyle(
      beat?.hotspot === 'phone' ? 4 : 1,
      beat?.hotspot === 'phone' ? 0xffdd87 : 0x77634a
    ).setInteractive({ useHandCursor: true });

    this.text(1044, 450, 'PHONE', 23);
    this.text(1005, 565, 'Listen', 23);

    phone.on('pointerdown', () => this.inspect('phone'));

    this.text(
      90,
      755,
      beat?.caption ||
        (
          record.submitted
            ? 'The workshop carries on. Your working alias is recorded.'
            : 'Observe the desk and telephone. Link the photograph ' +
              'from your envelope to the correct document order.'
        ),
      27,
      1090,
      '#ffe0a3'
    );

    this.rect(1230, 170, 610, 565, 0x17130f)
      .setStrokeStyle(2, 0x7c715d);

    this.text(1260, 195, 'WHAT YOU NOTICE', 24, 550, '#ffdb90');

    this.text(
      1260,
      250,
      this.detail ||
        'Click the highlighted area to inspect or listen.\n\n' +
        'Advancing without inspecting can mean missing a detail.\n\n' +
        'You may replay the observation, but another round costs time ' +
        'and energy.',
      25,
      545
    );
  }

  renderControls(record) {
    if (record.phase === 'ready') {
      this.text(
        90,
        870,
        'You recognise the customer from the photograph in the envelope. ' +
        'Now find out which new identity belongs to that order.',
        25,
        1100
      );

      this.button(
        1230,
        865,
        610,
        this.roundLabel('Begin observation'),
        () => this.startRound()
      );

      return;
    }

    if (record.phase === 'watching') {
      this.text(
        90,
        920,
        `Moment ${record.cursor + 1} / 6  |  ` +
        `${record.notes.length} details recorded`,
        24,
        1050
      );

      this.button(
        1230,
        865,
        610,
        record.cursor === 5 ? 'Finish this observation' : 'Watch next action',
        () => {
          nextObservationBeat(this.cityId);
          this.detail = '';
          this.render();
        }
      );

      return;
    }

    if (record.phase === 'review') {
      this.text(
        90,
        860,
        'Which identity belongs to the customer in your envelope?',
        24,
        1100,
        '#ffdb90'
      );

      record.clients.forEach((client, index) => {
        this.button(
          90,
          905 + index * 43,
          1080,
          `${client.name} — ${client.occupation}`,
          () => {
            this.selectedId = client.id;
            this.render();
          },
          this.selectedId === client.id
        ).setSize(1080, 40);
      });

      this.button(
        1230,
        865,
        610,
        this.roundLabel('Observe again'),
        () => this.startRound()
      );

      this.button(
        1230,
        940,
        610,
        'Record selected identity',
        () => {
          if (!this.selectedId) {
            this.detail = 'Select an identity first.';
            this.render();
            return;
          }

          if (submitForgerIdentity(this.cityId, this.selectedId)) {
            this.detail =
              'Working identity recorded in your notebook.\n\n' +
              'Correctly matched documents let you ask more focused ' +
              'questions during later interviews.\n\n' +
              'The normal city clues remain unchanged.';

            this.render();
          }
        }
      );

      return;
    }

    const selected = record.clients.find(
      client => client.id === record.selectedId
    );

    this.text(
      90,
      875,
      `Recorded identity: ${selected?.name || 'Unknown'}\n` +
      `Occupation: ${selected?.occupation || 'Unknown'}\n\n` +
      'This is your recorded conclusion, not an automatic identity check.',
      26,
      1600,
      '#ffdb90'
    );
  }

  roundLabel(label) {
    return (
      `${label} | ${FORGER_CONFIG.observationMinutes} min / ` +
      `${getObservationEnergyCost()} energy`
    );
  }

  startRound() {
    this.busy = true;

    try {
      const result = startObservationRound(this.cityId);

      if (!result.success) {
        this.detail = result.message;
        return;
      }

      if (result.interrupted) {
        this.cleanup();
        return;
      }

      this.detail = '';
      this.selectedId = null;
    } catch (error) {
      console.error('[ForgerObservationUI]', error);
      this.detail =
        'The observation could not start. Your current progress is kept.';
    } finally {
      this.busy = false;

      if (!this.closed) this.render();
    }
  }

  inspect(hotspot) {
    if (
      this.closed ||
      !gameState.isGameActive ||
      getEnergyManager().isForcedSleepActive() ||
      getEnergyManager().isManualSleepActive()
    ) {
      return;
    }

    const detail = inspectObservationBeat(this.cityId, hotspot);

    this.detail = detail ||
      'Nothing useful to inspect here at this moment.';

    this.render();
  }

  renderNotes(record) {
    this.text(
      90,
      180,
      'OBSERVATION NOTES',
      27,
      null,
      '#ffdb90'
    );

    if (!record.notes.length) {
      this.text(
        90,
        245,
        'No details recorded yet. Inspect the desk or listen to the phone.',
        25,
        1700
      );

      return;
    }

    record.notes.forEach((note, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 90 + column * 880;
      const y = 245 + row * 245;

      this.rect(x, y, 845, 225, 0x30271c)
        .setStrokeStyle(1, 0x7c715d);

      this.text(
        x + 16,
        y + 15,
        note.text,
        20,
        810
      );
    });
  }

  cleanup() {
    if (this.closed) return;

    this.closed = true;

    this.scene.events.off('shutdown', this.boundCleanup);

    this.root?.destroy(true);
    this.root = null;

    if (this.scene.activePopup === this) {
      this.scene.activePopup = null;
    }

    if (
      this.scene.input.keyboard &&
      this.savedKeyboardEnabled !== null
    ) {
      this.scene.input.keyboard.enabled =
        this.savedKeyboardEnabled;
    }

    const restore = Boolean(
      this.scene.sys.isActive() &&
      !this.scene._cleanupDone &&
      gameState.isGameActive &&
      !gameState.caseFailed
    );

    for (const snapshot of this.snapshots) {
      const other = snapshot.scene;

      if (!restore || !other?.sys?.isActive()) continue;

      other.scene.setVisible(snapshot.visible);
      other.input.enabled = snapshot.inputEnabled;
      other.refreshNotebook?.();
      other.refreshUI?.();
    }

    this.snapshots = [];

    if (restore) this.scene.refreshEncounterViews?.();
  }
}