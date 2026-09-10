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

function normalizeCityId(cityIdOrName) {
  if (!cityIdOrName || typeof cityIdOrName !== 'string') return null;

  const raw = cityIdOrName.trim();
  const map = {
    London: 'london',
    'New Delhi': 'new_delhi',
    'New York City': 'new_york_city',
    Paris: 'paris',
    Warsaw: 'warsaw',
    Berlin: 'berlin',
    'Mark Agency Headquarters': 'hq'
  };

  if (map[raw]) return map[raw];

  return raw.toLowerCase().replace(/\s+/g, '_');
}

function getSharedCityTravelHints(sharedCityClues, targetCityId) {
  if (!sharedCityClues || !targetCityId) return [];
  const normalizedTargetId = normalizeCityId(targetCityId);
  return sharedCityClues?.[normalizedTargetId]?.travelHints || [];
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

function buildFallbackSuspectLine(suspect, isCrimeCity = false) {
  if (!suspect) {
    return {
      line: isCrimeCity
        ? 'Someone moved through this city carefully, but not invisibly.'
        : 'I noticed them, but nothing specific enough to help your profile.',
      note: null
    };
  }

  if (suspect.accent) {
    return {
      line: isCrimeCity
        ? `At the crime scene, what stuck with people first was the accent — ${suspect.accent}, polished enough to calm suspicion.`
        : `The accent stood out first — ${suspect.accent}, polished enough to open doors and close questions.`,
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
      line: isCrimeCity
        ? `People here kept circling back to one detail: ${suspect.features.toLowerCase()}.`
        : `One detail stuck with me: ${suspect.features.toLowerCase()}. The kind of feature you remember after the room clears.`,
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
      line: isCrimeCity
        ? `Witnesses here remembered the hair — ${suspect.hair.toLowerCase()}, distinctive enough to survive panic.`
        : `The hair was memorable — ${suspect.hair.toLowerCase()}, unusual enough to stay with you.`,
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
      line: isCrimeCity
        ? `The eyes came up more than once — ${suspect.eyes.toLowerCase()}, calm in a place where calm did not belong.`
        : `The eyes were hard to ignore — ${suspect.eyes.toLowerCase()}, steady and far too observant.`,
      note: {
        type: 'suspect',
        category: 'eyes',
        key: suspect.eyes,
        value: suspect.eyes
      }
    };
  }

  return {
    line: isCrimeCity
      ? 'People here remember the suspect, but only in fragments.'
      : 'I noticed them, but nothing specific enough to help your profile.',
    note: null
  };
}

function buildFallbackTravelLine(targetCityId, isCrimeCity = false, isNextTargetCity = false) {
  const normalizedTargetId = targetCityId ? normalizeCityId(targetCityId) : null;
  const displayName = normalizedTargetId
    ? normalizedTargetId.replaceAll('_', ' ')
    : null;

  if (isCrimeCity && normalizedTargetId) {
    return {
      line: `Right after the job, the trail bent toward ${displayName}.`,
      note: {
        type: 'travel',
        cityId: normalizedTargetId,
        tag: normalizedTargetId,
        value: normalizedTargetId
      }
    };
  }

  if (isNextTargetCity && normalizedTargetId) {
    return {
      line: `You are close, detective. From here, the trail points toward ${displayName}.`,
      note: {
        type: 'travel',
        cityId: normalizedTargetId,
        tag: normalizedTargetId,
        value: normalizedTargetId
      }
    };
  }

  const line = normalizedTargetId
    ? `They were definitely asking about ${displayName}.`
    : 'They mentioned travel, but not clearly enough to be useful.';

  return {
    line,
    note: normalizedTargetId
      ? {
          type: 'travel',
          cityId: normalizedTargetId,
          tag: line,
          value: normalizedTargetId
        }
      : null
  };
}

function buildStageAwareBanter(variant, { isCrimeCity = false, isNextTargetCity = false } = {}) {
  const pool = Array.isArray(variant?.banter) ? variant.banter : [];
  const selected = pickRandom(pool);

  if (selected) return selected;
  if (isCrimeCity) return 'This city still smells like panic and expensive lies.';
  if (isNextTargetCity) {
    return 'You are close enough now that people have started remembering details they hoped to forget.';
  }
  return 'I run on coffee, suspicion, and professionally managed disappointment.';
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

  for (const tag of allTags) {
    if (lines.length >= count) break;

    const uniqueId = `${tag.category}:${tag.key}`;
    if (usedKeys.has(uniqueId)) continue;

    const localPool = suspectCluePool?.[tag.category]?.[tag.key] || [];
    const sharedPool = getSharedSuspectPool(sharedSuspectClues, tag.category, tag.key);
    const pool = mergePools(localPool, sharedPool);

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

  return { lines, notes };
}

export function normalizeTravelHint(hint, targetCityId, options = {}) {
  if (!hint) return null;

  const { allowOnlyCanonicalTravelClue = true } = options;
  const normalizedTargetId = targetCityId ? normalizeCityId(targetCityId) : null;

  if (typeof hint === 'string') {
    return {
      text: hint,
      note: {
        type: 'travel',
        cityId: normalizedTargetId || null,
        tag: hint,
        value: normalizedTargetId || null
      }
    };
  }

  if (typeof hint === 'object' && hint.text) {
    const normalizedHintCityId = hint.cityId ? normalizeCityId(hint.cityId) : null;

    if (
      allowOnlyCanonicalTravelClue &&
      normalizedHintCityId &&
      normalizedTargetId &&
      normalizedHintCityId !== normalizedTargetId
    ) {
      return null;
    }

    return {
      text: hint.text,
      note: {
        type: 'travel',
        cityId: normalizedTargetId || normalizedHintCityId || null,
        tag: hint.tag || hint.text,
        value: normalizedTargetId || normalizedHintCityId || null
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
  count = 1,
  options = {}
) {
  const { allowOnlyCanonicalTravelClue = true } = options;

  const normalizedCityId = normalizeCityId(cityId);
  const normalizedTargetId = normalizeCityId(targetCityId);
  const variant = getLocationVariant(npcData, normalizedCityId) || {};

  const localCityPool = variant?.travelHints || {};
  const localTravelHints =
    Array.isArray(localCityPool[normalizedTargetId]) ? localCityPool[normalizedTargetId] : [];

  const sharedTravelHints = getSharedCityTravelHints(sharedCityClues, normalizedTargetId);
  const hintPool = mergePools(localTravelHints, sharedTravelHints);

  const selected = pickRandomUnique(hintPool, Math.max(0, count));

  if (!selected || selected.length === 0) {
    const fallback = buildFallbackTravelLine(normalizedTargetId, false, true);
    return {
      lines: [fallback.line],
      notes: fallback.note ? [fallback.note] : []
    };
  }

  const normalized = selected
    .map(hint => normalizeTravelHint(hint, normalizedTargetId, { allowOnlyCanonicalTravelClue }))
    .filter(Boolean);

  if (normalized.length === 0) {
    const fallback = buildFallbackTravelLine(normalizedTargetId, false, true);
    return {
      lines: [fallback.line],
      notes: fallback.note ? [fallback.note] : []
    };
  }

  return {
    lines: normalized.map(item => item.text),
    notes: normalized.map(item => item.note).filter(Boolean)
  };
}

function noteToReminderLine(note) {
  if (!note) return null;

  if (note.type === 'suspect') {
    return `As I told you, one thing stood out: ${String(note.value).toLowerCase()}.`;
  }

  if (note.type === 'travel' && note.cityId) {
    return `As I told you, they were asking about ${note.cityId.replaceAll('_', ' ')}.`;
  }

  return null;
}

export function buildReminderDialogue(npcData, cityId, previousNotes = []) {
  const variant = getLocationVariant(npcData, normalizeCityId(cityId)) || {};
  const repeatPool = Array.isArray(variant.repeatLines) ? variant.repeatLines : [];
  const selectedPair = pickRandom(repeatPool);

  const reminderSource = Array.isArray(previousNotes) ? previousNotes[0] : null;
  const reminderLine = noteToReminderLine(reminderSource);

  return {
    lines: ensureThreeLines([
      selectedPair?.[0] || 'Back again, detective?',
      reminderLine || 'As I told you before, nothing about that person felt accidental.',
      selectedPair?.[1] || 'That is still the best lead I have for you.'
    ]),
    notes: []
  };
}

export function buildRepeatDialogue(npcData, cityId) {
  const variant = getLocationVariant(npcData, normalizeCityId(cityId));
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
  const variant = getLocationVariant(npcData, normalizeCityId(cityId));
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

export function buildNpcDialogue({
  npcData,
  suspect,
  cityId,
  targetCityId,
  canonicalTravelCityId = null,
  clueScope = 'route_leg',
  routeIndex = -1,
  allowOnlyCanonicalTravelClue = true,
  sharedCityClues = null,
  sharedSuspectClues = null,
  isRepeat = false,
  previousNotes = [],
  isCrimeCity = false,
  isNextTargetCity = false,
  isCorrectCity = true
}) {
  if (!isCorrectCity) {
    return buildFalseLeadDialogue(npcData, cityId);
  }

  if (isRepeat) {
    if (Array.isArray(previousNotes) && previousNotes.length > 0) {
      return buildReminderDialogue(npcData, cityId, previousNotes);
    }

    return buildRepeatDialogue(npcData, cityId);
  }

  const activeTravelCityId =
    canonicalTravelCityId ||
    targetCityId ||
    gameState.nextTargetCityId ||
    null;

  const safeTargetCityId =
    activeTravelCityId &&
    normalizeCityId(activeTravelCityId) !== normalizeCityId(cityId)
      ? activeTravelCityId
      : null;

  const variant = getLocationVariant(npcData, normalizeCityId(cityId)) || {};
  const banter = buildStageAwareBanter(variant, { isCrimeCity, isNextTargetCity });

  const suspectClues = suspect
    ? buildSuspectClueLines(
        suspect,
        variant.suspectCluePool || {},
        sharedSuspectClues,
        1
      )
    : { lines: [], notes: [] };

  const travel =
    clueScope === 'finale' || !safeTargetCityId
      ? { lines: [], notes: [] }
      : buildTravelClue(
          npcData,
          cityId,
          safeTargetCityId,
          sharedCityClues,
          1,
          { allowOnlyCanonicalTravelClue, routeIndex }
        );

  const fallbackSuspect = buildFallbackSuspectLine(suspect, isCrimeCity);
  const fallbackTravel = buildFallbackTravelLine(
    safeTargetCityId,
    isCrimeCity,
    isNextTargetCity
  );

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
      banter,
      suspectLine,
      travelLine
    ]),
    notes: [
      ...suspectNotes,
      ...travelNotes
    ]
  };
}