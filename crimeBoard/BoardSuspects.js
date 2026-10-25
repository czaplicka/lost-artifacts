import { getCaseSuspects } from '../suspects/CaseSuspects.js';

function context(state) {
  const mission = state.currentMission || {};
  const city = state.alibiInvestigation?.cityId || state.caseSuspectCityId ||
    state.crimeCityId || state.crimeCity || mission.city || 'unknown_city';
  const key = String(mission.id || mission.caseId || `${city}_${mission.artifact || 'default'}`);
  const grid = state.caseForensics?.[key]?.suspectGrid;
  const exclusions = state.suspectExclusionState?.[key];
  return { key, grid, exclusions };
}

export function getCrimeBoardSuspects(state) {
  const { key, grid, exclusions } = context(state);
  if (grid?.ruledOutEveryone === true) return [];
  if (grid?.completed !== true && exclusions?.finished !== true) return null;
  const candidates = Array.isArray(grid?.alibiCandidateSuspectIds)
    ? new Set(grid.alibiCandidateSuspectIds) : null;
  const excluded = new Set(exclusions?.manualExclusionIds || []);
  const alibis = state.caseData?.alibiCases?.[key]?.suspects || [];
  return getCaseSuspects(state).filter(suspect => {
    if (!suspect?.id || excluded.has(suspect.id)) return false;
    if (suspect.deductionState?.eliminated === true) return false;
    if (candidates && !candidates.has(suspect.id)) return false;
    const filed = alibis.find(entry => entry.suspectId === suspect.id)?.playerConclusion;
    const status = filed?.locked === true ? filed.status : suspect.deductionState?.alibiStatus;
    return status !== 'confirmed';
  }).map(suspect => {
    const filed = alibis.find(entry => entry.suspectId === suspect.id)?.playerConclusion;
    const status = filed?.locked === true ? filed.status : suspect.deductionState?.alibiStatus;
    return { suspect, challenged: status === 'contradicted' };
  });
}

export function syncCrimeBoardSuspects(api, state) {
  if (!state?.currentMission || !api?.getData || !api.board?.loadBoard) return;
  const subjects = getCrimeBoardSuspects(state);
  if (subjects === null) return;
  const data = api.getData();
  const oldCards = data.items.filter(item => !item.createdByPlayer &&
    (item.tags?.includes('suspect') || item.tags?.includes('case-suspect')));
  const oldIds = new Set(oldCards.map(item => item.id));
  const unknownIds = new Set(oldCards.filter(item => item.tags?.includes('unknown')).map(item => item.id));
  const cards = subjects.map(({ suspect, challenged }, index) => ({
    id: `case-suspect-${suspect.id}`, type: 'evidence',
    x: 65 + (index % 2) * 270, y: 130 + Math.floor(index / 2) * 235,
    z: 6, rotation: index % 2 ? 1.8 : -1.8, pinned: false,
    label: suspect.publicProfile?.displayName || suspect.name || 'Suspect file',
    tag: challenged ? 'Alibi challenged' : 'Remaining suspect',
    body: challenged ? 'Alibi challenged in your filed report.' : 'Retained after the Evidence Grid. Alibi review pending.',
    fields: [
      { key: 'Occupation', value: suspect.publicProfile?.occupation || suspect.occupation || 'Unknown role' },
      { key: 'Status', value: challenged ? 'Alibi challenged' : 'Under investigation' }
    ],
    suspectId: suspect.id, tags: ['suspect', 'case-suspect', challenged ? 'alibi-challenged' : 'grid-candidate'],
    discovered: true, createdByPlayer: false, editableByPlayer: false
  }));
  data.items = data.items.filter(item => !oldIds.has(item.id)).concat(cards);
  const validIds = new Set(data.items.map(item => item.id));
  const replacementIds = cards.map(card => card.id);
  const links = [];
  const pairs = new Set();
  const add = link => {
    if (link.from === link.to || !validIds.has(link.from) || !validIds.has(link.to)) return;
    const pair = [link.from, link.to].sort().join('\u0000');
    if (pairs.has(pair)) return;
    pairs.add(pair); links.push(link);
  };
  for (const link of data.links || []) {
    const fromUnknown = unknownIds.has(link.from), toUnknown = unknownIds.has(link.to);
    if (fromUnknown || toUnknown) {
      replacementIds.forEach((id, index) => add({
        ...link, id: `${link.id}-candidate-${index}`,
        from: fromUnknown ? id : link.from, to: toUnknown ? id : link.to
      }));
    } else add(link);
  }
  const mission = data.items.find(item => item.tags?.includes('artifact'));
  if (mission) cards.forEach(card => add({
    id: `link-mission-${card.id}`, from: mission.id, to: card.id,
    fromAnchor: 'left', toAnchor: 'right', color: '#b3131b'
  }));
  data.links = links;
  api.board.loadBoard(data);
}
