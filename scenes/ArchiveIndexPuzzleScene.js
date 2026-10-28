import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';

const PUZZLE_KEY = 'archive_index_puzzle';
const COMPLETE_FLAG = 'duplicate_record_found';

const PAIRS = [
  {
    id: 'expenses',
    cards: [
      ['EXPENSE CLAIM', 'Taxi to the airport.\nReceipt attached.'],
      ['FINANCE', 'Ground transport\nreimbursements.']
    ]
  },
  {
    id: 'conservation',
    cards: [
      ['CONDITION REPORT', 'Ceramic vessel.\nNew crack after transit.'],
      ['CONSERVATION', 'Objects requiring\nrepair or stabilisation.']
    ]
  },
  {
    id: 'customs',
    cards: [
      ['IMPORT DECLARATION', 'Antiquity entering\nthe country.'],
      ['CUSTOMS', 'Border clearance\nand import paperwork.']
    ]
  },
  {
    id: 'training',
    cards: [
      ['COURSE CERTIFICATE', 'Agent passed the\nlockpicking assessment.'],
      ['TRAINING', 'Staff qualifications\nand completed courses.']
    ]
  },
  {
    id: 'loan',
    cards: [
      ['LOAN AGREEMENT', 'Museum borrows a mask.\nReturn due in June.'],
      ['LOANS', 'Temporary transfers\nwith a return date.']
    ]
  },
  {
    id: 'maintenance',
    cards: [
      ['SERVICE REQUEST', 'Projector emits smoke.\nNot a special effect.'],
      ['MAINTENANCE', 'Broken equipment\nand repair requests.']
    ]
  },
  {
    id: 'leave',
    cards: [
      ['LEAVE REQUEST', 'Five days off.\nReason: not being here.'],
      ['PERSONNEL', 'Staff leave\nand absence records.']
    ]
  }
];

function makeCards() {
  const cards = PAIRS.flatMap(pair =>
    pair.cards.map(([title, body], index) => ({
      id: `${pair.id}_${index}`,
      pairId: pair.id,
      title,
      body,
      anomaly: false
    }))
  );

  cards.push(
    {
      id: 'john_general',
      pairId: null,
      title: 'CATALOGUE INDEX',
      body: 'JM-041 / McCLANE, J.\nField report\nGENERAL ARCHIVE',
      anomaly: true
    },
    {
      id: 'john_restricted',
      pairId: null,
      title: 'CATALOGUE INDEX',
      body: 'JM-041 / McCLANE, J.\nField report\nRESTRICTED STORAGE',
      anomaly: true
    }
  );

  return Phaser.Utils.Array.Shuffle(cards);
}

export class ArchiveIndexPuzzleScene extends BaseScene {
  constructor() {
    super({ key: 'ArchiveIndexPuzzleScene' });
  }

  init(data = {}) {
    this.returnSceneKey = data.returnSceneKey ?? null;
    this.resumeReturnScene = data.resumeReturnScene === true;
    this.onFinished = typeof data.onFinished === 'function'
      ? data.onFinished
      : null;

    this.selected = [];
    this.cards = [];
    this.matchedPairs = 0;
    this.mistakes = 0;
    this.locked = false;
    this.finished = false;
    this.closing = false;
    this.pendingReset = null;
  }

  create() {
    super.create();

    const saved = MainStoryManager.getSideClue(PUZZLE_KEY);
    this.finished = MainStoryManager.hasFlag(COMPLETE_FLAG);
    this.mistakes = Number.isInteger(saved?.mistakes)
      ? saved.mistakes
      : 0;

    this.cameras.main.setBackgroundColor('#171619');

    this.root = this.add.container(0, 0);

    this.buildDesk();
    this.buildHeader();

    if (this.finished) {
      this.showDiscovery();
    } else {
      this.buildCards();
    }

    this.layout();

    this.trackInputEvent(this.scale, 'resize', this.layout);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.pendingReset?.remove(false);
      this.pendingReset = null;
      this.releaseParent();
      this.onFinished = null;
    });
  }

  text(x, y, content, size = 20, color = '#e8dfc8') {
    const object = this.add.text(x, y, content, {
      fontFamily: 'SpecialElite, monospace',
      fontSize: `${size}px`,
      color,
      align: 'center',
      wordWrap: { width: 1040 }
    }).setOrigin(0.5);

    this.root.add(object);
    return object;
  }

  buildDesk() {
    const background = this.add.rectangle(
      600, 400, 1200, 800, 0x292329
    );

    const inset = this.add.rectangle(
      600, 405, 1156, 754, 0x362c2b
    ).setStrokeStyle(3, 0x73594b);

    this.root.add([background, inset]);

    for (let y = 145; y < 735; y += 95) {
      const line = this.add.rectangle(
        600, y, 1100, 2, 0x211b20, 0.4
      );
      this.root.add(line);
    }
  }

  buildHeader() {
    const title = this.text(
      600, 54, 'THE FILING INCIDENT', 22, '#f0ce88'
    );
    title.setFontFamily('PressStart2P, monospace');

    this.text(
      600, 96,
      'Match each document to its department. Select two cards.',
      21
    );

    this.progressText = this.text(
      600, 133, 'FILED: 0 / 7', 19, '#b6c7b0'
    );

    this.messageText = this.text(
      600, 687,
      'Seven sensible pairs. One deeply unsensible filing system.',
      21
    );

    this.closeButton = this.makeButton(
      1055, 750, 'LEAVE', () => this.closePuzzle()
    );

    this.text(
      480, 750,
      'FRANK: "Alphabetical order is not a political opinion."',
      18, '#b5a18c'
    );
  }

  makeButton(x, y, label, callback) {
    const container = this.add.container(x, y);

    const background = this.add.rectangle(
      0, 0, 190, 48, 0x4a3933
    ).setStrokeStyle(2, 0xc8a56b);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'SpecialElite, monospace',
      fontSize: '21px',
      color: '#f4e6c8'
    }).setOrigin(0.5);

    container.add([background, text]);
    this.root.add(container);

    background.setInteractive({ useHandCursor: true });
    background.on('pointerdown', callback);
    background.on('pointerover', () => {
      background.setFillStyle(0x675043);
    });
    background.on('pointerout', () => {
      background.setFillStyle(0x4a3933);
    });

    return container;
  }

  buildCards() {
    makeCards().forEach((data, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);

      const container = this.add.container(
        174 + column * 284,
        225 + row * 120
      );

      const paper = this.add.rectangle(
        0, 0, 266, 108, 0xe2d4b6
      ).setStrokeStyle(2, 0x9c8969);

      const title = this.add.text(0, -34, data.title, {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '18px',
        color: '#352c29',
        align: 'center',
        wordWrap: { width: 246 }
      }).setOrigin(0.5);

      const body = this.add.text(0, 13, data.body, {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '17px',
        color: '#4d4339',
        align: 'center',
        lineSpacing: 2,
        wordWrap: { width: 246 }
      }).setOrigin(0.5);

      const stamp = this.add.text(0, 4, 'FILED', {
        fontFamily: 'PressStart2P, monospace',
        fontSize: '22px',
        color: '#285d42',
        backgroundColor: '#e2d4b6',
        padding: { x: 8, y: 7 }
      }).setOrigin(0.5).setAngle(-12).setVisible(false);

      container.add([paper, title, body, stamp]);
      this.root.add(container);

      const card = {
        ...data,
        container,
        paper,
        stamp,
        matched: false
      };

      this.cards.push(card);

      paper.setInteractive({ useHandCursor: true });
      paper.on('pointerdown', () => this.selectCard(card));
    });
  }

  selectCard(card) {
    if (
      this.locked ||
      this.finished ||
      this.closing ||
      card.matched
    ) {
      return;
    }

    const selectedIndex = this.selected.indexOf(card);

    if (selectedIndex !== -1) {
      this.selected.splice(selectedIndex, 1);
      this.paintCard(card);
      return;
    }

    this.selected.push(card);
    this.paintCard(card);

    if (this.selected.length !== 2) return;

    const [first, second] = this.selected;

    if (first.anomaly && second.anomaly) {
      if (this.matchedPairs === PAIRS.length) {
        this.finishPuzzle();
      } else {
        this.rejectSelection(
          'Same report. Different destinations. File the ordinary pairs first.',
          false
        );
      }
      return;
    }

    if (
      !first.anomaly &&
      !second.anomaly &&
      first.pairId === second.pairId
    ) {
      first.matched = true;
      second.matched = true;
      first.paper.disableInteractive();
      second.paper.disableInteractive();
      first.stamp.setVisible(true);
      second.stamp.setVisible(true);

      this.selected = [];
      this.matchedPairs += 1;

      this.paintCard(first);
      this.paintCard(second);

      this.progressText.setText(
        `FILED: ${this.matchedPairs} / ${PAIRS.length}`
      );

      if (this.matchedPairs === PAIRS.length) {
        this.messageText.setText(
          'Two cards remain. Compare them. Why does one report have two destinations?'
        );

        this.cards
          .filter(item => item.anomaly)
          .forEach(item => item.paper.setStrokeStyle(4, 0xe7b85e));
      } else {
        this.messageText.setText(
          'Filed. Frank has postponed his disappointment.'
        );
      }

      return;
    }

    this.rejectSelection(
      'Wrong department. Bureaucracy is cruel, but occasionally specific.',
      true
    );
  }

  paintCard(card) {
    if (card.matched) {
      card.paper.setFillStyle(0xb7bea5);
      card.paper.setStrokeStyle(2, 0x6e8067);
      return;
    }

    const selected = this.selected.includes(card);

    card.paper.setFillStyle(selected ? 0xf5e6bd : 0xe2d4b6);
    card.paper.setStrokeStyle(
      selected ? 4 : 2,
      selected ? 0xe3a743 : 0x9c8969
    );
  }

  rejectSelection(message, countMistake) {
    this.locked = true;

    if (countMistake) this.mistakes += 1;

    this.messageText.setText(message);

    this.selected.forEach(card => {
      card.paper.setStrokeStyle(4, 0xb65a49);
    });

    this.pendingReset = this.time.delayedCall(1000, () => {
      const previous = [...this.selected];

      this.selected = [];
      this.locked = false;
      this.pendingReset = null;

      previous.forEach(card => this.paintCard(card));
    });
  }

  finishPuzzle() {
    if (this.finished) return;

    this.finished = true;
    this.locked = true;
    this.selected = [];

    MainStoryManager.setSideClue(PUZZLE_KEY, {
      completed: true,
      matchedPairs: PAIRS.length,
      mistakes: this.mistakes,
      documentId: 'JM-041',
      subject: 'John McClane',
      destinations: ['general_archive', 'restricted_storage']
    });

    MainStoryManager.setFlag(COMPLETE_FLAG, true);

    this.cards.forEach(card => card.container.setVisible(false));

    this.showDiscovery();

    this.emitBus('archive:indexPuzzleCompleted', {
      documentId: 'JM-041',
      flag: COMPLETE_FLAG
    });
  }

  showDiscovery() {
    this.progressText.setText('ANOMALY FOUND');
    this.messageText.setText(
      'New lead: ask Frank why the same report appears in two catalogues.'
    );

    const paper = this.add.rectangle(
      600, 392, 970, 420, 0xe2d4b6
    ).setStrokeStyle(3, 0x9c8969);

    this.root.add(paper);

    this.text(
      600, 226, 'ONE REPORT. TWO DESTINATIONS.', 27, '#4c3028'
    );

    this.text(
      600, 289,
      'DOCUMENT: JM-041\nSUBJECT: McCLANE, John\nTYPE: Field report',
      25, '#38302b'
    );

    this.text(
      358, 391,
      'CATALOGUE A\n\nGENERAL ARCHIVE',
      24, '#354c3a'
    );

    this.text(
      842, 391,
      'CATALOGUE B\n\nRESTRICTED STORAGE',
      24, '#853b32'
    );

    this.text(
      600, 501,
      'The same report is indexed in both the ordinary archive\n' +
      'and restricted storage. That deserves an explanation.',
      23, '#38302b'
    );

    this.text(
      600, 562,
      '"One document. Two filing destinations. How very efficient."',
      20, '#725747'
    );
  }

  layout() {
    if (!this.root) return;

    const { width, height } = this.scale;
    const scale = Math.min(width / 1200, height / 800);

    this.root.setScale(scale);
    this.root.setPosition(
      (width - 1200 * scale) / 2,
      (height - 800 * scale) / 2
    );
  }

  releaseParent() {
    if (
      this.resumeReturnScene &&
      this.returnSceneKey &&
      this.isScenePaused(this.returnSceneKey)
    ) {
      this.scene.resume(this.returnSceneKey);
    }

    this.resumeReturnScene = false;
  }

  closePuzzle() {
    if (this.closing) return;
    this.closing = true;

    const callback = this.onFinished;
    this.onFinished = null;

    const result = {
      completed: this.finished,
      mistakes: this.mistakes,
      documentId: this.finished ? 'JM-041' : null
    };

    this.releaseParent();

    try {
      callback?.(result);
    } finally {
      this.scene.stop();
    }
  }
}