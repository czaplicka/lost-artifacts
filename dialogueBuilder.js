function shuffleArray(arr) {
  const copy = Array.isArray(arr) ? [...arr] : [];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRandomUnique(arr, count = 1) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return shuffleArray(arr).slice(0, Math.max(0, count));
}

export function splitTags(value) {
  if (!value || typeof value !== 'string') return [];

  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

export function getSuspectTags(suspect) {
  if (!suspect) return [];

  const tags = [];

  if (suspect.hair) tags.push({ category: 'hair', key: suspect.hair });
  if (suspect.eyes) tags.push({ category: 'eyes', key: suspect.eyes });
  if (suspect.features) tags.push({ category: 'features', key: suspect.features });
  if (suspect.accent) tags.push({ category: 'accent', key: suspect.accent });

  splitTags(suspect.skills).forEach(skill => {
    tags.push({ category: 'skills', key: skill });
  });

  splitTags(suspect.habitus).forEach(habit => {
    tags.push({ category: 'habitus', key: habit });
  });

  return tags;
}

function getLocationVariant(npcData, cityId) {
  if (!npcData || !cityId) return null;
  return npcData.locationVariants?.[cityId] || null;
}

function mergePools(localPool, globalPool) {
  return [
    ...(Array.isArray(localPool) ? localPool : []),
    ...(Array.isArray(globalPool) ? globalPool : [])
  ];
}

export function buildSuspectClueLines(suspect, suspectCluePool, count = 2) {
  const allTags = shuffleArray(getSuspectTags(suspect));
  const lines = [];
  const notes = [];
  const usedKeys = new Set();

  for (const tag of allTags) {
    if (lines.length >= count) break;

    const uniqueId = `${tag.category}:${tag.key}`;
    if (usedKeys.has(uniqueId)) continue;

    const pool = suspectCluePool?.[tag.category]?.[tag.key];
    if (!Array.isArray(pool) || pool.length === 0) continue;

    const line = pickRandom(pool);
    if (!line) continue;

    lines.push(line);
    notes.push({
      type: 'suspect',
      category: tag.category,
      key: tag.key,
      value: tag.key
    });

    usedKeys.add(uniqueId);
  }

  return { lines, notes };
}

export function normalizeTravelHint(hint, targetCityId) {
  if (!hint) return null;

  if (typeof hint === 'string') {
    return {
      text: hint,
      note: {
        type: 'travel',
        cityId: targetCityId || null,
        tag: hint,
        value: targetCityId || null
      }
    };
  }

  if (typeof hint === 'object' && hint.text) {
    return {
      text: hint.text,
      note: {
        type: 'travel',
        cityId: hint.cityId || targetCityId || null,
        tag: hint.tag || hint.text,
        value: hint.cityId || targetCityId || null
      }
    };
  }

  return null;
}

export function buildTravelClue(npcData, cityId, targetCityId, count = 1) {
  const variant = getLocationVariant(npcData, cityId);

  const localCityHints = variant?.cityHints?.[targetCityId] || [];
  const globalCityHints = npcData?.cityHints?.[targetCityId] || [];
  const hintPool = mergePools(localCityHints, globalCityHints);

  const selected = pickRandomUnique(hintPool, Math.max(0, count));

  const normalized = selected
    .map(hint => normalizeTravelHint(hint, targetCityId))
    .filter(Boolean);

  return {
    lines: normalized.map(item => item.text),
    notes: normalized.map(item => item.note)
  };
}

export function buildRepeatDialogue(npcData, cityId) {
  const variant = getLocationVariant(npcData, cityId);

  const repeatPool = mergePools(
    variant?.repeatLines,
    npcData?.repeatLines
  );

  const selectedPair = pickRandom(repeatPool);

  if (Array.isArray(selectedPair) && selectedPair.length > 0) {
    return {
      lines: selectedPair.filter(Boolean),
      notes: []
    };
  }

  return {
    lines: [
      'We already talked, detective.',
      'I’m fresh out of new revelations and old patience.'
    ],
    notes: []
  };
}

export function buildNpcDialogue({
  npcId,
  npcData,
  suspect,
  cityId,
  targetCityId,
  isRepeat = false,
  banterCount = 1,
  travelCount = 1,
  suspectCount = 2
}) {
  if (!npcData) {
    return {
      lines: [
        'I had something useful to say, detective.',
        "Unfortunately, the writer hasn't interviewed me yet."
      ],
      notes: []
    };
  }

  if (isRepeat) {
    return buildRepeatDialogue(npcData, cityId);
  }

  const variant = getLocationVariant(npcData, cityId);

  const banterPool = mergePools(
    variant?.banter,
    npcData?.banter
  );

  const banter = pickRandomUnique(banterPool, banterCount);

  const travel = targetCityId
    ? buildTravelClue(npcData, cityId, targetCityId, travelCount)
    : { lines: [], notes: [] };

  const suspectClues = suspect
    ? buildSuspectClueLines(suspect, npcData?.suspectCluePool || {}, suspectCount)
    : { lines: [], notes: [] };

  const lines = [
    ...banter,
    ...suspectClues.lines,
    ...travel.lines
  ].filter(Boolean);

  if (lines.length === 0) {
    lines.push(
      'I noticed something odd, detective.',
      'Not enough odd details survived the paperwork, though.'
    );
  }

  return {
    lines,
    notes: [
      ...suspectClues.notes,
      ...travel.notes
    ]
  };
}