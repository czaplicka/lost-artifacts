import { gameState } from '../GameData.js';
import { getWitnessClue, getClueText } from '../motiveService.js';
import { getPursuitCityContext, normalizePursuitCityId } from '../managers/PursuitCityContext.js';

function toSlug(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
}

export class NPCController {
  constructor(npcData, countryFacts, cityId, suspect, options = {}) {
    this.cityId = normalizePursuitCityId(cityId);
    this.cityData = npcData[this.cityId] || npcData.default;
    this.defaultData = npcData.default || {};
    this.usingDefault = !npcData[this.cityId];
    this.countryData = countryFacts?.[this.cityId] || null;
    this.suspect = suspect || {};
    this.shownLines = new Set();
    const context = getPursuitCityContext(gameState, this.cityId);
    const knownRouteCity = context.isOnEscapeRoute || context.isCrimeCity;
    this.targetCityId = knownRouteCity ? context.targetCityId : normalizePursuitCityId(options.targetCityId);
    if (this.targetCityId === this.cityId) this.targetCityId = null;
    this.targetCountryData = countryFacts?.[this.targetCityId] || null;
    this.isCorrectCity = context.isCorrectCity;
    this.isFutureRouteCity = context.isFutureRouteCity;
    this.npcId = options.npcId || null;
    if (!this.cityData) throw new Error(`No NPC data or default fallback for city: ${cityId}`);
  }

  static resolvePath(path, data) {
    let value = data;
    for (const part of path.split('.')) {
      if (value == null) return undefined;
      value = value[part];
    }
    return value;
  }
  static canFillTemplate(template, context) {
    if (typeof template !== 'string') return false;
    return (template.match(/\{([\w.]+)\}/g) || []).every(p => {
      const value = NPCController.resolvePath(p.slice(1, -1), context);
      return value !== undefined && value !== null;
    });
  }
  static fillTemplate(template, context) {
    return template.replace(/\{([\w.]+)\}/g, (match, path) => {
      const value = NPCController.resolvePath(path, context);
      return value !== undefined && value !== null ? value : match;
    });
  }
  _getMotiveWitnessHit() {
    if (!this.isCorrectCity || !this.npcId) return null;
    const motiveId = gameState.caseData?.motiveId;
    if (!motiveId) return null;
    const done = Array.isArray(gameState.caseData.motiveStagesDone) ? gameState.caseData.motiveStagesDone : [];
    return getWitnessClue(motiveId, this.npcId, done);
  }
  getAvailableTopics() {
    if (!this.isCorrectCity) return [];
    const keys = Object.keys(this.cityData.topics || {}).filter(id => id !== 'currency' || (this.targetCityId && this.targetCountryData));
    if (this.targetCityId && !keys.includes('travel')) keys.push('travel');
    if (this._getMotiveWitnessHit() && !keys.includes('motive')) keys.push('motive');
    return keys;
  }
  askTopic(topicId) {
    if (!this.isCorrectCity) return this.getFalseLeadLine();
    if (topicId === 'travel') return this._askTravelTopic();
    if (topicId === 'motive') return this._askMotiveTopic();
    const pool = this.cityData.topics?.[topicId];
    if (!pool) throw new Error(`Unknown topic "${topicId}" for this NPC`);
    return Array.isArray(pool) ? this._askTemplateTopic(topicId, pool) : this._askTraitTopic(topicId, pool);
  }
  _askTraitTopic(topicId, pool) {
    const traitValue = this.suspect[topicId];
    const lines = pool[traitValue];
    if (!lines?.length) return { text: `Nothing memorable about their ${topicId}.`, isNew: false, topicId, traitValue };
    return { text: lines[0], isNew: true, topicId, traitValue };
  }
  _askTemplateTopic(topicId, templates) {
    const context = topicId === 'currency' ? this.targetCountryData : this.countryData;
    if (!context) return { text: 'Nothing worth mentioning on that subject.', isNew: false, topicId };
    const fillable = templates.filter(t => NPCController.canFillTemplate(t, context));
    const unseen = fillable.filter(t => !this.shownLines.has(t));
    if (!unseen.length) return {
      text: this.cityData.repeatLines?.[0]?.[1] || 'Nothing new on that subject, detective.',
      isNew: false, topicId
    };
    const template = unseen[Math.floor(Math.random() * unseen.length)];
    this.shownLines.add(template);
    return { text: NPCController.fillTemplate(template, context), isNew: true, topicId,
      ...(topicId === 'currency' ? { cityId: this.targetCityId } : {}) };
  }
  _askTravelTopic() {
    const pool = this.cityData.travelHints?.[this.targetCityId] || this.defaultData.travelHints?.[this.targetCityId];
    const hints = Array.isArray(pool) ? pool : [];
    if (!hints.length) return {
      text: 'They mentioned travel, but not clearly enough to be useful.', isNew: false,
      topicId: 'travel', cityId: this.targetCityId
    };
    const raw = hints[Math.floor(Math.random() * hints.length)];
    const text = typeof raw === 'string' ? raw : raw?.text;
    return { text: text || 'They mentioned travel, but not clearly enough to be useful.',
      isNew: Boolean(text), topicId: 'travel', cityId: this.targetCityId };
  }
  _askMotiveTopic() {
    const hit = this._getMotiveWitnessHit();
    if (!hit) return { text: 'Nothing comes to mind about that, detective.', isNew: false, topicId: 'motive' };
    const motiveId = gameState.caseData.motiveId;
    const text = getClueText(motiveId, this.npcId, hit.clueKey);
    if (!text) return { text: 'Nothing comes to mind about that, detective.', isNew: false, topicId: 'motive' };
    const done = Array.isArray(gameState.caseData.motiveStagesDone) ? gameState.caseData.motiveStagesDone : [];
    gameState.caseData.motiveStagesDone = [...done, hit.stage.evidenceId];
    if (hit.stage.boardAnswerUnlocked) gameState.caseData.motiveBoardUnlocked = true;
    gameState.addClue({ type: 'motive', id: hit.stage.evidenceId, label: hit.stage.label,
      npcId: this.npcId, motiveStrength: hit.stage.motiveStrength });
    return { text, isNew: true, topicId: 'motive', evidenceId: hit.stage.evidenceId,
      label: hit.stage.label, boardAnswerUnlocked: Boolean(hit.stage.boardAnswerUnlocked) };
  }
  getFalseLeadLine() {
    if (this.isFutureRouteCity) return {
      text: 'You are ahead of the verified trail. Establish the missing stops first; this visit does not advance the case.',
      isNew: false, topicId: 'falseLead'
    };
    const pool = Array.isArray(this.cityData.falseLeadLines) ? this.cityData.falseLeadLines : [];
    const pair = pool[Math.floor(Math.random() * pool.length)];
    return { text: pair ? `${pair[0]} ${pair[1]}` : 'Wrong city, detective. No one matching that trail came through here.',
      isNew: false, topicId: 'falseLead' };
  }
  getRepeatLine() {
    const pool = Array.isArray(this.cityData.repeatLines) ? this.cityData.repeatLines : [];
    const pair = pool[Math.floor(Math.random() * pool.length)];
    return pair ? `${pair[0]} ${pair[1]}` : 'We already talked, detective.';
  }
  getBanterLine() {
    const pool = Array.isArray(this.cityData.banter) ? this.cityData.banter : [];
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'Detective. What can I do for you?';
  }
  toNote(result) {
    if (!result?.isNew || result.topicId === 'motive' || result.topicId === 'falseLead') return null;
    if (result.topicId === 'travel' || result.topicId === 'currency') return {
      id: `${result.topicId}_${toSlug(this.cityId)}_${toSlug(result.cityId)}`,
      type: 'travel', cityId: result.cityId || null,
      sourceCityId: this.cityId, targetCityId: result.cityId || null,
      tag: result.text, value: result.cityId || null
    };
    if (result.traitValue !== undefined) return {
      id: `suspect_${toSlug(result.topicId)}_${toSlug(result.traitValue)}`,
      type: 'suspect', category: result.topicId, key: result.traitValue, value: result.traitValue
    };
    return { id: `suspect_${toSlug(result.topicId)}_transaction_${toSlug(this.cityId)}`,
      type: 'suspect', category: result.topicId, key: 'transaction', value: this.cityId };
  }
}
