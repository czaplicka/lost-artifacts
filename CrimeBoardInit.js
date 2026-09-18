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
  return Array.isArray(value)
    ? value
    : [];
}

function asObject(value) {
  return value && typeof value === 'object'
    ? value
    : {};
}

function asText(value, fallback = '') {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback;
}

function uniqueStrings(values = []) {
  const seen = new Set();

  return asArray(values).reduce((result, value) => {
    const text = asText(String(value || ''));
    const normalized = text.toLowerCase();

    if (!text || seen.has(normalized)) {
      return result;
    }

    seen.add(normalized);
    result.push(text);

    return result;
  }, []);
}

function resolveArtifactImage(mission = {}) {
  if (mission.image) return mission.image;
  if (mission.artifactImage) return mission.artifactImage;
  if (mission.artifactPhoto) return mission.artifactPhoto;
  if (mission.photo) return mission.photo;

  if (mission.artifactKey) {
    const normalizedKey = mission.artifactKey.replace(
      /^artifact_/,
      ''
    );

    return `assets/artifacts/${normalizedKey}.png`;
  }

  return DEFAULT_ARTIFACT_IMAGE;
}

function buildMissionArtifactItem(mission = {}) {
  const artifactId =
    mission.artifactKey ||
    slugify(mission.artifact || 'case');

  const image = resolveArtifactImage(mission);

  const meta = [
    mission.city || 'Unknown city',
    mission.country || 'Unknown country'
  ].filter(Boolean);

  const captionParts = [
    mission.clue || '',
    mission.description || ''
  ].filter(Boolean);

  return {
    id: `mission-${artifactId}`,
    type: 'photo',
    x: 380,
    y: 24,
    z: 2,
    rotation: -0.6,
    pinned: true,
    label: mission.artifact || 'Unknown Artifact',
    image,
    caption: captionParts.join(' — ') || 'Stolen artifact',
    meta,
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
  if (
    !playerNotes ||
    typeof playerNotes !== 'string' ||
    !playerNotes.trim()
  ) {
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
  const directResult = asObject(
    gameState.hypothesisEvidenceResult
  );

  if (Object.keys(directResult).length > 0) {
    return directResult;
  }

  const boardData = asObject(gameState.crimeBoardData);

  const boardResult = asObject(
    boardData.hypothesisEvidenceResult
  );

  if (Object.keys(boardResult).length > 0) {
    return boardResult;
  }

  const legacyEvidence = asObject(
    gameState.hypothesisEvidence
  );

  return legacyEvidence;
}

function isHypothesisCompleted(hypothesisResult = {}) {
  return (
    hypothesisResult.completed === true ||
    hypothesisResult.success === true ||
    hypothesisResult.status === 'completed' ||
    hypothesisResult.status === 'success' ||
    hypothesisResult.status === 'solved' ||
    hypothesisResult.status === 'confirmed'
  );
}

function getConfirmedItemIds(gameState = {}) {
  const hypothesisResult = getHypothesisResult(gameState);

  const directIds = asArray(
    hypothesisResult.confirmedItemIds
  );

  const legacyIds = asArray(
    asObject(gameState.reconstructedHeist).confirmedItemIds
  );

  const sourceIds = directIds.length > 0
    ? directIds
    : legacyIds;

  return new Set(
    sourceIds
      .map(id => normalizeId(id))
      .filter(Boolean)
  );
}

function shouldShowFoundObject(
  object,
  hypothesisCompleted,
  confirmedItemIds
) {
  if (!object || typeof object !== 'object') {
    return false;
  }

  /*
   * Przed ukończeniem hipotezy pokazujemy wszystkie znalezione
   * przedmioty: trzy istotne i trzy red herringi.
   */
  if (!hypothesisCompleted) {
    return true;
  }

  /*
   * Po sukcesie hipotezy każdy red herring znika z Crime Board.
   */
  if (object.isRedHerring === true) {
    return false;
  }

  /*
   * Gdy HypothesisResultService zapisał trzy potwierdzone ID,
   * pokazujemy wyłącznie te trzy właściwe elementy rekonstrukcji.
   */
  if (confirmedItemIds.size > 0) {
    const objectId = normalizeId(
      object.id ||
      object.objectId ||
      object.item
    );

    return confirmedItemIds.has(objectId);
  }

  /*
   * Fallback dla starych zapisów:
   * jeżeli gracz ukończył hipotezę, ale save nie ma jeszcze
   * confirmedItemIds, usuwamy przynajmniej red herringi.
   */
  return true;
}

function buildCrimeScenePhotoItems(gameState) {
  const visitedScenes =
    gameState?.crimeBoardData?.visitedCrimeScenes;

  if (
    !Array.isArray(visitedScenes) ||
    visitedScenes.length === 0
  ) {
    return [];
  }

  const startX = 80;
  const startY = 320;
  const gapX = 150;
  const gapY = 130;
  const perRow = 4;

  return visitedScenes.map((scene, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const success = scene.success !== false;

    return {
      id: `scene-photo-${scene.sceneId || index}`,
      type: 'photo',
      x: startX + (col * gapX),
      y: startY + (row * gapY),
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
  if (!Array.isArray(clues)) {
    return [];
  }

  return clues.filter(clue => {
    if (!clue || typeof clue !== 'object') {
      return false;
    }

    /*
     * Skille z hipotezy pokazujemy na osobnej karcie
     * METHOD PROFILE, a nie jako trzy niezależne dowody.
     */
    if (clue.category === 'skills') {
      return false;
    }

    const hasObjectMatch =
      objectMap.has(clue.objectId) ||
      objectMap.has(clue.id);

    return hasObjectMatch;
  });
}

function buildEvidenceItemsFromFoundObjects(gameState) {
  const foundObjects =
    gameState?.crimeBoardData?.sceneFoundObjects;

  if (
    !Array.isArray(foundObjects) ||
    foundObjects.length === 0
  ) {
    return [];
  }

  const hypothesisResult = getHypothesisResult(gameState);
  const hypothesisCompleted =
    isHypothesisCompleted(hypothesisResult);

  const confirmedItemIds = getConfirmedItemIds(gameState);

  const visibleObjects = foundObjects.filter(object =>
    shouldShowFoundObject(
      object,
      hypothesisCompleted,
      confirmedItemIds
    )
  );

  return visibleObjects.map((obj, index) => {
    const fields = [];

    if (obj.sceneId) {
      fields.push({
        key: 'Scene',
        value: obj.sceneId
      });
    }

    if (obj.cityId) {
      fields.push({
        key: 'City',
        value: obj.cityId
      });
    }

    if (hypothesisCompleted) {
      fields.push({
        key: 'Status',
        value: 'Confirmed in reconstruction'
      });
    }

    return {
      id: `found-object-${obj.id || index}`,
      type: 'evidence',
      x: 520 + ((index % 2) * 250),
      y: 140 + (Math.floor(index / 2) * 210),
      z: 2,
      rotation: getRotation(index + 3),
      pinned: hypothesisCompleted,
      label: obj.item || `Object ${index + 1}`,
      tag: hypothesisCompleted
        ? 'Confirmed clue'
        : 'Found at scene',
      body: obj.description ||
        obj.heistExplanation ||
        'Recovered during the forensic sweep.',
      fields,
      clueId: obj.id || null,
      isRedHerring: Boolean(obj.isRedHerring),
      heistExplanation: obj.heistExplanation || '',
      trueExplanation: obj.trueExplanation || '',
      tags: [
        'found-object',
        hypothesisCompleted
          ? 'confirmed-reconstruction'
          : 'scene-evidence'
      ],
      discovered: true,
      createdByPlayer: false,
      editableByPlayer: false
    };
  });
}

function buildEvidenceItemsFromClues(
  clues,
  objectsData = []
) {
  const objectMap = new Map(
    (Array.isArray(objectsData) ? objectsData : [])
      .filter(obj => obj && obj.id)
      .map(obj => [obj.id, obj])
  );

  return clues.map((clue, index) => {
    const objectMatch =
      objectMap.get(clue.objectId) ||
      objectMap.get(clue.id) ||
      null;

    const title =
      clue.label ||
      clue.title ||
      objectMatch?.item ||
      `Clue ${index + 1}`;

    const body =
      clue.text ||
      clue.description ||
      clue.content ||
      objectMatch?.heistExplanation ||
      objectMatch?.trueExplanation ||
      'Collected during investigation.';

    const fields = [];

    if (clue.type) {
      fields.push({
        key: 'Type',
        value: clue.type
      });
    }

    if (clue.cityId) {
      fields.push({
        key: 'City',
        value: clue.cityId
      });
    }

    if (objectMatch?.scene) {
      fields.push({
        key: 'Scene',
        value: objectMatch.scene
      });
    }

    if (objectMatch?.isRedHerring) {
      fields.push({
        key: 'Status',
        value: 'Red herring'
      });
    }

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
      discovered: true,
      createdByPlayer: false,
      editableByPlayer: false
    };
  });
}

function buildMethodProfileItem(gameState) {
  const hypothesisResult = getHypothesisResult(gameState);

  if (!isHypothesisCompleted(hypothesisResult)) {
    return null;
  }

  const reconstruction = asObject(
    gameState.reconstructedHeist
  );

  const skills = uniqueStrings([
    ...asArray(hypothesisResult.requiredSkills),
    ...asArray(hypothesisResult.skills),
    ...asArray(reconstruction.confirmedSkills)
  ]).slice(0, 3);

  if (skills.length === 0) {
    return null;
  }

  return {
    id: 'hypothesis-method-profile',
    type: 'evidence',
    x: 1060,
    y: 120,
    z: 4,
    rotation: -1.2,
    pinned: true,
    label: 'METHOD PROFILE',
    tag: 'Confirmed',
    body: 'The reconstruction reveals the skills needed for this theft.',
    fields: [
      {
        key: 'Status',
        value: 'Reconstruction confirmed'
      },
      {
        key: 'Skills',
        value: skills.join(', ')
      },
      {
        key: 'Source',
        value: 'Crime scene reconstruction'
      }
    ],
    clueId: 'hypothesis-method-profile',
    tags: ['hypothesis', 'method', 'confirmed'],
    discovered: true,
    createdByPlayer: false,
    editableByPlayer: false
  };
}

function getLabResults(gameState = {}) {
  const crimeBoardData = asObject(
    gameState.crimeBoardData
  );

  const crimeLab = asObject(
    gameState.crimeLab
  );

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
    candidates.find(candidate => Array.isArray(candidate)) ||
    [];

  const seen = new Set();

  return rawResults.filter(result => {
    if (!result || typeof result !== 'object') {
      return false;
    }

    const isCompleted =
      result.completed === true ||
      result.success === true ||
      result.unlocked === true ||
      result.status === 'completed' ||
      result.status === 'success' ||
      result.status === 'solved' ||
      result.status === 'confirmed';

    if (!isCompleted) {
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
  const labResults = getLabResults(gameState);

  return labResults.map((result, index) => {
    const resultId = normalizeId(
      result.id ||
      result.key ||
      result.type ||
      result.title ||
      result.label ||
      `result-${index + 1}`
    );

    const title = asText(
      result.title ||
      result.label ||
      result.name ||
      result.type,
      'LAB REPORT'
    );

    const value = asText(
      result.value ||
      result.result ||
      result.answer ||
      result.conclusion ||
      result.summary,
      'Analysis complete'
    );

    const body = asText(
      result.description ||
      result.details ||
      result.text ||
      result.body,
      value
    );

    const source = asText(
      result.source ||
      result.minigame ||
      result.labGame,
      'Crime Lab'
    );

    return {
      id: `lab-result-${resultId}`,
      type: 'evidence',
      x: 1060 + ((index % 2) * 220),
      y: 300 + (Math.floor(index / 2) * 185),
      z: 4,
      rotation: getRotation(index + 12),
      pinned: true,
      label: title,
      tag: 'Lab result',
      body,
      fields: [
        {
          key: 'Result',
          value
        },
        {
          key: 'Source',
          value: source
        },
        {
          key: 'Status',
          value: 'Verified'
        }
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

  const evidenceItems = items.filter(
    item => item.type === 'evidence'
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
    if (!suspectItem) {
      return;
    }

    links.push({
      id: `link-suspect-evidence-${index}`,
      from: suspectItem.id,
      to: item.id,
      fromAnchor: index % 2 === 0
        ? 'right'
        : 'bottom',
      toAnchor: 'left',
      color: '#b3131b'
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
  const items = [];

  const objectMap = new Map(
    (Array.isArray(objectsData) ? objectsData : [])
      .filter(obj => obj && obj.id)
      .map(obj => [obj.id, obj])
  );

  items.push(buildMissionArtifactItem(mission));

  items.push(
    buildUnknownSuspectItem(
      gameState.currentThief?.id ||
      gameState.currentThiefId ||
      null
    )
  );

  const scenePhotoItems =
    buildCrimeScenePhotoItems(gameState);

  scenePhotoItems.forEach(item => {
    items.push(item);
  });

  /*
   * Ta funkcja filtruje red herringi po ukończeniu hipotezy.
   * Po sukcesie zostają tylko elementy z confirmedItemIds.
   */
  const foundObjectItems =
    buildEvidenceItemsFromFoundObjects(gameState);

  foundObjectItems.forEach(item => {
    items.push(item);
  });

  /*
   * Karta dedukcyjna dodawana po udanej rekonstrukcji.
   * Nie duplikujemy pojedynczych skillów jako osobnych dowodów.
   */
  const methodProfileItem =
    buildMethodProfileItem(gameState);

  if (methodProfileItem) {
    items.push(methodProfileItem);
  }

  /*
   * Wyniki gier laboratoryjnych.
   * Pokazywane są wyłącznie wyniki oznaczone jako completed/success.
   */
  const labResultItems =
    buildLabResultItems(gameState);

  labResultItems.forEach(item => {
    items.push(item);
  });

  /*
   * Tylko wpisy odpowiadające fizycznym przedmiotom z objects.json.
   * Skille pomijamy, bo są reprezentowane przez METHOD PROFILE.
   */
  const collectedClues = normalizeCollectedClues(
    gameState.cluesCollected,
    objectMap
  );

  const evidenceItems = buildEvidenceItemsFromClues(
    collectedClues,
    objectsData
  );

  evidenceItems.forEach(item => {
    items.push(item);
  });

  const playerNotesItem = buildPlayerNotesItem(
    gameState.playerNotes
  );

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
      version: 3,
      thiefId: gameState.currentThief?.id ||
        gameState.currentThiefId ||
        null,
      crimeCity: mission.city ||
        gameState.crimeCity ||
        ''
    },
    items,
    links: buildLinks(items)
  };
}

async function getObjectsData(
  objectsUrl = DEFAULT_OBJECTS_URL
) {
  try {
    const loaded = await loadJson(objectsUrl);
    return Array.isArray(loaded)
      ? loaded
      : [];
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

  const baseIds = new Set(
    baseLayout.items.map(item => item.id)
  );

  const playerItems = savedData.items.filter(
    item =>
      item?.createdByPlayer &&
      !baseIds.has(item.id)
  );

  const mergedItems = [
    ...baseLayout.items,
    ...cloneData(playerItems)
  ];

  const validIds = new Set(
    mergedItems.map(item => item.id)
  );

  const savedLinks = Array.isArray(savedData.links)
    ? savedData.links
    : [];

  const playerLinks = savedLinks.filter(
    link =>
      validIds.has(link?.from) &&
      validIds.has(link?.to)
  );

  return {
    meta: cloneData(baseLayout.meta),
    items: mergedItems,
    links: [
      ...baseLayout.links,
      ...cloneData(playerLinks)
    ]
  };
}

function ensureBoardApi(
  boardInstance,
  localState,
  objectsData
) {
  return {
    board: boardInstance,

    getData() {
      return boardInstance.getBoardData();
    },

    refresh(nextState = localState) {
      const currentData = boardInstance.getBoardData();

      const baseLayout = buildBoardLayout(
        nextState,
        objectsData
      );

      const mergedLayout = mergePlayerItems(
        baseLayout,
        currentData
      );

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
    throw new Error(
      'CrimeBoardInit: root is required.'
    );
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

  let initialData;

  if (state.currentMission) {
    const baseLayout = buildBoardLayout(
      state,
      objectsData
    );

    initialData = mergePlayerItems(
      baseLayout,
      data
    );
  } else {
    initialData = cloneData(data);
  }

  board.loadBoard(initialData);

  return ensureBoardApi(
    board,
    state,
    objectsData
  );
}

export { buildBoardLayout };