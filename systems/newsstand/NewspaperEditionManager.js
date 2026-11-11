import { SHARED_NEWSPAPER_ARTICLES } from './SharedNewspaperArticles.js';

const clone = value => JSON.parse(JSON.stringify(value));
const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function hash(text) {
  let n = 2166136261;
  for (const ch of String(text)) n = Math.imul(n ^ ch.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function getNewspaperDay(state) {
  for (const value of [state.currentDay, state.day]) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return 1;
}
const MISSION_TEXTS = [
  ['Agency Reviews {artifact} Case', 'Investigators work through the details. Administration works through the stationery.',
   'Mark Agency is reviewing the case concerning {artifact} and {location} in {city}. Staff have been reminded to distinguish established facts from attractive theories. The distinction is considered important, particularly when explaining either to a lawyer. The agency has not authorised the use of red string as a substitute for evidence.'],
  ['{artifact} Case Attracts Questions, Then More Questions', 'The simplest questions continue to require the most careful answers.',
   'The case concerning {artifact} remains a subject of attention at Mark Agency. Officials stress that a convincing explanation must account for the evidence, not merely fit on the investigation board. A proposal to use smaller handwriting has been returned to its author. Enquiries about {location} in {city} should be directed through the proper channels.'],
  ['Paperwork Follows {artifact} Investigation', 'Every important detail deserves a record. Some records apparently deserve another record.',
   'Mark Agency staff handling the {artifact} case have been asked to keep their notes clear and their evidence properly documented. The matter concerns {location} in {city}. An internal reminder explains that a folder marked IMPORTANT does not become more useful when placed inside a second folder marked VERY IMPORTANT.'],
  ['Agency Urges Caution Over {artifact} Theories', 'An interesting possibility is not automatically a useful conclusion.',
   'Mark Agency has reminded personnel discussing the {artifact} case to avoid presenting speculation as fact. The reminder applies equally to meetings, telephone calls and conversations near the coffee machine. Staff examining the circumstances at {location} in {city} are encouraged to ask difficult questions, preferably before announcing that everything is obvious.'],
  ['{artifact} Briefing Keeps Maps on the Table', 'The agency recommends looking at the destination before booking the journey.',
   'The case concerning {artifact} has prompted another reminder about careful fieldwork. Mark Agency expects accurate notes, properly handled evidence and travel claims that can survive basic arithmetic. The reference file identifies {location} in {city}. An employee who asked whether sightseeing counted as reconnaissance has been advised to be considerably more specific.'],
  ['Agency Requests Readable Notes on {artifact}', 'Handwriting is not an encryption method, despite appearances.',
   'Staff reviewing the {artifact} case have been asked to write names and places legibly. The case file concerns {location} in {city}, a fact the agency would prefer not to reconstruct from three ambiguous squiggles. A proposal to employ a handwriting specialist to read the investigators’ own notes is awaiting a cost estimate.'],
  ['{artifact} Case Inspires Reminder About Evidence', 'Please label the bag before having a breakthrough.',
   'Mark Agency has circulated guidance on documenting material associated with the {artifact} case. Staff are reminded that a dramatic pause does not establish provenance. The case references {location} in {city}. Personal shopping, lunch receipts and objects described only as interesting should not be filed together merely because they fit in the same envelope.'],
  ['Agency Keeps {artifact} Discussion Professional', 'Professional, in this instance, means no betting pool.',
   'An internal notice asks employees discussing the {artifact} case to focus on verifiable information. Management has clarified that confidence, seniority and winning the office crossword do not make a theory correct. The case concerns {location} in {city}. The notice ends by requesting that whoever borrowed the noticeboard pins return at least some of them.']
];
const GENERIC_MISSION = MISSION_TEXTS.map(([headline, lead, body], i) => ({
  id: `shared_mission_${i + 1}`, slotId: 'lead', headline, lead, body
}));
function usable(article, context) {
  return ['headline', 'lead', 'body', 'imageCaption'].every(field => {
    const matches = String(article[field] || '').matchAll(/\{([\w.]+)\}/g);
    for (const match of matches) {
      const value = match[1].split('.').reduce((v, key) => v == null ? undefined : v[key], context);
      if (value === undefined || value === null || value === '') return false;
    }
    return true;
  });
}
function fill(article, context) {
  const result = clone(article);
  for (const key of ['headline', 'lead', 'body', 'imageCaption']) {
    if (typeof result[key] !== 'string') continue;
    result[key] = result[key].replace(/\{([\w.]+)\}/g, (match, path) => {
      const value = path.split('.').reduce((v, part) => v == null ? undefined : v[part], context);
      return ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : match;
    });
  }
  return result;
}
function idOf(article, mission = false) {
  return article.id || `${mission ? 'mission' : 'local'}_${hash(article.headline + '|' + article.body)}`;
}
export function getDailyNewspaperEdition(state, cityData, options) {
  const { cityId, context } = options;
  const day = getNewspaperDay(state);
  const old = state.newspaperHistory;
  const history = old?.version === 1 ? clone(old) : { version: 1, seen: {}, editions: {} };
  history.seen ||= {};
  history.editions ||= {};
  const issueKey = `${day}:daily:${cityId}`;
  if (history.editions[issueKey]) return clone(history.editions[issueKey]);
  const active = Boolean(state.isGameActive && context.artifact);
  const mission = state.currentMission || {};
  const recovered = Boolean(mission.artifactRecovered || state.artifactRecovery?.recovered);
  const missionCity = mission.city || context.crimeCity || context.city;
  const eligible = article => usable(article, context);
  const local = (cityData.articles || []).filter(eligible);
  const missionLocal = active && !recovered ? (cityData.missionLead || []).filter(a =>
    eligible(a) && (!a.missionCity || norm(a.missionCity) === norm(missionCity)) &&
    (!a.missionArtifact || norm(a.missionArtifact) === norm(context.artifact))) : [];
  const genericMission = active ? GENERIC_MISSION.filter(eligible) : [];
  const shared = SHARED_NEWSPAPER_ARTICLES.filter(eligible);
  const chosen = new Set();
  const seen = article => history.seen[idOf(article)] || null;
  const unread = list => list.filter(a => !seen(a));
  function pick(preferred, fallback, slot) {
    let candidates = [...preferred, ...fallback].filter(a => !chosen.has(idOf(a)));
    const freshPreferred = unread(preferred).filter(a => !chosen.has(idOf(a)));
    const freshFallback = unread(fallback).filter(a => !chosen.has(idOf(a)));
    if (freshPreferred.length) candidates = freshPreferred;
    else if (freshFallback.length) candidates = freshFallback;
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const da = seen(a)?.day ?? -1, db = seen(b)?.day ?? -1;
      return da - db || hash(`${day}|${cityId}|${slot}|${idOf(a)}`) - hash(`${day}|${cityId}|${slot}|${idOf(b)}`);
    });
    const article = candidates[0];
    const id = idOf(article);
    chosen.add(id);
    history.seen[id] = { day, cityId };
    return { ...fill(article, context), id, slotId: slot };
  }
  const localLead = local.filter(a => a.slotId === 'lead');
  let lead;
  if (missionLocal.length || genericMission.length) lead = pick(missionLocal, genericMission, 'lead');
  else lead = pick(localLead, shared, 'lead');
  const first = pick(local.filter(a => a.slotId === 'secondary_1'), shared, 'secondary_1');
  const second = pick(shared, local.filter(a => a.slotId === 'secondary_2'), 'secondary_2');
  const edition = {
    title: cityData.title, subtitle: cityData.subtitle, editionDay: day,
    missionLead: missionLocal.length || genericMission.length ? [lead].filter(Boolean) : [],
    articles: [lead, first, second].filter(Boolean)
  };
  history.editions[issueKey] = clone(edition);
  state.newspaperHistory = history;
  return clone(edition);
}
