import { BaseScene } from './BaseScene.js';

const FONT_UI = 'PressStart2P';
const FONT_DOC = 'SpecialElite';
const EXIT_SCENE = 'CrimeBoardScene'; // TODO: podmień na klucz swojej sceny

const KEYWORDS = [
  { id: 'M', label: 'M.', real: true },
  { id: 'tuesday', label: 'Tuesday', real: true },
  { id: 'artifact', label: 'artifact', real: true },
  { id: '50000', label: '50,000 EUR', real: true },
  { id: 'ledger', label: 'ledger', real: true },
  { id: 'sister', label: 'sister', real: true },
  { id: 'lisbon', label: 'Lisbon', real: true },
  { id: 'wife', label: 'wife', real: true },
  { id: 'monday', label: 'Monday', real: false },
  { id: 'painting', label: 'painting', real: false },
  { id: 'brother', label: 'brother', real: false },
  { id: 'paris', label: 'Paris', real: false },
];

const SENTENCES = [
  { id: 'meet', text: 'Eliasz met with ______ on ______.', blanks: ['M', 'tuesday'] },
  { id: 'transaction', text: 'His last transaction was ______ for ______.', blanks: ['artifact', '50000'] },
  { id: 'hidden', text: 'He hid the ______ in a place only his ______ knows.', blanks: ['ledger', 'sister'] },
  { id: 'escape', text: 'He planned to flee to ______ because he feared his ______.', blanks: ['lisbon', 'wife'] },
];

export class OfficeDeductionScene extends BaseScene {
  constructor() {
    super('OfficeDeductionScene');
  }

  create() {
    super.create();
    this.foundKeywords = new Set();
    this.solvedSentences = new Set();
    this.buildOffice();
    this.buildDeductionBoard();
    this.setMessage('Eliasz\'s office. The lock is open. Now find the truth.');
  }

  // ---------- OFFICE EXPLORATION ----------

  buildOffice() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x2a1f1a);

    this.add.text(W / 2, 34, 'ELIASZ\'S OFFICE', {
      fontFamily: FONT_UI, fontSize: '20px', color: '#ffd75e',
    }).setOrigin(0.5);

    // Biurko
    this.add.rectangle(W / 2, H / 2 + 60, 500, 200, 0x4a3728).setStrokeStyle(3, 0x2a1f1a);

    // Interaktywne obiekty
    this.makeClueObject(W / 2 - 180, H / 2 + 20, 'SHREDDED DOCS', () => this.openShreddedPuzzle());
    this.makeClueObject(W / 2, H / 2 + 20, 'PHONE', () => this.openPhonePuzzle());
    this.makeClueObject(W / 2 + 180, H / 2 + 20, 'CALENDAR', () => this.openCalendarPuzzle());
    this.makeClueObject(W / 2 - 90, H / 2 + 120, 'NOTEBOOK', () => this.openCipherPuzzle());
    this.makeClueObject(W / 2 + 90, H / 2 + 120, 'DRAWER', () => this.openDrawerPuzzle());

    // Przycisk dedukcji
    this.deductionButton = this.makeUiButton(W / 2, H - 60, 'DEDUCTION BOARD', () => this.toggleDeductionBoard());
    this.deductionButton.setVisible(false);

    this.messageText = this.add.text(W / 2, H - 100, '', {
      fontFamily: FONT_UI, fontSize: '11px', color: '#ffe9a8',
      wordWrap: { width: W - 260 }, align: 'center',
    }).setOrigin(0.5);
  }

  makeClueObject(x, y, label, cb) {
    const bg = this.add.rectangle(x, y, 140, 60, 0x3a2f26).setStrokeStyle(2, 0x8a7f5c)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: FONT_UI, fontSize: '10px', color: '#ffd75e' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
  }

  // ---------- MINI-PUZZLES (KEYWORD SOURCES) ----------

  openShreddedPuzzle() {
    this.setMessage('Reconstructing shredded documents...');
    // TODO: tu wstawisz własną mini-grę z rekonstrukcją dokumentów
    // Na razie symulacja: po 2 sekundach dostajesz słowa
    this.time.delayedCall(2000, () => {
      this.addKeywords(['M', 'tuesday', 'artifact']);
      this.setMessage('Documents reconstructed. Found keywords: M., Tuesday, artifact.');
    });
  }

  openPhonePuzzle() {
    this.setMessage('Scrolling through messages...');
    this.time.delayedCall(1500, () => {
      this.addKeywords(['50000', 'ledger']);
      this.setMessage('Last message: "50,000 EUR for the ledger. Tuesday."');
    });
  }

  openCalendarPuzzle() {
    this.setMessage('Examining calendar...');
    this.time.delayedCall(1500, () => {
      this.addKeywords(['sister']);
      this.setMessage('Calendar shows a circled date with "Sister\'s birthday" and a question mark.');
    });
  }

  openCipherPuzzle() {
    this.setMessage('Decoding notebook cipher...');
    this.time.delayedCall(2500, () => {
      this.addKeywords(['lisbon', 'wife']);
      this.setMessage('Cipher decoded: "Lisbon. She knows. Must disappear."');
    });
  }

  openDrawerPuzzle() {
    this.setMessage('Drawer is locked. No key here.');
    // Red herring – nic nie daje
  }

  addKeywords(ids) {
    ids.forEach(id => this.foundKeywords.add(id));
    if (this.foundKeywords.size >= 6) {
      this.deductionButton.setVisible(true);
    }
  }

  // ---------- DEDUCTION BOARD ----------

  buildDeductionBoard() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.board = this.add.container(0, 0).setVisible(false).setDepth(10);
    this.board.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setInteractive());
    this.board.add(this.add.rectangle(W / 2, H / 2, W - 120, H - 100, 0xf1ead8).setStrokeStyle(4, 0x8a7f5c));

    this.board.add(this.add.text(W / 2, 60, 'DEDUCTION BOARD', {
      fontFamily: FONT_UI, fontSize: '18px', color: '#2b2b2b',
    }).setOrigin(0.5));

    // Zdania z pustymi polami
    this.sentenceContainers = [];
    SENTENCES.forEach((sent, idx) => {
      const y = 140 + idx * 80;
      const container = this.add.container(W / 2 - 350, y);
      const text = this.add.text(0, 0, sent.text, {
        fontFamily: FONT_DOC, fontSize: '20px', color: '#2b2b2b',
      });
      container.add(text);

      // Puste pola (blanks)
      sent.blanks.forEach((blankId, blankIdx) => {
        const blankX = 200 + blankIdx * 150;
        const blank = this.add.rectangle(blankX, 0, 130, 36, 0xffffff)
          .setStrokeStyle(2, 0x8a7f5c)
          .setInteractive({ useHandCursor: true, dropZone: true });
        blank.setData('sentenceId', sent.id);
        blank.setData('blankIdx', blankIdx);
        blank.setData('filledWith', null);
        container.add(blank);
      });

      this.board.add(container);
      this.sentenceContainers.push({ container, sent, y });
    });

    // Pula słów
    this.keywordPool = this.add.container(W / 2 - 350, H - 180);
    this.board.add(this.keywordPool);

    // Przycisk sprawdzania
    this.checkButton = this.add.rectangle(W / 2, H - 80, 200, 50, 0x27ae60)
      .setStrokeStyle(3, 0x1a5a3a)
      .setInteractive({ useHandCursor: true });
    this.board.add(this.checkButton);
    this.board.add(this.add.text(W / 2, H - 80, 'CHECK DEDUCTIONS', {
      fontFamily: FONT_UI, fontSize: '12px', color: '#fff',
    }).setOrigin(0.5));
    this.checkButton.on('pointerdown', () => this.checkDeductions());

    // Przycisk zamknięcia
    this.closeButton = this.add.rectangle(W - 100, 60, 80, 40, 0xc0392b)
      .setStrokeStyle(2, 0x8a2a2a)
      .setInteractive({ useHandCursor: true });
    this.board.add(this.closeButton);
    this.board.add(this.add.text(W - 100, 60, 'CLOSE', {
      fontFamily: FONT_UI, fontSize: '10px', color: '#fff',
    }).setOrigin(0.5));
    this.closeButton.on('pointerdown', () => this.toggleDeductionBoard());

    this.resultText = this.add.text(W / 2, H - 30, '', {
      fontFamily: FONT_UI, fontSize: '12px', color: '#2b2b2b',
    }).setOrigin(0.5);
    this.board.add(this.resultText);
  }

  toggleDeductionBoard() {
    const isVisible = this.board.visible;
    this.board.setVisible(!isVisible);
    if (!isVisible) {
      this.populateKeywordPool();
    }
  }

  populateKeywordPool() {
    this.keywordPool.removeAll(true);
    const available = KEYWORDS.filter(k => this.foundKeywords.has(k.id));
    available.forEach((kw, idx) => {
      const x = (idx % 4) * 180;
      const y = Math.floor(idx / 4) * 50;
      const bg = this.add.rectangle(x, y, 160, 40, 0xffffff)
        .setStrokeStyle(2, 0x8a7f5c)
        .setInteractive({ useHandCursor: true, draggable: true });
      const label = this.add.text(x, y, kw.label, {
        fontFamily: FONT_DOC, fontSize: '16px', color: '#2b2b2b',
      }).setOrigin(0.5);
      bg.setData('keywordId', kw.id);
      bg.setData('label', label);
      this.keywordPool.add([bg, label]);

      // Drag & drop
      this.input.setDraggable(bg);
      bg.on('drag', (pointer, dragX, dragY) => {
        bg.x = dragX;
        bg.y = dragY;
        label.x = dragX;
        label.y = dragY;
      });
      bg.on('dragend', (pointer) => {
        // Sprawdź czy upuszczono na blank
        const dropped = this.sentenceContainers.some(({ container, sent }) => {
          const blanks = container.list.filter(c => c.type === 'Rectangle' && c.input?.dropZone);
          return blanks.some(blank => {
            const bounds = blank.getBounds();
            if (bounds.contains(pointer.x, pointer.y)) {
              blank.setData('filledWith', kw.id);
              blank.setFillStyle(0xd4edda);
              // Usuń z pool
              bg.destroy();
              label.destroy();
              return true;
            }
            return false;
          });
        });
        if (!dropped) {
          // Wróć do pool
          bg.x = x;
          bg.y = y;
          label.x = x;
          label.y = y;
        }
      });
    });
  }

  checkDeductions() {
    let correct = 0;
    let close = 0;
    let incorrect = 0;

    this.sentenceContainers.forEach(({ container, sent }) => {
      const blanks = container.list.filter(c => c.type === 'Rectangle' && c.input?.dropZone);
      const filled = blanks.map(b => b.getData('filledWith'));
      const expected = sent.blanks;

      if (filled.every((f, i) => f === expected[i])) {
        correct++;
        this.solvedSentences.add(sent.id);
        blanks.forEach(b => b.setFillStyle(0x7dff7a));
      } else if (filled.some((f, i) => f === expected[i])) {
        close++;
        blanks.forEach(b => b.setFillStyle(0xffd75e));
      } else {
        incorrect++;
        blanks.forEach(b => b.setFillStyle(0xff7a7a));
      }
    });

    if (correct === SENTENCES.length) {
      this.resultText.setText('ALL CORRECT. New location unlocked: Lisbon Docks.');
      this.addScore(500);
      this.registry.set('newLocation', 'lisbon_docks');
      this.registry.set('newSuspect', 'M');
      this.time.delayedCall(2000, () => this.scene.start(EXIT_SCENE));
    } else if (close > 0) {
      this.resultText.setText(`${correct} correct, ${close} close, ${incorrect} incorrect. Keep digging.`);
      this.addScore(100);
    } else {
      this.resultText.setText('All incorrect. The truth is still hiding.');
      this.addScore(-50);
    }
  }

  addScore(delta) {
    const score = (this.registry.get('score') ?? 0) + delta;
    this.registry.set('score', score);
  }

  setMessage(msg) {
    this.messageText.setText(msg);
  }

  makeUiButton(x, y, label, cb) {
    const bg = this.add.rectangle(x, y, 200, 40, 0x24344d).setStrokeStyle(2, 0x9fd0ff)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: FONT_UI, fontSize: '12px', color: '#9fd0ff' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
    return bg;
  }
}