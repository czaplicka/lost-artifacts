export function buildCrimeBoardItems(boardData) {
  if (!boardData || typeof boardData !== 'object') {
    throw new Error('buildCrimeBoardItems: boardData is required');
  }

  const mission = asObject(boardData.mission);
  const who = uniqueById(asArray(boardData.who), 'id');
  const means = uniqueById(asArray(boardData.means), 'id');
  const playerNotes = asArray(boardData.playerNotes);

  const items = [];
  const links = [];

  const caseId = asText(boardData.caseId, 'case');
  const missionItemId = `mission-${safeId(caseId)}`;

  items.push(buildMissionItem(missionItemId, mission));

  const suspectColumnX = 80;
  const suspectStartY = 140;
  const suspectGapY = 190;

  who.forEach((suspect, index) => {
    items.push(buildSuspectItem({
      suspect,
      x: suspectColumnX,
      y: suspectStartY + (index * suspectGapY),
      rotation: getRotation(index)
    }));
  });

  const meansColumnX = 560;
  const meansStartY = 120;
  const meansGapY = 210;

  means.forEach((clue, index) => {
    items.push(buildMeansItem({
      clue,
      x: meansColumnX + ((index % 2) * 250),
      y: meansStartY + (Math.floor(index / 2) * meansGapY),
      rotation: getRotation(index + 3)
    }));

    const affinity = asArray(clue.suspectAffinity)
      .map(id => safeId(id))
      .filter(Boolean);

    affinity.forEach((suspectId, affinityIndex) => {
      links.push({
        id: `link-${safeId(clue.id)}-${suspectId}`,
        from: `clue-${safeId(clue.id)}`,
        to: `suspect-${suspectId}`,
        fromAnchor: affinityIndex % 2 === 0 ? 'left' : 'top',
        toAnchor: 'right',
        color: clue.isRedHerring ? '#7a7a7a' : '#b3131b',
        createdByPlayer: false,
        editableByPlayer: false
      });
    });
  });

  playerNotes.forEach((note, index) => {
    items.push(buildPlayerNoteItem({
      note,
      x: isFiniteNumber(note.x) ? note.x : (1060 + ((index % 2) * 220)),
      y: isFiniteNumber(note.y) ? note.y : (120 + (Math.floor(index / 2) * 180)),
      rotation: isFiniteNumber(note.rotation) ? note.rotation : getRotation(index + 7)
    }));
  });

  const validIds = new Set(items.map(item => item.id));
  const validLinks = links.filter(link =>
    validIds.has(link.from) &&
    validIds.has(link.to) &&
    link.from !== link.to
  );

  return {
    meta: {
      boardId: `board-${safeId(caseId)}`,
      title: asText(mission.artifact || mission.title, 'Crime Board'),
      caseId,
      version: 2
    },
    items,
    links: validLinks
  };
}

function buildMissionItem(id, mission) {
  const city = asText(mission.city, 'Unknown city');
  const country = asText(mission.country, 'Unknown country');
  const clue = asText(mission.clue);
  const description = asText(mission.description);

  return {
    id,
    type: 'note',
    x: 380,
    y: 24,
    z: 2,
    rotation: -0.6,
    pinned: true,
    label: asText(mission.artifact || mission.title, 'Unknown Artifact'),
    text: [
      `${city}, ${country}`,
      clue,
      description
    ].filter(Boolean).join('\n\n'),
    metaText: 'Mission',
    color: 'yellow',
    tags: ['mission', 'stolen-item'],
    discovered: true,
    createdByPlayer: false,
    editableByPlayer: false
  };
}

function buildSuspectItem({ suspect, x, y, rotation }) {
  const suspectId = safeId(suspect.id || suspect.name || crypto.randomUUID());

  return {
    id: `suspect-${suspectId}`,
    type: 'photo',
    x,
    y,
    z: 3,
    rotation,
    pinned: false,
    label: asText(suspect.name, 'Unknown suspect'),
    image: getSuspectImage(suspect),
    caption: buildSuspectCaption(suspect),
    meta: [
      asText(suspect.accent),
      ...asArray(suspect.skills).slice(0, 2).map(skill => asText(skill)).filter(Boolean)
    ].filter(Boolean),
    suspectId,
    tags: ['suspect', asText(suspect.genderCode), asText(suspect.race)].filter(Boolean),
    discovered: suspect.discovered !== false,
    createdByPlayer: false,
    editableByPlayer: false
  };
}

function buildMeansItem({ clue, x, y, rotation }) {
  const clueId = safeId(clue.id || clue.item || crypto.randomUUID());
  const isRedHerring = Boolean(clue.isRedHerring);
  const affinity = asArray(clue.suspectAffinity)
    .map(id => asText(id))
    .filter(Boolean);

  return {
    id: `clue-${clueId}`,
    type: 'evidence',
    x,
    y,
    z: 2,
    rotation,
    pinned: false,
    label: asText(clue.item, 'Unknown evidence'),
    tag: isRedHerring ? 'Red herring' : 'Means',
    body: asText(clue.heistExplanation || clue.trueExplanation),
    fields: [
      { key: 'Scene', value: asText(clue.scene, 'Unknown') },
      { key: 'Type', value: isRedHerring ? 'Red herring' : 'Relevant clue' },
      { key: 'Affinity', value: formatAffinity(affinity) }
    ],
    clueId,
    heistExplanation: asText(clue.heistExplanation),
    trueExplanation: asText(clue.trueExplanation),
    isRedHerring,
    tags: Array.isArray(clue.tags) ? clue.tags.filter(Boolean) : ['means'],
    discovered: clue.discovered !== false,
    createdByPlayer: false,
    editableByPlayer: false
  };
}

function buildPlayerNoteItem({ note, x, y, rotation }) {
  return {
    id: note.id || `player-note-${crypto.randomUUID()}`,
    type: 'note',
    x,
    y,
    z: 4,
    rotation,
    pinned: Boolean(note.pinned),
    label: asText(note.label, 'Player note'),
    text: asText(note.text),
    metaText: asText(note.metaText, 'Detective note'),
    color: normalizeNoteColor(note.color),
    tags: Array.isArray(note.tags) ? note.tags.filter(Boolean) : ['player-note'],
    discovered: true,
    createdByPlayer: true,
    editableByPlayer: true
  };
}

function buildSuspectCaption(suspect) {
  const parts = [
    asText(suspect.features),
    suspect.eyes ? `${suspect.eyes} eyes` : '',
    suspect.hair ? `${suspect.hair} hair` : ''
  ].filter(Boolean);

  return parts.join(' • ');
}

function formatAffinity(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 'None';
  return ids.join(', ');
}

function getSuspectImage(suspect) {
  if (asText(suspect.image)) return suspect.image;
  if (asText(suspect.portraitUrl)) return suspect.portraitUrl;
  return '/assets/ui/placeholder-suspect.png';
}

function getRotation(index) {
  const preset = [-2.4, 1.8, -1.2, 2.1, -0.8, 1.1, -1.7, 2.6];
  return preset[index % preset.length];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function asText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function safeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function normalizeNoteColor(value) {
  return ['yellow', 'blue', 'pink'].includes(value) ? value : 'yellow';
}

function uniqueById(items, key) {
  const seen = new Set();
  return items.filter(item => {
    const raw = item?.[key];
    const normalized = safeId(raw);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}