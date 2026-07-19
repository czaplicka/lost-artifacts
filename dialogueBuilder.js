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

function getSharedCityTravelHints(sharedCityClues, targetCityId) {
  if (!sharedCityClues || !targetCityId) return [];
  return sharedCityClues?.[targetCityId]?.travelHints || [];
}

function getSharedSuspectPool(sharedSuspectClues, category, key) {
  if (!sharedSuspectClues || !category || !key) return [];
  return sharedSuspectClues?.[category]?.[key] || [];
}

function ensureThreeLines(lines) {
  const safeLines = (Array.isArray(lines) ? lines : [])
    .map(line => (typeof line === 'string' ? line.trim() : ''))
    .filter(Boolean)
    .slice(0, 3);

  const fallbackLines = [
    'I run on coffee, suspicion, and professionally managed disappointment.',
    'Something about them stood out, but memory is an unreliable investment.',
    'They mentioned another city, though not with the precision I’d call helpful.'
  ];

  while (safeLines.length < 3) {
    safeLines.push(fallbackLines[safeLines.length]);
  }

  return safeLines;
}

function buildFallbackSuspectLine(suspect) {
  if (!suspect) {
    return {
      line: 'I noticed them, but nothing specific enough to help your profile.',
      note: null
    };
  }

  if (suspect.accent) {
    return {
      line: `The accent stood out first — ${suspect.accent}, polished enough to open doors and close questions.`,
      note: {
        type: 'suspect',
        category: 'accent',
        key: suspect.accent,
        value: suspect.accent
      }
    };
  }

  if (suspect.features) {
    return {
      line: `One detail stuck with me: ${suspect.features.toLowerCase()}. The kind of feature you remember after the room clears.`,
      note: {
        type: 'suspect',
        category: 'features',
        key: suspect.features,
        value: suspect.features
      }
    };
  }

  if (suspect.hair) {
    return {
      line: `The hair was memorable — ${suspect.hair.toLowerCase()}, unusual enough to stay with you.`,
      note: {
        type: 'suspect',
        category: 'hair',
        key: suspect.hair,
        value: suspect.hair
      }
    };
  }

  if (suspect.eyes) {
    return {
      line: `The eyes were hard to ignore — ${suspect.eyes.toLowerCase()}, steady and far too observant.`,
      note: {
        type: 'suspect',
        category: 'eyes',
        key: suspect.eyes,
        value: suspect.eyes
      }
    };
  }

  return {
    line: 'I noticed them, but nothing specific enough to help your profile.',
    note: null
  };
}

function buildFallbackTravelLine(targetCityId) {
  const line = targetCityId
    ? `They were definitely asking about ${targetCityId.replaceAll('_', ' ')}.`
    : 'They mentioned travel, but not clearly enough to be useful.';

  return {
    line,
    note: targetCityId
      ? {
          type: 'travel',
          cityId: targetCityId,
          tag: line,
          value: targetCityId
        }
      : null
  };
}

export function buildSuspectClueLines(
  suspect,
  suspectCluePool,
  sharedSuspectClues = null,
  count = 1
) {
  const allTags = shuffleArray(getSuspectTags(suspect));
  const lines = [];
  const notes = [];
  const usedKeys = new Set();

  console.log('[SUSPECT DEBUG] allTags:', allTags);
  console.log('[SUSPECT DEBUG] suspectCluePool:', suspectCluePool);
  console.log('[SUSPECT DEBUG] sharedSuspectClues:', sharedSuspectClues);

  for (const tag of allTags) {
    if (lines.length >= count) break;

    const uniqueId = `${tag.category}:${tag.key}`;
    if (usedKeys.has(uniqueId)) continue;

    const localPool = suspectCluePool?.[tag.category]?.[tag.key] || [];
    const sharedPool = getSharedSuspectPool(sharedSuspectClues, tag.category, tag.key);
    const pool = mergePools(localPool, sharedPool);

    console.log('[SUSPECT DEBUG] tag:', tag);
    console.log('[SUSPECT DEBUG] localPool:', localPool);
    console.log('[SUSPECT DEBUG] sharedPool:', sharedPool);
    console.log('[SUSPECT DEBUG] mergedPool:', pool);

    if (pool.length === 0) continue;

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

  console.log('[SUSPECT DEBUG] result lines:', lines);
  console.log('[SUSPECT DEBUG] result notes:', notes);

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

export function buildTravelClue(
  npcData,
  cityId,
  targetCityId,
  sharedCityClues = null,
  count = 1
) {
  const variant = getLocationVariant(npcData, cityId);

  const localTravelHints = variant?.travelHints?.[targetCityId] || [];
  const sharedTravelHints = getSharedCityTravelHints(sharedCityClues, targetCityId);
  const hintPool = mergePools(localTravelHints, sharedTravelHints);

  const selected = pickRandomUnique(hintPool, Math.max(0, count));

  const normalized = selected
    .map(hint => normalizeTravelHint(hint, targetCityId))
    .filter(Boolean);

  return {
    lines: normalized.map(item => item.text),
    notes: normalized.map(item => item.note).filter(Boolean)
  };
}

export function buildRepeatDialogue(npcData, cityId) {
  const variant = getLocationVariant(npcData, cityId);
  const repeatPool = Array.isArray(variant?.repeatLines) ? variant.repeatLines : [];
  const selectedPair = pickRandom(repeatPool);

  if (Array.isArray(selectedPair) && selectedPair.length > 0) {
    return {
      lines: ensureThreeLines([
        selectedPair[0] || 'We already talked, detective.',
        selectedPair[1] || 'Nothing new has surfaced since.',
        'No new travel clue this time.'
      ]),
      notes: []
    };
  }

  return {
    lines: ensureThreeLines([
      'We already talked, detective.',
      'I’m fresh out of new revelations and old patience.',
      'No new travel clue this time.'
    ]),
    notes: []
  };
}

export function buildFalseLeadDialogue(npcData, cityId) {
  const variant = getLocationVariant(npcData, cityId);
  const falseLeadPool = Array.isArray(variant?.falseLeadLines) ? variant.falseLeadLines : [];
  const selectedPair = pickRandom(falseLeadPool);

  if (Array.isArray(selectedPair) && selectedPair.length > 0) {
    return {
      lines: ensureThreeLines([
        selectedPair[0] || 'Wrong city, detective.',
        selectedPair[1] || 'Whoever you are looking for was not here.',
        'You should recheck the trail before wasting another flight.'
      ]),
      notes: []
    };
  }

  return {
    lines: ensureThreeLines([
      'Wrong city, detective.',
      'No one matching that trail came through here.',
      'Check your last lead and try again.'
    ]),
    notes: []
  };
}
console.log('[CALL SITE] suspect before buildNpcDialogue:', suspect);
export function buildNpcDialogue({
  npcData,
  suspect,
  cityId,
  targetCityId,
  sharedCityClues = null,
  sharedSuspectClues = null,
  isRepeat = false
}) {
  if (isRepeat) {
    return buildRepeatDialogue(npcData, cityId);
  }

  const variant = getLocationVariant(npcData, cityId);
  const banter = pickRandom(Array.isArray(variant?.banter) ? variant.banter : []);

  console.log('[DIALOGUE DEBUG] suspect:', suspect);
  console.log('[DIALOGUE DEBUG] suspect tags:', getSuspectTags(suspect));
  console.log('[DIALOGUE DEBUG] sharedSuspectClues:', sharedSuspectClues);
  console.log('[DIALOGUE DEBUG] variant suspectCluePool:', variant?.suspectCluePool);

  const suspectClues = suspect
    ? buildSuspectClueLines(
        suspect,
        variant?.suspectCluePool || {},
        sharedSuspectClues,
        1
      )
    : { lines: [], notes: [] };

  const travel = targetCityId
    ? buildTravelClue(npcData, cityId, targetCityId, sharedCityClues, 1)
    : { lines: [], notes: [] };

  const fallbackSuspect = buildFallbackSuspectLine(suspect);
  const fallbackTravel = buildFallbackTravelLine(targetCityId);

  const suspectLine = suspectClues.lines[0] || fallbackSuspect.line;
  const suspectNotes =
    suspectClues.notes.length > 0
      ? suspectClues.notes
      : fallbackSuspect.note
      ? [fallbackSuspect.note]
      : [];

  const travelLine = travel.lines[0] || fallbackTravel.line;
  const travelNotes =
    travel.notes.length > 0
      ? travel.notes
      : fallbackTravel.note
      ? [fallbackTravel.note]
      : [];

  return {
    lines: ensureThreeLines([
      banter || 'I run on coffee, suspicion, and professionally managed disappointment.',
      suspectLine,
      travelLine
    ]),
    notes: [
      ...suspectNotes,
      ...travelNotes
    ]
  };
}