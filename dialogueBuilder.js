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
  if (isCrimeCity && targetCityId) {
    return {
      line: `Right after the job, the trail bent toward ${targetCityId.replaceAll('_', ' ')}.`,
      note: {
        type: 'travel',
        cityId: targetCityId,
        tag: targetCityId,
        value: targetCityId
      }
    };
  }

  if (isNextTargetCity && targetCityId) {
    return {
      line: `You are close, detective. From here, the trail points toward ${targetCityId.replaceAll('_', ' ')}.`,
      note: {
        type: 'travel',
        cityId: targetCityId,
        tag: targetCityId,
        value: targetCityId
      }
    };
  }

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

function buildStageAwareBanter(variant, { isCrimeCity = false, isNextTargetCity = false } = {}) {
  const pool = Array.isArray(variant?.banter) ? variant.banter : [];
  const selected = pickRandom(pool);

  if (selected) return selected;

  if (isCrimeCity) {
    return 'This city still smells like panic and expensive lies.';
  }

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
  const variant = getLocationVariant(npcData, cityId) || {};
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

export function buildNpcDialogue({
  npcData,
  suspect,
  cityId,
  targetCityId,
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

  const variant = getLocationVariant(npcData, cityId) || {};
  const banter = buildStageAwareBanter(variant, { isCrimeCity, isNextTargetCity });

  const suspectClues = suspect
    ? buildSuspectClueLines(
        suspect,
        variant.suspectCluePool || {},
        sharedSuspectClues,
        1
      )
    : { lines: [], notes: [] };

  const travel = targetCityId
    ? buildTravelClue(npcData, cityId, targetCityId, sharedCityClues, 1)
    : { lines: [], notes: [] };

  const fallbackSuspect = buildFallbackSuspectLine(suspect, isCrimeCity);
  const fallbackTravel = buildFallbackTravelLine(targetCityId, isCrimeCity, isNextTargetCity);

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