import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { getDifficultyConfig } from '../DifficultySettings.js';
import { SCORE_CONFIG } from '../config/ScoreConfig.js';
export { SCORE_CONFIG } from '../config/ScoreConfig.js';

const LIMIT = 100000000;
const MAX_HISTORY = 200;
const DIFFICULTIES = ['rookie', 'field', 'master'];
const DEFAULT_SCORES = {
  rookie: [{name:'Nora Finch',points:34800},{name:'Leo Bramble',points:32650},
    {name:'Mina Cole',points:29400},{name:'Tommy Vex',points:25100},{name:'Ada Flint',points:22800}],
  field: [{name:'Czaplicka',points:99999},{name:"Victor 'Shadow' Thorne",points:98450},
    {name:'Elena Vance',points:92100},{name:'Marcus Thorne',points:89750},{name:'Rita Glass',points:84300}],
  master: [{name:"Victor 'Shadow' Thorne",points:128400},{name:'Iris Blackwood',points:121750},
    {name:'Carmen Vale',points:117200},{name:'Dr. Felix Stone',points:111900},{name:'Agent 00-Nope',points:104600}]
};
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clamp = value => Number.isFinite(value) ? Math.max(0, Math.min(LIMIT, Math.floor(value))) : 0;
const labelText = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 80) || 'Score update' : 'Score update';
const difficultyKey = value => DIFFICULTIES.includes(value) ? value : 'field';
function playerName(value) {
  if (typeof value !== 'string') return 'Anonymous';
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} ._'’-]/gu, '').slice(0, 24) || 'Anonymous';
}
function defaults() { return structuredClone(DEFAULT_SCORES); }
function scoreList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(entry => isObject(entry) && typeof entry.name === 'string' && Number.isFinite(entry.points))
    .map(entry => ({name:playerName(entry.name), points:clamp(entry.points),
      ...(typeof entry.date === 'string' ? {date:entry.date.slice(0,40)} : {})}))
    .sort((a,b) => b.points-a.points).slice(0,10);
}
function itemKey(kind, id) {
  if ((typeof id !== 'string' && typeof id !== 'number') || !String(id).trim()) {
    throw new Error(`[ScoreManager] ${kind} requires a stable ID.`);
  }
  return JSON.stringify([kind, String(id)]);
}

export class ScoreManager {
  constructor() {
    this.storageKey = 'detectiveScores';
    this.scoresByDifficulty = this.loadScores();
    this._sessionPoints = this.getCanonicalScore();
  }
  getCanonicalScore() { return clamp(Number(gameState.score)); }
  setCanonicalScore(value) {
    const score = clamp(value);
    gameState.score = score;
    this._sessionPoints = score;
    return score;
  }
  getLedger() {
    const caseData = isObject(gameState.caseData) ? gameState.caseData : {};
    const saved = caseData.scoreLedger;
    if (isObject(saved) && saved.version === 1 && isObject(saved.claimed) && Array.isArray(saved.breakdown)) return saved;
    const ledger = {version:1, claimed:{}, breakdown:[]};
    // Preserve the score of an existing case; do not award old milestones again.
    const manager = gameState.routeManager;
    const route = Array.isArray(manager?.route) ? manager.route : gameState.escapeRoute || [];
    const progress = Number.isInteger(manager?.currentRouteIndex) ? manager.currentRouteIndex : gameState.routeIndex;
    const accepted = manager?.state === 'DONE' ? route.length : Math.max(0, Number(progress) || 0);
    for (const city of route.slice(0, accepted)) ledger.claimed[itemKey('city', city)] = true;
    if (gameState.finalArrestResult) ledger.claimed['arrest:final'] = true;
    if (gameState.reconstructedHeist?.hypothesisConfirmed || gameState.hypothesisEvidenceResult?.success) {
      ledger.claimed['hypothesis:solved'] = true;
    }
    if (['partial','weak'].includes(gameState.reconstructedHeist?.playerTheoryResult)) {
      ledger.claimed['hypothesis:exhausted'] = true;
    }
    gameState.caseData = {...caseData, scoreLedger:ledger};
    return ledger;
  }
  startSession({reset=false} = {}) {
    if (reset) {
      this.setCanonicalScore(0);
      gameState.caseData = {...(gameState.caseData || {}), scoreLedger:{version:1,claimed:{},breakdown:[]}};
    } else this._sessionPoints = this.getCanonicalScore();
    EventBus.emit('scoreChanged', {delta:0,total:this.getSessionPoints(),
      label:reset ? 'New score session started' : 'Score session restored'});
    return this.getSessionPoints();
  }
  getSessionPoints() { return this._sessionPoints = this.getCanonicalScore(); }
  getBreakdown() { return this.getLedger().breakdown.map(entry => ({...entry})); }
  hasScored(key) { return own(this.getLedger().claimed, String(key)); }
  claimOnce(key) {
    const ledger = this.getLedger();
    if (own(ledger.claimed, key)) return false;
    gameState.caseData = {...gameState.caseData, scoreLedger:{...ledger, claimed:{...ledger.claimed,[key]:true}}};
    return true;
  }
  addScoreEvent(points, label='Score update', options={}) { return this._add(points,label,options); }
  addOnce(key, points, label, options={}) {
    if (!Number.isFinite(points)) return this.getSessionPoints();
    if (!this.claimOnce(key)) return this.getSessionPoints();
    return this._add(points,label,{...options,eventKey:key});
  }
  addHiddenObjectScore(points, evidenceId=null) {
    return evidenceId == null ? this._add(points,'Hidden Objects')
      : this.addOnce(itemKey('hidden_object',evidenceId),points,'Hidden Objects');
  }
  addHypothesisScore(attempt) {
    if (!Number.isInteger(attempt) || attempt < 1) throw new Error('[ScoreManager] Invalid hypothesis attempt.');
    const points = attempt === 1 ? SCORE_CONFIG.HYPOTHESIS_FIRST_TRY
      : attempt === 2 ? SCORE_CONFIG.HYPOTHESIS_SECOND_TRY : SCORE_CONFIG.HYPOTHESIS_THIRD_TRY;
    return this.addOnce('hypothesis:solved',points,`Hypothesis solved (attempt ${attempt})`);
  }
  penalizeHypothesisExhausted() {
    return this.addOnce('hypothesis:exhausted',SCORE_CONFIG.HYPOTHESIS_EXHAUSTED_PENALTY,'Three unsuccessful hypothesis attempts');
  }
  addCorrectCityScore(cityId) { return this.addOnce(itemKey('city',cityId),SCORE_CONFIG.CORRECT_CITY,`Correct city: ${cityId}`); }
  penalizeWrongCity(city='unknown city') { return this._add(SCORE_CONFIG.WRONG_CITY_PENALTY,`Wrong city: ${city}`); }
  penalizeNpcInterrogation() { return this.getSessionPoints(); }
  addCorrectArrest() { return this.addOnce('arrest:final',SCORE_CONFIG.CORRECT_ARREST,'Correct arrest'); }
  penalizeWrongArrest() { return this.addOnce('arrest:final',SCORE_CONFIG.WRONG_ARREST_PENALTY,'Wrong arrest'); }
  addCorrectWarrant() { return this.addOnce('warrant:correct',SCORE_CONFIG.CORRECT_WARRANT,'Correct arrest warrant'); }
  penalizeWrongWarrant(submissionId=null) {
    return submissionId == null ? this._add(SCORE_CONFIG.WRONG_WARRANT_PENALTY,'Wrong arrest warrant')
      : this.addOnce(itemKey('wrong_warrant',submissionId),SCORE_CONFIG.WRONG_WARRANT_PENALTY,'Wrong arrest warrant');
  }
  addCsiAnalysis(id) { return this.addOnce(itemKey('csi',id),SCORE_CONFIG.CSI_ANALYSIS,'Forensic analysis completed'); }
  addVerifiedAlibi(id) { return this.addOnce(itemKey('alibi',id),SCORE_CONFIG.VERIFIED_ALIBI,'Alibi verified'); }
  addForensicTwinResolution() { return this.addOnce('alibi:twin_resolved',SCORE_CONFIG.FORENSIC_TWIN_RESOLVED,'Forensic twin resolved'); }
  addApartmentEvidence(id) { return this.addOnce(itemKey('apartment',id),SCORE_CONFIG.APARTMENT_EVIDENCE,'Key apartment evidence'); }
  addMotiveEvidence(id) { return this.addOnce(itemKey('motive',id),SCORE_CONFIG.MOTIVE_EVIDENCE,'Motive evidence discovered'); }
  addCourtAnswer(id) { return this.addOnce(itemKey('court_answer',id),SCORE_CONFIG.COURT_ANSWER,'Correct court answer'); }
  addConviction() { return this.addOnce('court:conviction',SCORE_CONFIG.CONVICTION,'Suspect convicted'); }
  addTimeBonus(remaining, total) {
    // Both arguments must use the same time unit. One-argument legacy calls are deliberately ignored.
    if (!Number.isFinite(remaining) || !Number.isFinite(total) || total <= 0) return this.getSessionPoints();
    const ratio = Math.max(0,Math.min(1,remaining/total));
    return this.addOnce('case:time_bonus',Math.round(SCORE_CONFIG.TIME_BONUS_MAX*ratio),'Time remaining bonus',{applyMultiplier:false});
  }
  getDifficultyMultiplier() {
    const value = getDifficultyConfig(gameState.difficulty || 'field')?.scoreMultiplier;
    return Number.isFinite(value) && value > 0 ? value : 1;
  }
  _add(delta, label='Score update', {applyMultiplier=true,eventKey=null}={}) {
    if (!Number.isFinite(delta)) return this.getSessionPoints();
    const rawDelta = Math.max(-LIMIT,Math.min(LIMIT,Math.trunc(delta)));
    if (rawDelta === 0) return this.getSessionPoints();
    const multiplier = rawDelta > 0 && applyMultiplier ? this.getDifficultyMultiplier() : 1;
    const requestedDelta = Math.max(-LIMIT,Math.min(LIMIT,Math.round(rawDelta*multiplier)));
    const before = this.getCanonicalScore();
    const next = this.setCanonicalScore(before+requestedDelta);
    const actualDelta = next-before;
    const entry = {label:labelText(label), rawDelta,requestedDelta,delta:actualDelta,
      multiplier,running:next,time:Date.now(),eventKey};
    const ledger = this.getLedger();
    gameState.caseData = {...gameState.caseData,scoreLedger:{...ledger,
      breakdown:[...ledger.breakdown,entry].slice(-MAX_HISTORY)}};
    EventBus.emit('scoreChanged',{...entry,total:next});
    return next;
  }
  finishMission(agentName) { return this.addScore(agentName,this.getSessionPoints()); }
  loadScores() {
    const result = defaults();
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return result;
      const parsed = JSON.parse(raw);
      if (!isObject(parsed)) return result;
      for (const difficulty of DIFFICULTIES) {
        const entries = scoreList(parsed[difficulty]);
        if (entries.length) result[difficulty] = entries;
      }
    } catch (error) { console.warn('[ScoreManager] Rankings unavailable:',error); }
    return result;
  }
  persistScores() {
    try {
      const data = Object.fromEntries(DIFFICULTIES.map(key => [key,scoreList(this.scoresByDifficulty[key])]));
      localStorage.setItem(this.storageKey,JSON.stringify(data));
      return true;
    } catch (error) { console.warn('[ScoreManager] Cannot save rankings:',error); return false; }
  }
  addScore(name,points,difficulty=gameState.difficulty) {
    const key = difficultyKey(difficulty);
    const entry = {name:playerName(name),points:clamp(points),date:new Date().toLocaleDateString()};
    this.scoresByDifficulty[key] = [...(this.scoresByDifficulty[key] || []),entry]
      .sort((a,b) => b.points-a.points).slice(0,10);
    this.persistScores();
    return {...entry,difficulty:key};
  }
  getScores(difficulty='field') { return (this.scoresByDifficulty[difficultyKey(difficulty)] || []).map(entry=>({...entry})); }
  clearScores() { this.scoresByDifficulty=defaults(); this.persistScores(); }
  saveScore(name,points,difficulty=gameState.difficulty) { return this.addScore(name,points,difficulty); }
}
