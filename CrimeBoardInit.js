import { CrimeBoard } from './CrimeBoard.js';

const UNKNOWN_SUSPECT_IMAGE = 'assets/suspects/unknown.jpg';
const DEFAULT_ARTIFACT_IMAGE = 'assets/artifacts/artifact_unknown.png';
const DEFAULT_OBJECTS_URL = '/assets/data/objects.json';

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(
      `Failed to load ${url}: ${response.status} ${response.statusText}`
    );
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

function normalizeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSkill(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const aliases = {
    pickpocketing: 'pickpocket',
    'pick pocketing': 'pickpocket',
    pickpocket: 'pickpocket'
  };

  return aliases[key] || key;
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function asText(value, fallback = '') {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback;
}

function resolveArtifactImage(mission = {}) {
  if (mission.image) return mission.image;
  if (mission.artifactImage) return mission.artifactImage;
  if (mission.artifactPhoto) return mission.artifactPhoto;
  if (mission.photo) return mission.photo;

  if (mission.artifactKey) {
    const normalizedKey = mission.artifactKey.replace(/^artifact_/, '');
    return `assets/artifacts/${normalizedKey}.png`;
  }

  return DEFAULT_ARTIFACT_IMAGE;
}

function buildMissionArtifactItem(mission = {}) {
  const artifactId =
    mission.artifactKey ||
    slugify(mission.artifact || 'case');

  return {
    id: `mission-${artifactId}`,
    type: 'photo',
    x: 380,
    y: 24,
    z: 2,
    rotation: -0.6,
    pinned: true,
    label: mission.artifact || 'Unknown Artifact',
    image: resolveArtifactImage(mission),
    caption: [
      mission.clue || '',
      mission.description || ''
    ].filter(Boolean).join(' — ') || 'Stolen artifact',
    meta: [
      mission.city || 'Unknown city',
      mission.country || 'Unknown country'
    ].filter(Boolean),
    tags: ['mission', 'artifact'],
    clueId: mission.artifactKey || null,
    discovered: true,
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
    discovered: true,
    createdByPlayer: false,
    editableByPlayer: false
  };
}

function buildPlayerNotesItem(playerNotes) {
  if (typeof playerNotes !== 'string' || !playerNotes.trim()) {
    return null;
  }

  return {
    id: 'player-note-main',
    type: 'note',
    x: 1020,
    y: 675,
    z: 4,
    rotation: 1.4,
    pinned: false,
    label: 'Detective notes',
    text: playerNotes.trim(),
    metaText: 'Notebook',
    color: 'blue',
    tags: ['player-note'],
    discovered: true,
    createdByPlayer: false,
    editableByPlayer: false
  };
}

function getHypothesisResult(gameState = {}) {
  const candidates = [
    gameState.hypothesisEvidenceResult,
    asObject(gameState.crimeBoardData).hypothesisEvidenceResult,
    gameState.hypothesisEvidence
  ];

  return candidates
    .map(asObject)
    .find(result => Object.keys(result).length > 0) || {};
}

function isHypothesisCompleted(result = {}) {
  return (
    result.completed === true ||
    result.success === true ||
    ['completed', 'success', 'solved', 'confirmed'].includes(
      result.status
    )
  );
}

function hasFinalizedHypothesis(gameState = {}) {
  const reconstruction = asObject(gameState.reconstructedHeist);

  if (
    ['exact', 'partial', 'weak'].includes(
      reconstruction.playerTheoryResult
    )
  ) {
    return true;
  }

  return isHypothesisCompleted(getHypothesisResult(gameState));
}

function getHypothesisSkillEntries(gameState = {}) {
  if (!hasFinalizedHypothesis(gameState)) {
    return [];
  }

  const reconstruction = asObject(gameState.reconstructedHeist);
  const claims = asArray(reconstruction.claims);
  const cards = asArray(reconstruction.playerOrderedCards);
  const feedback = asArray(reconstruction.playerSlotFeedback);

  const entries = new Map();

  cards.slice(0, 3).forEach((card, playerSlotIndex) => {
    if (!card || typeof card !== 'object') {
      return;
    }

    const color = asText(feedback[playerSlotIndex]).toLowerCase();

    if (color !== 'green' && color !== 'yellow') {
      return;
    }

    // Dopasowujemy po ID przedmiotu, nie po miejscu,
    // w którym gracz umieścił kartę.
    const claim = claims.find(candidate =>
      candidate &&
      String(candidate.solutionItemId || '').trim() ===
        String(card.id || '').trim()
    );

    const skill = asText(claim?.thiefSkill);

    if (!claim || !skill) {
      console.warn(
        '[CrimeBoardInit] Cannot resolve a single thief skill for accepted card.',
        {
          cardId: card.id,
          playerSlotIndex,
          feedback: color,
          claim
        }
      );
      return;
    }

    const key = normalizeSkill(skill);
    const existing = entries.get(key);

    // Jeden skill daje jedną karteczkę.
    // Potwierdzony wpis ma pierwszeństwo przed niepewnym.
    if (
      !existing ||
      (existing.feedback === 'yellow' && color === 'green')
    ) {
      entries.set(key, {
        skill,
        feedback: color,
        claimIndex: claims.indexOf(claim)
      });
    }
  });

  return [...entries.values()].sort(
    (a, b) => a.claimIndex - b.claimIndex
  );
}

function buildHypothesisSkillItems(gameState = {}) {
  return getHypothesisSkillEntries(gameState).map((entry, index) => {
    const confirmed = entry.feedback === 'green';

    return {
      id: `hypothesis-skill-${slugify(entry.skill)}`,
      type: 'note',
      x: 520 + ((index % 2) * 250),
      y: 140 + (Math.floor(index / 2) * 190),
      z: 4,
      rotation: getRotation(index + 3),
      pinned: true,
      label: confirmed
        ? entry.skill
        : `${entry.skill} ?`,
      text: confirmed
        ? 'Skill identified from a correctly placed clue.'
        : 'Possible skill: the clue was relevant, but its place in the sequence was wrong.',
      metaText: confirmed
        ? 'Reconstruction: correct answer'
        : 'Reconstruction: uncertain placement',
      color: confirmed ? 'blue' : 'yellow',
      clueId: `hypothesis-skill-${slugify(entry.skill)}`,
      tags: [
        'hypothesis',
        'hypothesis-skill',
        confirmed ? 'skill-confirmed' : 'skill-uncertain',
        `feedback-${entry.feedback}`
      ],
      discovered: true,
      createdByPlayer: false,
      editableByPlayer: false
    };
  });
}

function buildCrimeScenePhotoItems(gameState) {
  const visitedScenes =
    gameState?.crimeBoardData?.visitedCrimeScenes;

  return asArray(visitedScenes).map((scene, index) => {
    const success = scene.success !== false;

    return {
      id: `scene-photo-${scene.sceneId || index}`,
      type: 'photo',
      x: 80 + ((index % 4) * 150),
      y: 320 + (Math.floor(index / 4) * 130),
      z: 1,
      rotation: getRotation(index),
      pinned: false,
      label: scene.displayName || scene.sceneId || 'Crime scene',
      image: scene.imagePath,
      caption: success
        ? 'Scene processed.'
        : 'Investigation incomplete.',
      meta: [
        scene.cityId || '',
        success ? 'Processed' : 'Incomplete'
      ].filter(Boolean),
      sceneId: scene.sceneId || null,
      missionId: scene.missionId || null,
      tags: [
        'scene-photo',
        success ? 'scene-success' : 'scene-failed'
      ],
      discovered: true,
      createdByPlayer: false,
      editableByPlayer: false
    };
  });
}

function normalizeCollectedClues(clues, objectMap) {
  return asArray(clues).filter(clue => {
    if (!clue || typeof clue !== 'object') {
      return false;
    }

    if (clue.category === 'skills') {
      return false;
    }

    return (
      objectMap.has(clue.objectId) ||
      objectMap.has(clue.id)
    );
  });
}

function buildEvidenceItemsFromFoundObjects(gameState) {
  if (hasFinalizedHypothesis(gameState)) {
    return [];
  }

  const foundObjects = asArray(
    gameState?.crimeBoardData?.sceneFoundObjects
  ).filter(obj => obj && typeof obj === 'object');

  return foundObjects.map((obj, index) => {
    const fields = [];

    if (obj.sceneId) {
      fields.push({ key: 'Scene', value: obj.sceneId });
    }

    if (obj.cityId) {
      fields.push({ key: 'City', value: obj.cityId });
    }

    return {
      id: `found-object-${obj.id || index}`,
      type: 'evidence',
      x: 520 + ((index % 2) * 250),
      y: 140 + (Math.floor(index / 2) * 210),
      z: 2,
      rotation: getRotation(index + 3),
      pinned: false,
      label: obj.item || `Object ${index + 1}`,
      tag: 'Found at scene',
      body: obj.description ||
        obj.heistExplanation ||
        'Recovered during the forensic sweep.',
      fields,
      clueId: obj.id || null,
      isRedHerring: Boolean(obj.isRedHerring),
      heistExplanation: obj.heistExplanation || '',
      trueExplanation: obj.trueExplanation || '',
      tags: ['found-object', 'scene-evidence'],
      discovered: true,
      createdByPlayer: false,
      editableByPlayer: false
    };
  });
}

function buildEvidenceItemsFromClues(clues, objectsData = []) {
  const objectMap = new Map(
    asArray(objectsData)
      .filter(obj => obj && obj.id)
      .map(obj => [obj.id, obj])
  );

  return clues.map((clue, index) => {
    const objectMatch =
      objectMap.get(clue.objectId) ||
      objectMap.get(clue.id) ||
      null;

    const fields = [];

    if (clue.type) {
      fields.push({ key: 'Type', value: clue.type });
    }

    if (clue.cityId) {
      fields.push({ key: 'City', value: clue.cityId });
    }

    if (objectMatch?.scene) {
      fields.push({ key: 'Scene', value: objectMatch.scene });
    }

    if (objectMatch?.isRedHerring) {
      fields.push({ key: 'Status', value: 'Red herring' });
    }

    return {
      id: `evidence-${clue.id || objectMatch?.id || index}`,
      type: 'evidence',
      x: 520 + ((index % 2) * 250),
      y: 140 + (Math.floor(index / 2) * 210),
      z: 2,
      rotation: getRotation(index + 3),
      pinned: false,
      label: clue.label ||
        clue.title ||
        objectMatch?.item ||
        `Clue ${index + 1}`,
      tag: clue.type || 'Evidence',
      body: clue.text ||
        clue.description ||
        clue.content ||
        objectMatch?.heistExplanation ||
        objectMatch?.trueExplanation ||
        'Collected during investigation.',
      fields,
      clueId: clue.id || null,
      isRedHerring: Boolean(objectMatch?.isRedHerring),
      heistExplanation: objectMatch?.heistExplanation || '',
      trueExplanation: objectMatch?.trueExplanation || '',
      tags: ['discovered-clue'],
      discovered: true,
      createdByPlayer: false,
      editableByPlayer: false
    };
  });
}

function getLabResults(gameState = {}) {
  const crimeBoardData = asObject(gameState.crimeBoardData);
  const crimeLab = asObject(gameState.crimeLab);

  const candidates = [
    gameState.labResults,
    gameState.crimeLabResults,
    gameState.labEvidenceResults,
    crimeBoardData.labResults,
    crimeBoardData.crimeLabResults,
    crimeBoardData.labEvidenceResults,
    crimeLab.results,
    crimeLab.labResults,
    crimeLab.evidenceResults
  ];

  const rawResults =
    candidates.find(candidate => Array.isArray(candidate)) || [];

  const seen = new Set();

  return rawResults.filter(result => {
    if (!result || typeof result !== 'object') {
      return false;
    }

    const completed =
      result.completed === true ||
      result.success === true ||
      result.unlocked === true ||
      ['completed', 'success', 'solved', 'confirmed'].includes(
        result.status
      );

    if (!completed) {
      return false;
    }

    const resultId = normalizeId(
      result.id ||
      result.key ||
      result.type ||
      result.title ||
      result.label
    );

    if (!resultId || seen.has(resultId)) {
      return false;
    }

    seen.add(resultId);
    return true;
  });
}

function buildLabResultItems(gameState) {
  return getLabResults(gameState).map((result, index) => {
    const resultId = normalizeId(
      result.id ||
      result.key ||
      result.type ||
      result.title ||
      result.label ||
      `result-${index + 1}`
    );

    const value = asText(
      result.value ||
      result.result ||
      result.answer ||
      result.conclusion ||
      result.summary,
      'Analysis complete'
    );

    return {
      id: `lab-result-${resultId}`,
      type: 'evidence',
      x: 1060 + ((index % 2) * 220),
      y: 300 + (Math.floor(index / 2) * 185),
      z: 4,
      rotation: getRotation(index + 12),
      pinned: true,
      label: asText(
        result.title ||
        result.label ||
        result.name ||
        result.type,
        'LAB REPORT'
      ),
      tag: 'Lab result',
      body: asText(
        result.description ||
        result.details ||
        result.text ||
        result.body,
        value
      ),
      fields: [
        { key: 'Result', value },
        {
          key: 'Source',
          value: asText(
            result.source ||
            result.minigame ||
            result.labGame,
            'Crime Lab'
          )
        },
        { key: 'Status', value: 'Verified' }
      ],
      clueId: resultId,
      tags: [
        'lab-result',
        'forensics',
        normalizeId(result.type)
      ].filter(Boolean),
      discovered: true,
      createdByPlayer: false,
      editableByPlayer: false
    };
  });
}

function buildLinks(items) {
  const missionItem = items.find(
    item => item.id.startsWith('mission-')
  );

  const suspectItem = items.find(
    item => item.tags?.includes('unknown')
  );

  const evidenceItems = items.filter(item =>
    item.type === 'evidence' ||
    item.tags?.includes('hypothesis-skill')
  );

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
      id: `link-suspect-${item.id}`,
      from: suspectItem.id,
      to: item.id,
      fromAnchor: index % 2 === 0 ? 'right' : 'bottom',
      toAnchor: 'left',
      color: item.tags?.includes('skill-uncertain')
        ? '#b78a28'
        : '#b3131b'
    });
  });

  return links;
}

function buildBoardLayout(gameState, objectsData = []) {
  if (!gameState?.currentMission) {
    throw new Error(
      'Cannot build crime board without currentMission in gameState.'
    );
  }

  const mission = gameState.currentMission;
  const finalized = hasFinalizedHypothesis(gameState);

  const items = [
    buildMissionArtifactItem(mission),
    buildUnknownSuspectItem(
      gameState.currentThief?.id ||
      gameState.currentThiefId ||
      null
    ),
    ...buildCrimeScenePhotoItems(gameState),
    ...buildEvidenceItemsFromFoundObjects(gameState),
    ...buildHypothesisSkillItems(gameState),
    ...buildLabResultItems(gameState)
  ];

  if (!finalized) {
    const objectMap = new Map(
      asArray(objectsData)
        .filter(obj => obj && obj.id)
        .map(obj => [obj.id, obj])
    );

    const collectedClues = normalizeCollectedClues(
      gameState.cluesCollected,
      objectMap
    );

    items.push(
      ...buildEvidenceItemsFromClues(collectedClues, objectsData)
    );
  }

  const playerNotesItem = buildPlayerNotesItem(gameState.playerNotes);

  if (playerNotesItem) {
    items.push(playerNotesItem);
  }

  return {
    meta: {
      boardId: `board-${
        mission.artifactKey ||
        slugify(mission.artifact || 'case')
      }`,
      title: mission.artifact || 'Crime Board',
      caseId: mission.artifactKey || '',
      version: 5,
      thiefId: gameState.currentThief?.id ||
        gameState.currentThiefId ||
        null,
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
    console.warn(
      'Crime board: objects.json unavailable, continuing without object metadata.',
      error
    );

    return [];
  }
}

function mergePlayerItems(baseLayout, savedData) {
  if (!savedData || !Array.isArray(savedData.items)) {
    return baseLayout;
  }

  const baseIds = new Set(baseLayout.items.map(item => item.id));

  const playerItems = savedData.items.filter(item =>
    item?.createdByPlayer &&
    !baseIds.has(item.id)
  );

  // Systemowe karty, w tym stare karteczki skilli, powstają na nowo.
  const mergedItems = [
    ...baseLayout.items,
    ...cloneData(playerItems)
  ];

  const validIds = new Set(mergedItems.map(item => item.id));
  const links = cloneData(baseLayout.links);

  const seenPairs = new Set(
    links.map(link => [link.from, link.to].sort().join('\u0000'))
  );

  const seenIds = new Set(links.map(link => link.id));

  asArray(savedData.links).forEach(link => {
    if (!link || !(
      link.createdByPlayer ||
      link.editableByPlayer
    )) {
      return;
    }

    if (
      !validIds.has(link.from) ||
      !validIds.has(link.to) ||
      link.from === link.to
    ) {
      return;
    }

    const pair = [link.from, link.to].sort().join('\u0000');

    if (seenPairs.has(pair) || seenIds.has(link.id)) {
      return;
    }

    seenPairs.add(pair);
    seenIds.add(link.id);
    links.push(cloneData(link));
  });

  return {
    meta: cloneData(baseLayout.meta),
    items: mergedItems,
    links
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
    throw new Error(
      'CrimeBoardInit: #crime-board not found inside provided root.'
    );
  }

  const state = gameState || {};

  if (!data && !state.currentMission) {
    throw new Error(
      'CrimeBoardInit: gameState.currentMission is missing and no board data was provided.'
    );
  }

  const objectsData = await getObjectsData(objectsUrl);
  const board = new CrimeBoard(boardRoot);

  const initialData = state.currentMission
    ? mergePlayerItems(buildBoardLayout(state, objectsData), data)
    : cloneData(data);

  board.loadBoard(initialData);

  return ensureBoardApi(board, state, objectsData);
}

export { buildBoardLayout };