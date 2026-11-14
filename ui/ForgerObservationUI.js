import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
      __dialogueText("ui/ForgerObservationUI.js", "t_40d5a52451a2b89ddaf4"),
      30,
      null,
      '#ffdb90'
    ).setFontFamily('PressStart2P');

    this.text(
      70,
      110,
      __dialogueText("ui/ForgerObservationUI.js", "t_7a0e7401eae43a0a97e2"),
      24
    );

    this.button(
      1610,
      60,
      230,
      __dialogueText("ui/ForgerObservationUI.js", "t_ef5f430bcbebe3c2a89e"),
      () => this.cleanup()
    );

    this.button(
      1330,
      60,
      250,
      this.page === 'notes' ? __dialogueText("ui/ForgerObservationUI.js", "t_1c1d655dd00b1518de2d") : __dialogueText("ui/ForgerObservationUI.js", "t_12f51dd8b8f6060eb6f9"),
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
      __dialogueText("ui/ForgerObservationUI.js", "t_349c698756400d04370e"),
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

    this.text(195, 670, __dialogueText("ui/ForgerObservationUI.js", "t_9ec7af62fd749e1deffa"), 23);

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
    this.text(1005, 565, __dialogueText("ui/ForgerObservationUI.js", "t_225d29f6201e1a635684"), 23);

    phone.on('pointerdown', () => this.inspect('phone'));

    this.text(
      90,
      755,
      beat?.caption ||
        (
          record.submitted
            ? __dialogueText("ui/ForgerObservationUI.js", "t_4f879d70889b209bb917")
            : __dialogueText("ui/ForgerObservationUI.js", "t_a9dcf3a2fcb0611d40ce") +
              __dialogueText("ui/ForgerObservationUI.js", "t_ccfbb9844d6348f79937")
        ),
      27,
      1090,
      '#ffe0a3'
    );

    this.rect(1230, 170, 610, 565, 0x17130f)
      .setStrokeStyle(2, 0x7c715d);

    this.text(1260, 195, __dialogueText("ui/ForgerObservationUI.js", "t_871b6394c65adffa7061"), 24, 550, '#ffdb90');

    this.text(
      1260,
      250,
      this.detail ||
        __dialogueText("ui/ForgerObservationUI.js", "t_9ba7360d171b484dd7ba") +
        __dialogueText("ui/ForgerObservationUI.js", "t_c01b008889ab6ca009f1") +
        __dialogueText("ui/ForgerObservationUI.js", "t_10ba3fd312c2148cc42d") +
        __dialogueText("ui/ForgerObservationUI.js", "t_9d332a7d07563265e4b6"),
      25,
      545
    );
  }

  renderControls(record) {
    if (record.phase === 'ready') {
      this.text(
        90,
        870,
        __dialogueText("ui/ForgerObservationUI.js", "t_53648ea9f5d86a9f4a3d") +
        __dialogueText("ui/ForgerObservationUI.js", "t_785980231e0f642b09d7"),
        25,
        1100
      );

      this.button(
        1230,
        865,
        610,
        this.roundLabel(__dialogueText("ui/ForgerObservationUI.js", "t_1e9d51af97c4e906fb79")),
        () => this.startRound()
      );

      return;
    }

    if (record.phase === 'watching') {
      this.text(
        90,
        920,
        `${__dialogueText("ui/ForgerObservationUI.js", "t_20d7c578c531547622e1")}${record.cursor + 1}${__dialogueText("ui/ForgerObservationUI.js", "t_0a66a7d5f1390e847c8e")}` +
        `${record.notes.length}${__dialogueText("ui/ForgerObservationUI.js", "t_b0bf2fe137c492b0846b")}`,
        24,
        1050
      );

      this.button(
        1230,
        865,
        610,
        record.cursor === 5 ? __dialogueText("ui/ForgerObservationUI.js", "t_a5881c2945d6173a31c4") : __dialogueText("ui/ForgerObservationUI.js", "t_c51c7639287339baea9f"),
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
        __dialogueText("ui/ForgerObservationUI.js", "t_4851f6ef08f1bccf044f"),
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
        this.roundLabel(__dialogueText("ui/ForgerObservationUI.js", "t_70b438f3c541e5a737c5")),
        () => this.startRound()
      );

      this.button(
        1230,
        940,
        610,
        __dialogueText("ui/ForgerObservationUI.js", "t_c141c79803afac774c80"),
        () => {
          if (!this.selectedId) {
            this.detail = __dialogueText("ui/ForgerObservationUI.js", "t_c67a2e43e0f5d7028b14");
            this.render();
            return;
          }

          if (submitForgerIdentity(this.cityId, this.selectedId)) {
            this.detail =
              __dialogueText("ui/ForgerObservationUI.js", "t_9456eca1979035610468") +
              __dialogueText("ui/ForgerObservationUI.js", "t_d1377e810e22b7d9d237") +
              __dialogueText("ui/ForgerObservationUI.js", "t_9b2798d8eb9d1880c082") +
              __dialogueText("ui/ForgerObservationUI.js", "t_f2abaf663d4775ecebea");

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
      `${__dialogueText("ui/ForgerObservationUI.js", "t_a83986a1bcdd1d29a5b4")}${selected?.name || __dialogueText("ui/ForgerObservationUI.js", "t_b764cdc0eab713746721")}${__dialogueText("ui/ForgerObservationUI.js", "t_01ba4719c80b6fe911b0")}` +
      `${__dialogueText("ui/ForgerObservationUI.js", "t_e9cc97d8283ed7929e9f")}${selected?.occupation || __dialogueText("ui/ForgerObservationUI.js", "t_b764cdc0eab713746721")}${__dialogueText("ui/ForgerObservationUI.js", "t_75a11da44c802486bc6f")}` +
      __dialogueText("ui/ForgerObservationUI.js", "t_78fef43fd6795d03b610"),
      26,
      1600,
      '#ffdb90'
    );
  }

  roundLabel(label) {
    return (
      `${label}${__dialogueText("ui/ForgerObservationUI.js", "t_ffa9044b934017b2aed8")}${FORGER_CONFIG.observationMinutes}${__dialogueText("ui/ForgerObservationUI.js", "t_da271cde26db7e48070c")}` +
      `${getObservationEnergyCost()}${__dialogueText("ui/ForgerObservationUI.js", "t_6e17fd780882359031cf")}`
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
        __dialogueText("ui/ForgerObservationUI.js", "t_2b951de67a7c2758a0de");
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
      __dialogueText("ui/ForgerObservationUI.js", "t_bc966bdd0fe812123cd8");

    this.render();
  }

  renderNotes(record) {
    this.text(
      90,
      180,
      __dialogueText("ui/ForgerObservationUI.js", "t_2439522876d695457f36"),
      27,
      null,
      '#ffdb90'
    );

    if (!record.notes.length) {
      this.text(
        90,
        245,
        __dialogueText("ui/ForgerObservationUI.js", "t_422d126b8f243b0b6041"),
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