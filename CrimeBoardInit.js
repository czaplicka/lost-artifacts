import { CrimeBoard } from './CrimeBoard.js';

const UNKNOWN_SUSPECT_IMAGE = 'assets/suspects/unknown.jpg';
const DEFAULT_OBJECTS_URL = '/assets/data/objects.json';

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getRotation(index) {
  const preset = [-2.4, 1.8, -1.2, 2.1, -0.8, 1.1, -1.7, 2.6];
  return preset[index % preset.length];
}

function cloneData(data) {
  return typeof structuredClone === 'function'
    ? structuredClone(data)
    : JSON.parse(JSON.stringify(data));
}

function buildMissionItem(mission) {
  return {
    id: `mission-${mission.artifactKey || slugify(mission.artifact || 'case')}`,
    type: 'note',
    x: 380,
    y: 24,
    z: 2,
    rotation: -0.6,
    pinned: true,
    label: mission.artifact || 'Unknown Artifact',
    text: [
      `${mission.city || 'Unknown city'}, ${mission.country || 'Unknown country'}`,
      '',
      mission.clue || '',
      '',
      mission.description || ''
    ].filter(Boolean).join('\n'),
    metaText: 'Stolen artifact',
    color: 'yellow',
    tags: ['mission', 'artifact'],
    createdByPlayer: false,
    editableByPlayer: false
  };
}

function buildUnknownSuspectItem(currentThiefId = null) {
  return {
    id: `suspect-${currentThiefId || 'unknown'}`,
    type: 'photo',
    x: 80,
    y: 140,
    z: 3,
    rotation: -1.8,
    pinned: false,
    label: 'Unknown suspect',
    image: UNKNOWN_SUSPECT_IMAGE,
    caption: 'Identity not confirmed yet.',
    meta: ['Suspect', 'Unknown'],
    suspectId: currentThiefId || null,
    tags: ['suspect', 'unknown'],
    createdByPlayer: false,
    editableByPlayer: false
  };
}

function buildPlayerNotesItem(playerNotes) {
  if (!playerNotes || typeof playerNotes !== 'string' || !playerNotes.trim()) {
    return null;
  }

  return {
    id: 'player-note-main',
    type: 'note',
    x: 1020,
    y: 520,
    z: 4,
    rotation: 1.4,
    pinned: false,
    label: 'Detective notes',
    text: playerNotes.trim(),
    metaText: 'Notebook',
    color: 'blue',
    tags: ['player-note'],
    createdByPlayer: false,
    editableByPlayer: false
  };
}

function normalizeCollectedClues(clues) {
  if (!Array.isArray(clues)) return [];
  return clues.filter(clue => clue && typeof clue === 'object');
}

function buildEvidenceItemsFromClues(clues, objectsData = []) {
  const objectMap = new Map(
    (Array.isArray(objectsData) ? objectsData : [])
      .filter(obj => obj && obj.id)
      .map(obj => [obj.id, obj])
  );

  return clues.map((clue, index) => {
    const objectMatch = objectMap.get(clue.objectId) || objectMap.get(clue.id) || null;

    const title = clue.label || clue.title || objectMatch?.item || `Clue ${index + 1}`;
    const body = clue.text || clue.description || clue.content || objectMatch?.heistExplanation || objectMatch?.trueExplanation || 'Collected during investigation.';
    const fields = [];

    if (clue.type) fields.push({ key: 'Type', value: clue.type });
    if (clue.cityId) fields.push({ key: 'City', value: clue.cityId });
    if (objectMatch?.scene) fields.push({ key: 'Scene', value: objectMatch.scene });
    if (objectMatch?.isRedHerring) fields.push({ key: 'Status', value: 'Red herring' });

    return {
      id: `evidence-${clue.id || objectMatch?.id || index}`,
      type: 'evidence',
      x: 520 + ((index % 2) * 250),
      y: 140 + (Math.floor(index / 2) * 210),
      z: 2,
      rotation: getRotation(index + 3),
      pinned: false,
      label: title,
      tag: clue.type || 'Evidence',
      body,
      fields,
      clueId: clue.id || null,
      isRedHerring: Boolean(objectMatch?.isRedHerring),
      heistExplanation: objectMatch?.heistExplanation || '',
      trueExplanation: objectMatch?.trueExplanation || '',
      tags: ['discovered-clue'],
      createdByPlayer: false,
      editableByPlayer: false
    };
  });
}

function buildLinks(items) {
  const missionItem = items.find(item => item.id.startsWith('mission-'));
  const suspectItem = items.find(item => item.tags?.includes('unknown'));
  const evidenceItems = items.filter(item => item.type === 'evidence');

  const links = [];

  if (missionItem && suspectItem) {
    links.push({
      id: 'link-mission-suspect',
      from: missionItem.id,
      to: suspectItem.id,
      fromAnchor: 'left',
      toAnchor: 'right',
      color: '#b3131b'
    });
  }

  evidenceItems.forEach((item, index) => {
    if (!suspectItem) return;
    links.push({
      id: `link-suspect-evidence-${index}`,
      from: suspectItem.id,
      to: item.id,
      fromAnchor: index % 2 === 0 ? 'right' : 'bottom',
      toAnchor: 'left',
      color: '#b3131b'
    });
  });

  return links;
}

function buildBoardLayout(gameState, objectsData = []) {
  if (!gameState?.currentMission) {
    throw new Error('Cannot build crime board without currentMission in gameState.');
  }

  const mission = gameState.currentMission;
  const items = [];

  items.push(buildMissionItem(mission));
  items.push(buildUnknownSuspectItem(gameState.currentThief?.id || gameState.currentThiefId || null));

  const collectedClues = normalizeCollectedClues(gameState.cluesCollected);
  const evidenceItems = buildEvidenceItemsFromClues(collectedClues, objectsData);
  evidenceItems.forEach(item => items.push(item));

  const playerNotesItem = buildPlayerNotesItem(gameState.playerNotes);
  if (playerNotesItem) items.push(playerNotesItem);

  return {
    meta: {
      boardId: `board-${mission.artifactKey || slugify(mission.artifact || 'case')}`,
      title: mission.artifact || 'Crime Board',
      caseId: mission.artifactKey || '',
      version: 1,
      thiefId: gameState.currentThief?.id || gameState.currentThiefId || null,
      crimeCity: mission.city || gameState.crimeCity || ''
    },
    items,
    links: buildLinks(items)
  };
}

async function getObjectsData(objectsUrl = DEFAULT_OBJECTS_URL) {
  try {
    const loaded = await loadJson(objectsUrl);
    return Array.isArray(loaded) ? loaded : [];
  } catch (error) {
    console.warn('Crime board: objects.json unavailable, continuing without object metadata.', error);
    return [];
  }
}

function mergePlayerItems(baseLayout, savedData) {
  if (!savedData || !Array.isArray(savedData.items)) {
    return baseLayout;
  }

  const baseIds = new Set(baseLayout.items.map(item => item.id));
  const playerItems = savedData.items.filter(item => item?.createdByPlayer && !baseIds.has(item.id));
  const mergedItems = [...baseLayout.items, ...cloneData(playerItems)];
  const validIds = new Set(mergedItems.map(item => item.id));
  const savedLinks = Array.isArray(savedData.links) ? savedData.links : [];
  const playerLinks = savedLinks.filter(link => validIds.has(link?.from) && validIds.has(link?.to));

  return {
    meta: cloneData(baseLayout.meta),
    items: mergedItems,
    links: [...baseLayout.links, ...cloneData(playerLinks)]
  };
}

function ensureBoardApi(boardInstance, localState, objectsData) {
  return {
    board: boardInstance,
    getData() {
      return boardInstance.getBoardData();
    },
    refresh(nextState = localState) {
      const currentData = boardInstance.getBoardData();
      const baseLayout = buildBoardLayout(nextState, objectsData);
      const mergedLayout = mergePlayerItems(baseLayout, currentData);
      boardInstance.loadBoard(mergedLayout);
      localState = nextState;
      return mergedLayout;
    },
    destroy() {
      localState = null;
    }
  };
}

export async function initCrimeBoard({
  root,
  gameState,
  data = null,
  objectsUrl = DEFAULT_OBJECTS_URL
} = {}) {
  if (!root) {
    throw new Error('CrimeBoardInit: root is required.');
  }

  const boardRoot = root.querySelector('#crime-board');
  if (!boardRoot) {
    throw new Error('CrimeBoardInit: #crime-board not found inside provided root.');
  }

  const state = gameState || {};
  if (!data && !state.currentMission) {
    throw new Error('CrimeBoardInit: gameState.currentMission is missing and no board data was provided.');
  }

  const objectsData = await getObjectsData(objectsUrl);
  const board = new CrimeBoard(boardRoot);

  let initialData;
  if (state.currentMission) {
    const baseLayout = buildBoardLayout(state, objectsData);
    initialData = mergePlayerItems(baseLayout, data);
  } else {
    initialData = cloneData(data);
  }

  board.loadBoard(initialData);
  return ensureBoardApi(board, state, objectsData);
}

export { buildBoardLayout };