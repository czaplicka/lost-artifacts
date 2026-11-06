
const SIZE = 4;
const PERSON_COUNT = 4;

const PEOPLE = [
  { id: 'curator', name: 'The Curator', short: 'CURATOR' },
  { id: 'guard', name: 'Night Guard', short: 'GUARD' },
  { id: 'assistant', name: 'Assistant', short: 'ASSISTANT' },
  { id: 'cleaner', name: 'Cleaner', short: 'CLEANER' }
];

// Każda komórka należy do jednego pokoju.
// Układ jest celowo nieregularny.
const ROOM_LAYOUTS = [
  [
    ['bathroom', 'bathroom', 'archive', 'archive'],
    ['bathroom', 'archive', 'archive', 'archive'],
    ['bedroom', 'bedroom', 'living', 'living'],
    ['bedroom', 'bedroom', 'living', 'living']
  ],
  [
    ['bathroom', 'bathroom', 'guest', 'guest'],
    ['bathroom', 'bathroom', 'guest', 'living'],
    ['bedroom', 'living', 'living', 'living'],
    ['bedroom', 'bedroom', 'living', 'living']
  ],
  [
    ['archive', 'archive', 'guest', 'guest'],
    ['bathroom', 'archive', 'guest', 'guest'],
    ['bathroom', 'bedroom', 'bedroom', 'living'],
    ['bedroom', 'bedroom', 'living', 'living']
  ]
];

const ROOM_NAMES = {
  bathroom: 'BATHROOM',
  archive: 'ARCHIVE',
  bedroom: 'MAIN BEDROOM',
  living: 'LIVING ROOM',
  guest: 'GUEST ROOM'
};

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function positionKey(position) {
  return `${position.row},${position.col}`;
}

function isValidPosition(position) {
  return Number.isInteger(position.row) &&
    Number.isInteger(position.col) &&
    position.row >= 0 &&
    position.row < SIZE &&
    position.col >= 0 &&
    position.col < SIZE;
}

function hasUniqueRowsAndColumns(positions) {
  if (positions.length !== PERSON_COUNT) return false;

  const rows = new Set();
  const columns = new Set();

  for (const position of positions) {
    if (!isValidPosition(position)) return false;

    if (rows.has(position.row)) return false;
    if (columns.has(position.col)) return false;

    rows.add(position.row);
    columns.add(position.col);
  }

  return true;
}

function countSolutions(fixedPositions, limit = 2) {
  const fixed = new Map(
    fixedPositions.map(item => [item.personId, item])
  );

  const solutions = [];
  const usedRows = new Set();
  const usedColumns = new Set();
  const current = [];

  function search(personIndex) {
    if (solutions.length >= limit) return;

    if (personIndex === PERSON_COUNT) {
      solutions.push(current.map(item => ({ ...item })));
      return;
    }

    const person = PEOPLE[personIndex];
    const fixedPosition = fixed.get(person.id);

    const candidates = fixedPosition
      ? [fixedPosition]
      : Array.from({ length: SIZE * SIZE }, (_, index) => ({
          row: Math.floor(index / SIZE),
          col: index % SIZE
        }));

    for (const position of candidates) {
      if (!isValidPosition(position)) continue;
      if (usedRows.has(position.row)) continue;
      if (usedColumns.has(position.col)) continue;

      usedRows.add(position.row);
      usedColumns.add(position.col);

      current.push({
        personId: person.id,
        row: position.row,
        col: position.col
      });

      search(personIndex + 1);

      current.pop();
      usedRows.delete(position.row);
      usedColumns.delete(position.col);

      if (solutions.length >= limit) return;
    }
  }

  search(0);
  return solutions;
}

function getRoomAt(layout, row, col) {
  return layout[row][col];
}

function getPersonRoom(layout, position) {
  return getRoomAt(layout, position.row, position.col);
}

function makeClues(solution, layout) {
  const clues = [];

  // Wskazówki o konkretnych pozycjach postaci.
  const ordered = shuffle(solution);

  for (let i = 0; i < 2; i++) {
    const item = ordered[i];
    const person = PEOPLE.find(p => p.id === item.personId);

    clues.push({
      id: `position_${i}`,
      type: 'position',
      personId: item.personId,
      row: item.row,
      col: item.col,
      text: `${person.name} was seen in row ${item.row + 1}.`
    });
  }

  // Wskazówka o pokoju, która nie zdradza bezpośrednio złodzieja.
  const roomClue = solution[randomInt(solution.length)];
  const room = getPersonRoom(layout, roomClue);

  clues.push({
    id: 'room',
    type: 'room',
    roomId: room,
    text: `Someone was seen in the ${ROOM_NAMES[room]}.`
  });

  return clues;
}

function cluesMatch(solution, clues, layout) {
  for (const clue of clues) {
    const person = solution.find(p => p.personId === clue.personId);

    if (clue.type === 'position') {
      if (!person || person.row !== clue.row) return false;
    }

    if (clue.type === 'room') {
      const found = solution.some(
        p => getPersonRoom(layout, p) === clue.roomId
      );

      if (!found) return false;
    }
  }

  return true;
}

function makeUniqueClues(solution, layout) {
  const candidates = [];

  for (const position of solution) {
    candidates.push({
      id: `row_${position.personId}`,
      type: 'position',
      personId: position.personId,
      row: position.row,
      col: position.col,
      text: `${PEOPLE.find(p => p.id === position.personId).name} was seen in row ${position.row + 1}.`
    });
  }

  // Wskazówki muszą prowadzić do jednego rozmieszczenia.
  const selected = [];

  for (const clue of shuffle(candidates)) {
    selected.push(clue);

    const fixed = selected.map(item => ({
      personId: item.personId,
      row: item.row,
      col: item.col
    }));

    if (countSolutions(fixed, 2).length === 1) {
      return selected;
    }
  }

  return selected;
}

export class ThiefdokuPuzzle {
  constructor(options = {}) {
    this.options = options;
    this.reset();
  }

  reset() {
    const layout = ROOM_LAYOUTS[randomInt(ROOM_LAYOUTS.length)];

    // Losowe rozwiązanie: jedna osoba w każdym wierszu i kolumnie.
    const columns = shuffle([0, 1, 2, 3]);

    const solution = shuffle(PEOPLE).map((person, row) => ({
      personId: person.id,
      row,
      col: columns[row]
    }));

    this.layout = layout;
    this.solution = solution;
    this.board = Array.from({ length: SIZE }, () =>
      Array(SIZE).fill(null)
    );

    this.selectedPersonId = PEOPLE[0].id;
    this.attempts = 0;
    this.maxAttempts = 3;
    this.completed = false;

    this.artifactRoom = getPersonRoom(
      layout,
      solution[randomInt(solution.length)]
    );

    this.clues = makeUniqueClues(solution, layout);
    this.placeFixedClues();

    return this.getState();
  }

  placeFixedClues() {
    for (const clue of this.clues) {
      if (clue.type !== 'position') continue;

      this.board[clue.row][clue.col] = clue.personId;
    }
  }

  selectPerson(personId) {
    if (this.completed) return false;
    if (!PEOPLE.some(person => person.id === personId)) return false;

    this.selectedPersonId = personId;
    return true;
  }

  placePerson(row, col) {
    if (this.completed) return false;
    if (!isValidPosition({ row, col })) return false;

    const personId = this.selectedPersonId;

    // Nie pozwalamy przesuwać wskazówek startowych.
    if (this.isFixedCell(row, col)) return false;

    // Jedna postać może wystąpić tylko raz.
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.board[r][c] === personId) {
          if (this.isFixedCell(r, c)) return false;
          this.board[r][c] = null;
        }
      }
    }

    this.board[row][col] = personId;
    return true;
  }

  removePerson(row, col) {
    if (this.completed || !isValidPosition({ row, col })) return false;
    if (this.isFixedCell(row, col)) return false;

    this.board[row][col] = null;
    return true;
  }

  isFixedCell(row, col) {
    return this.clues.some(
      clue => clue.type === 'position' &&
        clue.row === row &&
        clue.col === col
    );
  }

  getPlacedPeople() {
    const result = [];

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const personId = this.board[row][col];

        if (personId) {
          result.push({ personId, row, col });
        }
      }
    }

    return result;
  }

  validateBoard() {
    const positions = this.getPlacedPeople();

    if (positions.length !== PERSON_COUNT) {
      return {
        valid: false,
        reason: 'Place all four people on the board.'
      };
    }

    if (!hasUniqueRowsAndColumns(positions)) {
      return {
        valid: false,
        reason: 'Only one person is allowed in each row and column.'
      };
    }

    return { valid: true };
  }

  submitGuess() {
    if (this.completed) {
      return { status: 'completed' };
    }

    const validation = this.validateBoard();

    if (!validation.valid) {
      return {
        status: 'invalid',
        message: validation.reason
      };
    }

    this.attempts++;

    const thief = this.getPlacedPeople().find(position =>
      getPersonRoom(this.layout, position) === this.artifactRoom
    );

    if (!thief) {
      return {
        status: 'wrong',
        message: 'Nobody is in the artifact room.',
        attemptsLeft: this.maxAttempts - this.attempts
      };
    }

    const actualThief = this.solution.find(position =>
      position.personId === thief.personId
    );

    if (actualThief) {
      this.completed = true;

      return {
        status: 'success',
        thiefId: thief.personId,
        roomId: this.artifactRoom
      };
    }

    return {
      status: 'wrong',
      message: 'That is not the thief.',
      attemptsLeft: this.maxAttempts - this.attempts
    };
  }

  getPersonName(personId) {
    return PEOPLE.find(person => person.id === personId)?.name || 'Unknown';
  }

  getState() {
    return {
      size: SIZE,
      people: PEOPLE.map(person => ({ ...person })),
      board: this.board.map(row => [...row]),
      layout: this.layout.map(row => [...row]),
      roomNames: { ...ROOM_NAMES },
      clues: this.clues.map(clue => ({ ...clue })),
      selectedPersonId: this.selectedPersonId,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      completed: this.completed
    };
  }
}

export { PEOPLE, ROOM_NAMES, SIZE };
