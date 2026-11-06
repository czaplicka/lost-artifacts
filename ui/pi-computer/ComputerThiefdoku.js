
import { COLORS } from './ComputerTheme.js';
import { ThiefdokuPuzzle, PEOPLE } from '../../systems/thiefdoku/ThiefdokuPuzzle.js';

const ROOM_COLORS = {
  bathroom: 0xe8c4d2,
  archive: 0x9eabd0,
  bedroom: 0xc77e91,
  living: 0xcbb8d4,
  guest: 0xe9b99d
};

const ROOM_DARK = {
  bathroom: 0x9d667d,
  archive: 0x586b9d,
  bedroom: 0x8e485d,
  living: 0x80618d,
  guest: 0x9d674f
};

const PERSON_COLORS = {
  curator: { fill: 0x477ca9, light: 0x8bb5d7 },
  guard: { fill: 0x9a536e, light: 0xd18ba9 },
  assistant: { fill: 0x4c9862, light: 0x83c795 },
  cleaner: { fill: 0xb37a43, light: 0xe2b77d }
};

export class ComputerThiefdoku {
  constructor(ui) {
    this.ui = ui;
    this.puzzle = new ThiefdokuPuzzle();
    this.feedback = 'Place one person in every row and column.';
    this.selectedPerson = null;
    this.showSolution = false;
  }

  reset() {
    this.puzzle.reset();
    this.selectedPerson = null;
    this.feedback = 'New puzzle generated. Good luck, detective.';
    this.showSolution = false;
    this.ui.render();
  }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const scene = ui.scene;
    const box = ui.window;

    if (!box) return;

    const x = box.x + 18;
    const y = box.y + 48;
    const w = box.w - 36;
    const h = box.h - 100;

    d.rectangle(x, y, w, h, 0xd6d2c5);
    d.rectangle(x, y, w, 34, 0x26384b);
    d.pixel(x + 14, y + 10, 'THIEFDOKU // CRIME SCENE LOGIC', 10, '#f1e7ca');

    d.pixel(x + 14, y + 48, 'THE RULES', 9, '#374252');
    d.text(
      x + 14,
      y + 65,
      'Place all four people. One person per row and column.',
      14,
      '#282b32',
      w - 28
    );

    const boardX = x + 18;
    const boardY = y + 112;
    const boardSize = Math.min(470, h - 150);
    const cell = boardSize / 4;

    this.drawBoard(boardX, boardY, cell);
    this.drawPeoplePanel(boardX + boardSize + 24, boardY, w - boardSize - 60, boardSize);
    this.drawClues(boardX, boardY + boardSize + 18, w, h - boardSize - 150);

    d.button(x + 18, y + h - 38, 'CHECK THE BOARD', () => this.checkBoard());
    d.button(x + 205, y + h - 38, 'NEW PUZZLE', () => this.reset());

    const statusColor = this.feedback.startsWith('Correct') ? '#27643c' : '#633b35';
    d.text(x + 390, y + h - 34, this.feedback, 13, statusColor, w - 410);
  }

  drawBoard(boardX, boardY, cell) {
    const ui = this.ui;
    const d = ui.drawing;
    const s = this.puzzle.getState();

    // Kolorowe pola pokoju.
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const room = s.layout[row][col];
        const px = boardX + col * cell;
        const py = boardY + row * cell;

        d.rectangle(px, py, cell, cell, ROOM_COLORS[room] || 0xc8c5b9);
        d.rectangle(px, py, cell, cell, 0xffffff, 0.08);

        // Delikatna tekstura podłogi.
        d.rectangle(px + 8, py + 8, cell - 16, 2, 0xffffff, 0.16);
        d.rectangle(px + 8, py + cell - 10, cell - 16, 2, 0x000000, 0.08);

        const personId = s.board[row][col];

        if (personId) {
          this.drawPerson(
            px + cell / 2,
            py + cell / 2,
            personId,
            cell * 0.31
          );
        }

        // Klikalne pole.
        const hit = ui.scene.add.rectangle(
          px + cell / 2,
          py + cell / 2,
          cell - 4,
          cell - 4,
          0xffffff,
          0.001
        ).setInteractive({ useHandCursor: true });

        d.add(hit);

        hit.on('pointerdown', () => {
          if (!this.selectedPerson) {
            if (personId && !this.puzzle.isFixedCell(row, col)) {
              this.puzzle.removePerson(row, col);
              this.selectedPerson = personId;
              this.feedback = 'Person picked up. Choose another square.';
              ui.render();
            }
            return;
          }

          if (this.puzzle.placePerson(row, col)) {
            this.selectedPerson = null;
            this.feedback = 'Person placed. Keep solving.';
            ui.render();
          } else {
            this.feedback = 'That square is locked or unavailable.';
            ui.render();
          }
        });
      }
    }

    // Linie siatki sudoku.
    const grid = ui.scene.add.graphics();
    d.add(grid);

    grid.lineStyle(2, 0x17191d, 1);

    for (let i = 0; i <= 4; i++) {
      const offset = i * cell;
      grid.lineBetween(boardX + offset, boardY, boardX + offset, boardY + cell * 4);
      grid.lineBetween(boardX, boardY + offset, boardX + cell * 4, boardY + offset);
    }

    // Mocne granice nieregularnych pokoi.
    grid.lineStyle(7, 0x17191d, 1);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const room = s.layout[row][col];
        const px = boardX + col * cell;
        const py = boardY + row * cell;

        if (row === 0 || s.layout[row - 1][col] !== room) {
          grid.lineBetween(px, py, px + cell, py);
        }

        if (col === 0 || s.layout[row][col - 1] !== room) {
          grid.lineBetween(px, py, px, py + cell);
        }

        if (row === 3 || s.layout[row + 1][col] !== room) {
          grid.lineBetween(px, py + cell, px + cell, py + cell);
        }

        if (col === 3 || s.layout[row][col + 1] !== room) {
          grid.lineBetween(px + cell, py, px + cell, py + cell);
        }
      }
    }

    // Etykiety pokoi.
    const seen = new Set();

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const room = s.layout[row][col];
        if (seen.has(room)) continue;
        seen.add(room);

        const cells = [];

        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (s.layout[r][c] === room) cells.push({ r, c });
          }
        }

        const first = cells[0];
        const px = boardX + first.c * cell + 6;
        const py = boardY + first.r * cell + 5;

        const label = s.roomNames[room] || room;
        const tag = d.pixel(px, py, label, 6, '#28242b');
        tag.setAlpha(0.8);
      }
    }
  }

  drawPerson(cx, cy, personId, radius) {
    const ui = this.ui;
    const g = ui.scene.add.graphics();
    ui.drawing.add(g);

    const colors = PERSON_COLORS[personId] || {
      fill: 0x555555,
      light: 0x999999
    };

    // Cień.
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(cx + 3, cy + radius * 0.9, radius * 1.8, radius * 0.55);

    // Sylwetka.
    g.fillStyle(0x17191d, 1);
    g.fillRoundedRect(
      cx - radius * 0.65,
      cy - radius * 0.45,
      radius * 1.3,
      radius * 1.55,
      radius * 0.4
    );

    g.fillStyle(colors.fill, 1);
    g.fillRoundedRect(
      cx - radius * 0.55,
      cy - radius * 0.55,
      radius * 1.1,
      radius * 1.4,
      radius * 0.4
    );

    g.fillStyle(colors.light, 1);
    g.fillCircle(cx, cy - radius * 0.65, radius * 0.42);

    g.lineStyle(2, 0x17191d, 1);
    g.strokeCircle(cx, cy - radius * 0.65, radius * 0.42);
  }

  drawPeoplePanel(x, y, width, height) {
    const ui = this.ui;
    const d = ui.drawing;
    const state = this.puzzle.getState();

    d.rectangle(x, y, width, height, 0xc1bdaf);
    d.frame(x, y, width, height, 0x34333a, 2);
    d.pixel(x + 12, y + 10, 'PEOPLE OF INTEREST', 8, '#34333a');

    const cardHeight = Math.min(76, (height - 48) / 4);

    PEOPLE.forEach((person, index) => {
      const cy = y + 34 + index * cardHeight;
      const selected = this.selectedPerson === person.id;
      const color = selected ? 0xf4e4a9 : 0xe3ded0;

      d.rectangle(x + 8, cy, width - 16, cardHeight - 6, color);
      d.frame(x + 8, cy, width - 16, cardHeight - 6, 0x39343a, selected ? 3 : 1);

      this.drawPerson(
        x + 31,
        cy + (cardHeight - 6) / 2,
        person.id,
        13
      );

      d.text(x + 54, cy + 9, person.name, 13, '#252932', width - 65);

      const placed = state.board.some(row => row.includes(person.id));
      d.pixel(
        x + 54,
        cy + 30,
        placed ? 'ON THE BOARD' : 'NOT PLACED',
        6,
        placed ? '#39734a' : '#765e55'
      );

      const hit = ui.scene.add.rectangle(
        x + width / 2,
        cy + (cardHeight - 6) / 2,
        width - 16,
        cardHeight - 6,
        0xffffff,
        0.001
      ).setInteractive({ useHandCursor: true });

      d.add(hit);

      hit.on('pointerdown', () => {
        this.selectedPerson = person.id;
        this.feedback = `${person.name} selected. Choose a square.`;
        ui.render();
      });
    });

    if (this.selectedPerson) {
      d.pixel(x + 12, y + height - 22, 'SELECTED:', 7, '#34333a');
      d.text(
        x + 85,
        y + height - 26,
        PEOPLE.find(p => p.id === this.selectedPerson)?.name || '',
        13,
        '#252932'
      );
    }
  }

  drawClues(x, y, width, height) {
    const d = this.ui.drawing;
    const clues = this.puzzle.getState().clues;

    d.rectangle(x, y, width, Math.max(70, height), 0xe5e0d2);
    d.frame(x, y, width, Math.max(70, height), 0x77736a, 1);
    d.pixel(x + 10, y + 8, 'WITNESS STATEMENTS', 8, '#39343a');

    clues.forEach((clue, index) => {
      d.text(
        x + 12,
        y + 28 + index * 22,
        `${index + 1}. ${clue.text}`,
        12,
        '#35333a',
        width - 24
      );
    });

    d.pixel(
      x + width - 150,
      y + 8,
      `ATTEMPTS: ${this.puzzle.attempts}/${this.puzzle.maxAttempts}`,
      7,
      '#8d3434'
    );
  }

  checkBoard() {
    const ui = this.ui;
    const validation = this.puzzle.validateBoard();

    if (!validation.valid) {
      this.feedback = validation.reason;
      ui.render();
      return;
    }

    const placed = this.puzzle.getPlacedPeople();
    const solution = this.puzzle.solution;

    const correct = placed.every(position => {
      const actual = solution.find(
        item => item.personId === position.personId
      );

      return actual &&
        actual.row === position.row &&
        actual.col === position.col;
    });

    this.puzzle.attempts++;

    if (correct) {
      const thief = solution.find(position =>
        this.puzzle.layout[position.row][position.col] === this.puzzle.artifactRoom
      );

      this.puzzle.completed = true;
      this.feedback = `Correct! ${this.puzzle.getPersonName(thief.personId)} is the thief.`;
    } else if (this.puzzle.attempts >= this.puzzle.maxAttempts) {
      this.feedback = 'Case failed. The thief got away. Start a new puzzle.';
    } else {
      this.feedback = `Not quite. ${this.puzzle.maxAttempts - this.puzzle.attempts} attempts left.`;
    }

    ui.render();
  }
}
