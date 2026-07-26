export function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function splitCsv(value) {
  if (Array.isArray(value)) return value.map(normalizeToken).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(',')
    .map(normalizeToken)
    .filter(Boolean);
}

export function normalizeSuspect(suspect = {}) {
  return {
    ...suspect,
    id: suspect.id || normalizeToken(suspect.name),
    skillsList: splitCsv(suspect.skills),
    habitusList: splitCsv(suspect.habitus),
    portraitKey: suspect.portraitKey || suspect.id || normalizeToken(suspect.name),
    suspectImageKey: suspect.suspectImageKey || '',
    wantedKey: suspect.wantedKey || '',
    image: suspect.image || `assets/suspects/${suspect.portraitKey || suspect.id || normalizeToken(suspect.name)}.jpg`
  };
}

export function normalizeObject(object = {}) {
  return {
    ...object,
    id: object.id || normalizeToken(object.item),
    skillsList: splitCsv(object.skills),
    tagsList: Array.isArray(object.tags) ? object.tags.map(normalizeToken).filter(Boolean) : [],
    sceneList: Array.isArray(object.scene)
      ? object.scene.map(normalizeToken).filter(Boolean)
      : object.scene ? [normalizeToken(object.scene)] : [],
    suspectAffinityList: Array.isArray(object.suspectAffinity)
      ? object.suspectAffinity.map(normalizeToken).filter(Boolean)
      : []
  };
}

export function buildSuspectIndex(suspects = []) {
  const normalized = suspects.map(normalizeSuspect);
  const byId = new Map(normalized.map(s => [s.id, s]));
  return { list: normalized, byId };
}

export function buildObjectIndex(objects = []) {
  const normalized = objects.map(normalizeObject);
  const byId = new Map(normalized.map(o => [o.id, o]));
  return { list: normalized, byId };
}

export function skillsMatchScore(suspect, skills = []) {
  const suspectSkills = new Set(splitCsv(suspect.skillsList || suspect.skills || []));
  const wanted = splitCsv(skills);
  return wanted.reduce((score, skill) => score + (suspectSkills.has(skill) ? 1 : 0), 0);
}

export function filterSuspectsByClue(suspects = [], clue = {}) {
  const normalizedSuspects = suspects.map(normalizeSuspect);
  const clueType = normalizeToken(clue.deductionType || clue.tag || clue.type || '');
  const clueValue = normalizeToken(clue.deductionValue || clue.value || clue.label || clue.text || '');
  const clueSkills = splitCsv(clue.skills || []);
  const clueAffinity = splitCsv(clue.suspectAffinity || []);

  return normalizedSuspects.map(suspect => {
    let score = 0;
    const reasons = [];

    if (clueSkills.length) {
      const matched = skillsMatchScore(suspect, clueSkills);
      score += matched;
      if (matched) reasons.push(`skills:${matched}`);
    }

    if (clueAffinity.length && clueAffinity.includes(normalizeToken(suspect.id))) {
      score += 2;
      reasons.push('affinity');
    }

    if (clueType && clueValue) {
      if (clueType === 'hair' && normalizeToken(suspect.hair) === clueValue) { score += 3; reasons.push('hair'); }
      if (clueType === 'eyes' && normalizeToken(suspect.eyes) === clueValue) { score += 3; reasons.push('eyes'); }
      if (clueType === 'accent' && normalizeToken(suspect.accent) === clueValue) { score += 3; reasons.push('accent'); }
      if (clueType === 'features' && normalizeToken(suspect.features).includes(clueValue)) { score += 3; reasons.push('features'); }
      if (clueType === 'skill' && (suspect.skillsList || []).includes(clueValue)) { score += 3; reasons.push('skill'); }
      if (clueType === 'habitus' && (suspect.habitusList || []).includes(clueValue)) { score += 2; reasons.push('habitus'); }
    }

    return { suspect, score, reasons };
  }).sort((a, b) => b.score - a.score);
}

export function buildVerdictCandidates({ suspects = [], clues = [], requiredSkills = [] } = {}) {
  const normalizedSuspects = suspects.map(normalizeSuspect);
  const normalizedClues = clues.map(normalizeObject);
  const tally = new Map();

  normalizedSuspects.forEach(suspect => tally.set(suspect.id, { suspect, score: 0, reasons: [] }));

  normalizedClues.forEach(clue => {
    const results = filterSuspectsByClue(normalizedSuspects, clue);
    results.filter(r => r.score > 0).forEach(({ suspect, score, reasons }) => {
      const entry = tally.get(suspect.id);
      entry.score += score;
      entry.reasons.push(...reasons.map(r => `${clue.id}:${r}`));
    });
  });

  const required = splitCsv(requiredSkills);
  normalizedSuspects.forEach(suspect => {
    const entry = tally.get(suspect.id);
    const matchedRequired = required.filter(skill => (suspect.skillsList || []).includes(skill));
    entry.requiredSkillsMatched = matchedRequired;
    entry.requiredSkillCount = matchedRequired.length;
    entry.score += matchedRequired.length * 2;
  });

  return [...tally.values()].sort((a, b) => b.score - a.score);
}

export function buildWarrantShortlist({ suspects = [], clues = [], requiredSkills = [], limit = 5 } = {}) {
  return buildVerdictCandidates({ suspects, clues, requiredSkills }).slice(0, limit);
}

export function buildCaseSuspectsFromPool({ suspects = [], clues = [], requiredSkills = [] } = {}) {
  const candidates = buildVerdictCandidates({ suspects, clues, requiredSkills });
  return candidates.map((entry, index) => ({
    id: entry.suspect.id,
    name: entry.suspect.name,
    portraitKey: entry.suspect.portraitKey,
    suspectImageKey: entry.suspect.suspectImageKey,
    wantedKey: entry.suspect.wantedKey,
    skills: entry.suspect.skillsList,
    habitus: entry.suspect.habitusList,
    score: entry.score,
    reasons: entry.reasons,
    rank: index + 1,
    eliminated: false,
    discovered: true,
    image: entry.suspect.image
  }));
}