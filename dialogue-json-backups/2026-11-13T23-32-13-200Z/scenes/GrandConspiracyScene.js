import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { settlePICaseRewards } from '../managers/PICaseRewards.js';
import { applyPIIntegrityDecision } from '../managers/PICaseStanding.js';
import { getReputation } from '../managers/ReputationManager.js';

const CASE_ID = 'pi_grand_conspiracy';
const STATE_VERSION = 3;
const ROOT = 'assets/side_quests/Grand Conspiracy/';

const ASSETS = {
  gc_garden: 'garden.webp',
  gc_bag_onion: 'bag_onion.webp',
  gc_bag: 'bag.webp',
  gc_dog: 'dog.webp',
  gc_grandma: 'grandma.webp',
  gc_newspaper: 'newspaper.webp',
  gc_shovel: 'shovel.webp',
  gc_wheelbarrow: 'wheelbarrow.webp'
};

const PHOTO_IDS = ['gardening', 'bulbs', 'newspaper'];

const OBJECTS = [
  {
    key: 'gc_newspaper',
    text: 'A newspaper beside the dog. The crossword has fallen into the wrong paws.'
  },
  {
    key: 'gc_dog',
    text: 'The security department has entered power-saving mode.'
  },
  {
    key: 'gc_shovel',
    text: 'A hand trowel. Perkins would probably call it a miniature burial device.'
  },
  {
    key: 'gc_bag',
    text: 'A closed sack. Contents: unknown. Perkins has already identified them as “definitely something”.'
  },
  {
    key: 'gc_bag_onion',
    text: 'Plant bulbs, with papery skins and roots. These can be photographed without inventing a conspiracy.'
  },
  {
    key: 'gc_wheelbarrow',
    text: 'A wheelbarrow. No engine, no number plate, no international conspiracy.'
  },
  {
    key: 'gc_grandma',
    text: 'Olga is watering the vegetable beds. The vegetables are the only confirmed beneficiaries.'
  }
];

const REPORTS = {
  honest: {
    title: 'REPORT THE FACTS',
    effect: 'honest_report',
    delta: 5,
    text:
      'Olga was observed watering her vegetable beds. ' +
      'She opened a sack containing plant bulbs. ' +
      'A newspaper was photographed beside her sleeping dog.\n\n' +
      'Olga says she gardens at midnight to avoid the client’s unsolicited advice. ' +
      'She says the dog carries newspapers into the garden and agrees to return this one. ' +
      'The photographs do not independently establish how the newspaper arrived.\n\n' +
      'No evidence of criminal activity was established.',
    reply:
      'Perkins: “So she waits until midnight to avoid speaking to me?”\n\n' +
      'You: “That is her explanation.”\n\n' +
      'Perkins: “Suspiciously plausible. I dislike it.”'
  },

  sensational: {
    title: 'TELL HIM WHAT HE WANTS',
    effect: 'concealed_findings',
    delta: -5,
    text:
      'Olga was active in the garden at midnight. ' +
      'A sack, digging equipment and a wheelbarrow were present. ' +
      'The client’s missing newspaper was found near the dog.\n\n' +
      'Further suspicion is encouraged. The photographs showing ordinary gardening ' +
      'and plant bulbs, and Olga’s explanation, are deliberately omitted.',
    reply:
      'Perkins: “I KNEW IT. Gardening equipment. In a garden!”\n\n' +
      'You close the file. The facts remain innocent. Your report does not.'
  }
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function unionBounds(rectangles) {
  const left = Math.min(...rectangles.map(r => r.x));
  const top = Math.min(...rectangles.map(r => r.y));
  const right = Math.max(...rectangles.map(r => r.x + r.w));
  const bottom = Math.max(...rectangles.map(r => r.y + r.h));

  return {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top
  };
}

function containsPoint(rect, x, y) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.w &&
    y >= rect.y &&
    y <= rect.y + rect.h
  );
}

export class GrandConspiracyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GrandConspiracyScene' });
  }

  init(data = {}) {
    this.returnScenes = Array.isArray(data.returnScenes)
      ? data.returnScenes
      : [];

    this.layers = {};
    this.bounds = {};
    this.actions = [];
    this.modal = null;
    this.dragStart = null;
    this.photoMode = false;
    this.transitioning = false;
    this.submitting = false;
  }

  preload() {
    for (const [key, filename] of Object.entries(ASSETS)) {
      if (!this.textures.exists(key)) {
        this.load.image(key, ROOT + filename);
      }
    }
  }

  read() {
    const saved = gameState.piGrandConspiracy;

    if (saved?.version !== STATE_VERSION) {
      return {
        version: STATE_VERSION,
        photos: [],
        bagOpened: false,
        talked: false,
        reportChoice: null,
        completed: false
      };
    }

    return {
      ...saved,
      photos: [...new Set(
        (Array.isArray(saved.photos) ? saved.photos : [])
          .filter(id => PHOTO_IDS.includes(id))
      )]
    };
  }

  write(patch) {
    gameState.piGrandConspiracy = {
      ...this.read(),
      ...patch,
      version: STATE_VERSION
    };

    requestAutosave();
  }

  allPhotos() {
    const photos = this.read().photos;
    return PHOTO_IDS.every(id => photos.includes(id));
  }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;

    this.cameras.main.setBackgroundColor('#080e14');

    const missing = Object.keys(ASSETS).filter(
      key => !this.textures.exists(key)
    );

    if (missing.length) {
      this.text(
        40,
        90,
        `Missing garden assets:\n${missing.join('\n')}`,
        24,
        this.W - 80
      );

      this.button(
        40,
        this.H - 80,
        'BACK',
        () => this.leave()
      );

      return;
    }

    const background = this.textures
      .get('gc_garden')
      .getSourceImage();

    const factor = Math.min(
      this.W / background.width,
      (this.H - 290) / background.height
    );

    this.gardenRect = {
      x: (this.W - background.width * factor) / 2,
      y: 76,
      w: background.width * factor,
      h: background.height * factor
    };

    this.addLayer('gc_garden');

    for (const object of OBJECTS) {
      const image = this.addLayer(object.key);

      image.setInteractive({
        pixelPerfect: true,
        alphaTolerance: 16,
        useHandCursor: true
      });

      image.on('pointerdown', () => {
        if (
          !this.photoMode &&
          !this.modal &&
          !this.transitioning
        ) {
          this.say(object.text);
        }
      });

      this.layers[object.key] = image;
      this.bounds[object.key] = this.opaqueBounds(image);
    }

    this.alignBagStates();
    this.applyBagState();

    this.text(
      28,
      24,
      'THE MIDNIGHT GARDENER',
      20
    ).setDepth(100);

    this.counter = this.text(
      Math.max(500, this.W - 500),
      24,
      '',
      23
    ).setDepth(100);

    this.buildCamera();

    this.add.rectangle(
      0,
      this.H - 205,
      this.W,
      205,
      0x101923
    ).setOrigin(0).setDepth(100);

    this.message = this.text(
      28,
      this.H - 188,
      '',
      23,
      this.W - 56
    ).setDepth(101);

    const onMove = pointer => {
      this.aim.setPosition(pointer.x, pointer.y);
      this.aim.setVisible(
        this.photoMode &&
        !this.modal &&
        !this.transitioning &&
        containsPoint(this.gardenRect, pointer.x, pointer.y)
      );

      if (this.dragStart) {
        this.drawSelection(this.selectionRect(pointer));
      }
    };

    const onDown = pointer => {
      if (
        !this.photoMode ||
        this.modal ||
        this.transitioning ||
        !containsPoint(this.gardenRect, pointer.x, pointer.y)
      ) {
        return;
      }

      this.dragStart = { x: pointer.x, y: pointer.y };
    };

    const onUp = pointer => {
      if (!this.dragStart) return;

      const rect = this.selectionRect(pointer);

      this.dragStart = null;
      this.selection.clear();

      this.capture(rect);
    };

    this.input.on('pointermove', onMove);
    this.input.on('pointerdown', onDown);
    this.input.on('pointerup', onUp);

    this.events.once('shutdown', () => {
      this.input.off('pointermove', onMove);
      this.input.off('pointerdown', onDown);
      this.input.off('pointerup', onUp);
      this.modal = null;
      this.input.setDefaultCursor('default');
    });

    this.refresh();

    if (this.read().completed) {
      this.say('Case closed. Perkins has paid for an explanation he did not particularly enjoy.');
    } else {
      this.say(
        'Switch on the camera. Drag a frame around Olga and her watering can to photograph the gardening.'
      );
    }
  }

  text(x, y, value, size = 22, width) {
    return this.add.text(x, y, value, {
      fontFamily: 'SpecialElite, monospace',
      fontSize: `${size}px`,
      color: '#eee4cc',
      ...(width ? { wordWrap: { width } } : {})
    });
  }

  button(x, y, label, action) {
    const button = this.text(x, y, label, 21)
      .setPadding(12, 9)
      .setBackgroundColor('#263849')
      .setDepth(110)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      if (!this.submitting) action();
    });

    return button;
  }

  addLayer(key) {
    const r = this.gardenRect;

    return this.add.image(r.x, r.y, key)
      .setOrigin(0)
      .setDisplaySize(r.w, r.h);
  }

  opaqueBounds(image) {
    const source = this.textures
      .get(image.texture.key)
      .getSourceImage();

    const canvas = document.createElement('canvas');

    canvas.width = source.width;
    canvas.height = source.height;

    const context = canvas.getContext('2d', {
      willReadFrequently: true
    });

    context.drawImage(source, 0, 0);

    const pixels = context.getImageData(
      0, 0, canvas.width, canvas.height
    ).data;

    let left = canvas.width;
    let top = canvas.height;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] < 32) {
          continue;
        }

        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }

    if (right < left) {
      throw new Error(`Empty garden layer: ${image.texture.key}`);
    }

    return {
      x: image.x + left * image.scaleX,
      y: image.y + top * image.scaleY,
      w: (right - left + 1) * image.scaleX,
      h: (bottom - top + 1) * image.scaleY
    };
  }

  alignBagStates() {
    const closed = this.bounds.gc_bag;
    const open = this.bounds.gc_bag_onion;

    const dx =
      closed.x + closed.w / 2 -
      (open.x + open.w / 2);

    const dy =
      closed.y + closed.h -
      (open.y + open.h);

    this.layers.gc_bag_onion.x += dx;
    this.layers.gc_bag_onion.y += dy;

    this.bounds.gc_bag_onion = {
      ...open,
      x: open.x + dx,
      y: open.y + dy
    };
  }

  applyBagState() {
    const opened = this.read().bagOpened;

    this.layers.gc_bag.setVisible(!opened);
    this.layers.gc_bag_onion.setVisible(opened);

    this.layers.gc_bag.input.enabled = !opened;
    this.layers.gc_bag_onion.input.enabled = opened;
  }

  buildCamera() {
    const r = this.gardenRect;

    this.viewfinder = this.add.container(0, 0)
      .setDepth(50)
      .setVisible(false);

    const frame = this.add.graphics();

    frame.lineStyle(4, 0xffe5b0, 0.95);

    const margin = 24;
    const length = 54;

    for (const [x, y, dx, dy] of [
      [r.x + margin, r.y + margin, 1, 1],
      [r.x + r.w - margin, r.y + margin, -1, 1],
      [r.x + margin, r.y + r.h - margin, 1, -1],
      [r.x + r.w - margin, r.y + r.h - margin, -1, -1]
    ]) {
      frame.beginPath();
      frame.moveTo(x + length * dx, y);
      frame.lineTo(x, y);
      frame.lineTo(x, y + length * dy);
      frame.strokePath();
    }

    const label = this.text(
      r.x + 42,
      r.y + 38,
      'CAMERA ON — DRAG TO FRAME',
      21
    );

    this.viewfinder.add([frame, label]);

    this.aim = this.add.graphics()
      .setDepth(52)
      .setVisible(false);

    this.aim.lineStyle(2, 0xffe5b0, 0.9);
    this.aim.strokeCircle(0, 0, 15);
    this.aim.lineBetween(-25, 0, 25, 0);
    this.aim.lineBetween(0, -25, 0, 25);

    this.selection = this.add.graphics().setDepth(53);

    this.flash = this.add.rectangle(
      r.x, r.y, r.w, r.h, 0xffffff
    )
      .setOrigin(0)
      .setDepth(54)
      .setAlpha(0);

    this.curtain = this.add.rectangle(
      r.x, r.y, r.w, r.h, 0x080e14
    )
      .setOrigin(0)
      .setDepth(55)
      .setAlpha(0);
  }

  setCamera(on) {
    this.photoMode = on;
    this.dragStart = null;
    this.selection.clear();
    this.viewfinder.setVisible(on);
    this.aim.setVisible(false);

    this.input.setDefaultCursor(
      on ? 'crosshair' : 'default'
    );

    this.refreshActions();
  }

  toggleCamera() {
    if (this.photoMode) {
      this.setCamera(false);
      this.say('Camera put away. You can inspect the garden.');
      return;
    }

    if (!piInventoryManager.hasItem('camera')) {
      this.say('You need a camera in your PI inventory.');
      return;
    }

    this.setCamera(true);

    this.say(
      'Drag a frame around the subject. Release to take the photograph. Include the context, not the entire garden.'
    );
  }

  selectionRect(pointer) {
    const r = this.gardenRect;

    const x = Phaser.Math.Clamp(pointer.x, r.x, r.x + r.w);
    const y = Phaser.Math.Clamp(pointer.y, r.y, r.y + r.h);

    return {
      x: Math.min(this.dragStart.x, x),
      y: Math.min(this.dragStart.y, y),
      w: Math.abs(x - this.dragStart.x),
      h: Math.abs(y - this.dragStart.y)
    };
  }

  drawSelection(rect) {
    this.selection.clear();
    this.selection.fillStyle(0xffe5b0, 0.08);
    this.selection.fillRect(rect.x, rect.y, rect.w, rect.h);
    this.selection.lineStyle(3, 0xffe5b0, 1);
    this.selection.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  covers(frame, target) {
    const left = Math.max(frame.x, target.x);
    const top = Math.max(frame.y, target.y);

    const right = Math.min(
      frame.x + frame.w,
      target.x + target.w
    );

    const bottom = Math.min(
      frame.y + frame.h,
      target.y + target.h
    );

    const overlap =
      Math.max(0, right - left) *
      Math.max(0, bottom - top);

    const coverage = overlap / (target.w * target.h);
    const tightness =
      (target.w * target.h) / (frame.w * frame.h);

    return coverage >= 0.9 && tightness >= 0.12;
  }

  capture(frame) {
    if (
      !this.photoMode ||
      this.modal ||
      this.transitioning ||
      this.read().completed
    ) {
      return;
    }

    if (!piInventoryManager.hasItem('camera')) {
      this.setCamera(false);
      this.say('Your PI camera is no longer available.');
      return;
    }

    if (frame.w < 20 || frame.h < 20) {
      this.say('Hold and drag to frame a photograph. A click is not a frame.');
      return;
    }

    const targets = [
      {
        id: 'gardening',
        bounds: this.bounds.gc_grandma,
        text: 'Olga watering the beds. The photograph establishes gardening, not a motive.'
      },
      {
        id: 'newspaper',
        bounds: unionBounds([
          this.bounds.gc_dog,
          this.bounds.gc_newspaper
        ]),
        text: 'The dog and newspaper together. The photograph does not establish who brought it here.'
      }
    ];

    if (this.read().bagOpened) {
      targets.push({
        id: 'bulbs',
        bounds: this.bounds.gc_bag_onion,
        text: 'The open sack contains plant bulbs. An important detail Perkins may not enjoy.'
      });
    }

    const matching = targets.filter(
      target => this.covers(frame, target.bounds)
    );

    if (matching.length !== 1) {
      this.say(
        'No clear evidence frame. Include one complete subject: Olga and her can, the open sack, or the dog WITH the newspaper.'
      );

      return;
    }

    const target = matching[0];
    const progress = this.read();

    if (progress.photos.includes(target.id)) {
      this.say('Already documented. Additional copies do not make it more suspicious.');
      return;
    }

    this.write({
      photos: [...progress.photos, target.id]
    });

    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0.7);

    this.tweens.add({
      targets: this.flash,
      alpha: 0,
      duration: 220
    });

    this.refresh();
    this.say(`Photograph recorded. ${target.text}`);
  }

  keepWatching() {
    const progress = this.read();

    if (
      this.transitioning ||
      progress.bagOpened ||
      !progress.photos.includes('gardening')
    ) {
      return;
    }

    this.setCamera(false);
    this.transitioning = true;
    this.refreshActions();

    this.say('You wait quietly. No time or energy is charged.');

    this.tweens.add({
      targets: this.curtain,
      alpha: 1,
      duration: 350,

      onComplete: () => {
        this.write({ bagOpened: true });
        this.applyBagState();

        this.tweens.add({
          targets: this.curtain,
          alpha: 0,
          duration: 450,

          onComplete: () => {
            this.transitioning = false;
            this.refresh();

            this.say(
              'A little later, Olga has opened the sack. Plant bulbs. She has resumed watering. Photograph the contents.'
            );
          }
        });
      }
    });
  }

  talkToOlga() {
    if (!this.allPhotos() || this.read().completed) return;

    this.setCamera(false);

    this.showModal(
      'CALLING OVER THE FENCE',
      'You: “Olga? Why do you garden at midnight?”\n\n' +
      'Olga: “Because at noon Perkins explains how I should water. ' +
      'At two he explains soil. At four he explains why my tomatoes lack ambition.”\n\n' +
      '“At midnight, the plants get water and I get silence. Until you arrived.”\n\n' +
      'You: “And his newspaper?”\n\n' +
      'Olga: “The dog brings them. He takes the gardening section. ' +
      'Perkins only notices when the crossword disappears. Tell him he can have it back.”\n\n' +
      'This is Olga’s account, not something the photographs prove.',
      [{
        label: 'RECORD HER EXPLANATION',
        action: () => {
          this.write({ talked: true });
          this.closeModal();
          this.refresh();
          this.say('Olga’s explanation recorded. Prepare your report for Perkins.');
        }
      }]
    );
  }

  chooseReport() {
    if (!this.allPhotos() || !this.read().talked) return;

    this.setCamera(false);

    const lockedChoice = this.read().reportChoice;

    if (lockedChoice) {
      this.previewReport(lockedChoice);
      return;
    }

    this.showModal(
      'REPORT TO PERKINS',
      'The photographs show gardening, plant bulbs and a newspaper beside a dog.\n\n' +
      'Olga has explained her midnight routine. You can report the findings, ' +
      'or deliberately omit the innocent explanation to encourage Perkins’s suspicions.\n\n' +
      'Both endings: $100, 50 XP, reputation +10 up to its cap, ' +
      'and the “Much Ado About Mulch” achievement.\n\n' +
      'The choice changes integrity, not the contents of the photographs.',
      [
        {
          label: 'FACTS (+5 INTEGRITY)',
          action: () => this.previewReport('honest')
        },
        {
          label: 'SENSATION (-5 INTEGRITY)',
          action: () => this.previewReport('sensational')
        },
        {
          label: 'BACK',
          action: () => this.closeModal()
        }
      ]
    );
  }

  previewReport(choice) {
    const report = REPORTS[choice];

    if (!report) return;

    const locked = Boolean(this.read().reportChoice);

    this.showModal(
      report.title,
      report.text +
      '\n\nREWARDS: $100 · 50 XP · reputation +10 (cap 100)' +
      '\nACHIEVEMENT: Much Ado About Mulch' +
      `\nINTEGRITY: ${report.delta > 0 ? '+' : ''}${report.delta} (subject to limits)` +
      '\n\nConfirming locks this ending. An interrupted settlement can be retried.',
      [
        {
          label: locked ? 'RETRY SETTLEMENT' : 'CONFIRM & SEND',
          action: () => this.submitReport(choice)
        },
        {
          label: locked ? 'CLOSE' : 'BACK',
          action: () => {
            if (locked) this.closeModal();
            else this.chooseReport();
          }
        }
      ]
    );
  }

  submitReport(choice) {
    if (
      this.submitting ||
      !REPORTS[choice] ||
      !this.allPhotos() ||
      !this.read().talked
    ) {
      return;
    }

    const saved = this.read();

    if (saved.reportChoice && saved.reportChoice !== choice) {
      return;
    }

    const quest = gameState.piQuests?.quests?.[CASE_ID];

    if (!quest) {
      this.closeModal();
      this.say(
        'Accept The Midnight Gardener in Classifieds before submitting the report. Your observations are saved.'
      );
      return;
    }

    if (
      !['active', 'settling'].includes(quest.status) &&
      quest.rewardSettlement?.completed !== true
    ) {
      this.closeModal();
      this.say('This contract cannot be settled in its current state.');
      return;
    }

    if (!Array.isArray(quest.objectives) || !quest.objectives.length) {
      this.closeModal();
      this.say('The contract has no valid objectives. Check the case definition.');
      return;
    }

    this.submitting = true;

    try {
      const report = REPORTS[choice];

      this.write({
        reportChoice: choice,
        reportText: report.text
      });

      const reputationBefore = getReputation();

      applyPIIntegrityDecision({
        caseId: CASE_ID,
        decisionId: 'final_report',
        effect: report.effect
      });

      if (this.read().integrityDelta == null) {
        this.write({
          integrityDelta:
            getReputation().integrity - reputationBefore.integrity
        });
      }

      const current = gameState.piQuests.quests[CASE_ID];

      gameState.piQuests = {
        ...gameState.piQuests,

        quests: {
          ...gameState.piQuests.quests,

          [CASE_ID]: {
            ...current,

            objectives: current.objectives.map(objective => ({
              ...objective,
              completed: true
            })),

            resolution: {
              ...(current.resolution || {}),
              endingId: choice,
              report: report.text,
              witnessStatement: 'Olga explains that she gardens at midnight to avoid Perkins’s commentary.',
              photoIds: [...this.read().photos]
            }
          }
        }
      };

      requestAutosave();

      const result = settlePICaseRewards(CASE_ID);

      if (!result.ok) {
        this.closeModal();
        this.say(result.message);
        return;
      }

      this.write({ completed: true });
      this.closeInvestigation(choice, report.text);
      this.closeModal();
      this.refresh();

      this.showModal(
        'CASE CLOSED',
        report.reply +
        '\n\nSettlement recorded: $100, 50 XP, reputation reward +10 ' +
        '(maximum 100), achievement: Much Ado About Mulch.' +
        `\nIntegrity decision: ${report.delta > 0 ? '+' : ''}${report.delta}.` +
        '\n\nRecorded rewards are not paid again.',
        [{
          label: 'BACK TO THE GARDEN',
          action: () => this.closeModal()
        }]
      );
    } catch (error) {
      console.error('[GrandConspiracy] Report interrupted:', error);

      this.closeModal();
      this.say(
        'Report settlement interrupted. Use REPORT to retry the same ending. Recorded rewards will not repeat.'
      );
    } finally {
      this.submitting = false;
      this.refreshActions();
    }
  }

  closeInvestigation(choice, reportText) {
    const investigations = gameState.piInvestigations;
    const investigation = investigations?.cases?.[CASE_ID];

    if (!investigation) return;

    const board = copy(
      investigation.board || { items: [], links: [] }
    );

    const id = 'grand_conspiracy_final_report';

    board.items = [
      ...(Array.isArray(board.items) ? board.items : [])
        .filter(item => item.id !== id),

      {
        id,
        type: 'note',
        label: 'Final report — The Midnight Gardener',
        text: reportText,
        metaText: 'Report sent to Elder Perkins',
        color: 'yellow',
        x: 120,
        y: 380,
        discovered: true,
        pinned: true,
        createdByPlayer: false,
        editableByPlayer: false
      }
    ];

    gameState.piInvestigations = {
      ...investigations,

      cases: {
        ...investigations.cases,

        [CASE_ID]: {
          ...investigation,
          status: 'completed',
          resolution: {
            ...(investigation.resolution || {}),
            endingId: choice,
            report: reportText
          },
          board
        }
      }
    };

    requestAutosave();
  }

  showModal(title, body, choices) {
    this.closeModal();

    this.dragStart = null;
    this.selection.clear();
    this.aim.setVisible(false);

    const width = Math.min(this.W - 70, 1100);
    const x = (this.W - width) / 2;
    const y = 80;

    const root = this.add.container(0, 0).setDepth(200);

    const blocker = this.add.rectangle(
      0, 0, this.W, this.H, 0x000000, 0.8
    ).setOrigin(0).setInteractive();

    const heading = this.text(
      x + 30, y + 24, title, 26, width - 60
    );

    const content = this.text(
      x + 30,
      heading.y + heading.height + 22,
      body,
      23,
      width - 60
    ).setLineSpacing(5);

    const buttonTop = content.y + content.height + 28;
    const buttons = [];

    let bx = x + 30;
    let by = buttonTop;

    for (const choice of choices) {
      const button = this.button(
        bx, by, choice.label, choice.action
      );

      if (
        bx > x + 30 &&
        bx + button.width > x + width - 30
      ) {
        bx = x + 30;
        by += 58;
        button.setPosition(bx, by);
      }

      buttons.push(button);
      bx += button.width + 14;
    }

    const panelHeight = by - y + 86;

    const panel = this.add.rectangle(
      x, y, width, panelHeight, 0x152331
    )
      .setOrigin(0)
      .setStrokeStyle(2, 0xd4af37);

    root.add([
      blocker,
      panel,
      heading,
      content,
      ...buttons
    ]);

    this.modal = root;
  }

  closeModal() {
    this.modal?.destroy(true);
    this.modal = null;
  }

  refreshActions() {
    for (const button of this.actions) button.destroy();
    this.actions = [];

    if (!this.message) return;

    const progress = this.read();
    const y = this.H - 64;

    const entries = [];

    if (!progress.completed && !this.transitioning) {
      entries.push({
        label: this.photoMode ? 'CAMERA: ON' : 'CAMERA: OFF',
        action: () => this.toggleCamera()
      });

      if (
        progress.photos.includes('gardening') &&
        !progress.bagOpened
      ) {
        entries.push({
          label: 'KEEP WATCHING',
          action: () => this.keepWatching()
        });
      }

      if (this.allPhotos()) {
        entries.push({
          label: progress.talked ? 'TALK AGAIN' : 'CALL TO OLGA',
          action: () => this.talkToOlga()
        });
      }

      if (progress.talked && this.allPhotos()) {
        entries.push({
          label: 'REPORT',
          action: () => this.chooseReport()
        });
      }
    }

    let x = 28;

    for (const entry of entries) {
      const button = this.button(
        x, y, entry.label, entry.action
      );

      if (entry.label === 'CAMERA: ON') {
        button.setBackgroundColor('#7a2a22');
      }

      this.actions.push(button);
      x += button.width + 14;
    }

    if (!this.transitioning) {
      this.actions.push(
        this.button(
          this.W - 150,
          y,
          'LEAVE',
          () => this.leave()
        )
      );
    }
  }

  refresh() {
    this.counter.setText(
      `PHOTOS: ${this.read().photos.length}/3`
    );

    this.applyBagState();
    this.refreshActions();
  }

  say(message) {
    this.message?.setText(message);
  }

  leave() {
    if (this.transitioning || this.submitting) return;

    const returnScenes = [...this.returnScenes];

    this.input.setDefaultCursor('default');
    this.scene.stop();

    for (const key of returnScenes) {
      if (this.scene.isPaused(key)) {
        this.scene.resume(key);
      }
    }
  }
}