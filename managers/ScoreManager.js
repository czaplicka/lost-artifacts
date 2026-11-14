import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { getDifficultyConfig } from '../DifficultySettings.js';
import { SCORE_CONFIG } from '../config/ScoreConfig.js';
export { SCORE_CONFIG } from '../config/ScoreConfig.js';

const LIMIT = 100000000;
const MAX_HISTORY = 200;
const DIFFICULTIES = ['rookie', 'field', 'master'];
const DEFAULT_SCORES = {
  rookie: [{name:__dialogueText("managers/ScoreManager.js", "t_eff098cb53f8a2f683d6"),points:34800},{name:__dialogueText("managers/ScoreManager.js", "t_8cf740079ca7782a2d8c"),points:32650},
    {name:__dialogueText("managers/ScoreManager.js", "t_01628dc43536c2758f98"),points:29400},{name:__dialogueText("managers/ScoreManager.js", "t_5e4130de3f500618a3e1"),points:25100},{name:__dialogueText("managers/ScoreManager.js", "t_98230aef3332dd76ff44"),points:22800}],
  field: [{name:__dialogueText("managers/ScoreManager.js", "t_a2b787b1a0d1764d7b92"),points:99999},{name:__dialogueText("managers/ScoreManager.js", "t_ad97e3f50582ca72c928"),points:98450},
    {name:__dialogueText("managers/ScoreManager.js", "t_c6616c41c32b6551f3de"),points:92100},{name:__dialogueText("managers/ScoreManager.js", "t_b9c5ac557bd6424668a4"),points:89750},{name:__dialogueText("managers/ScoreManager.js", "t_a4a79733346c3226aad8"),points:84300}],
  master: [{name:__dialogueText("managers/ScoreManager.js", "t_ad97e3f50582ca72c928"),points:128400},{name:__dialogueText("managers/ScoreManager.js", "t_b4cf266e254ceff761ac"),points:121750},
    {name:__dialogueText("managers/ScoreManager.js", "t_64520cda2d4e64ae247c"),points:117200},{name:__dialogueText("managers/ScoreManager.js", "t_659fc38f5a89719e6b8b"),points:111900},{name:__dialogueText("managers/ScoreManager.js", "t_58dcfb56ed83e83ab216"),points:104600}]
};
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clamp = value => Number.isFinite(value) ? Math.max(0, Math.min(LIMIT, Math.floor(value))) : 0;
const labelText = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 80) || __dialogueText("managers/ScoreManager.js", "t_a6d5071c29d260024d1a") : __dialogueText("managers/ScoreManager.js", "t_a6d5071c29d260024d1a");
const difficultyKey = value => DIFFICULTIES.includes(value) ? value : 'field';
function playerName(value) {
  if (typeof value !== 'string') return __dialogueText("managers/ScoreManager.js", "t_e7a8aa2df7e5d0b233da");
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} ._'’-]/gu, '').slice(0, 24) || __dialogueText("managers/ScoreManager.js", "t_e7a8aa2df7e5d0b233da");
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
      label:reset ? __dialogueText("managers/ScoreManager.js", "t_7e7120930e5db362b928") : __dialogueText("managers/ScoreManager.js", "t_fa02db73e0e2135e44b9")});
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
  addScoreEvent(points, label=__dialogueText("managers/ScoreManager.js", "t_a6d5071c29d260024d1a"), options={}) { return this._add(points,label,options); }
  addOnce(key, points, label, options={}) {
    if (!Number.isFinite(points)) return this.getSessionPoints();
    if (!this.claimOnce(key)) return this.getSessionPoints();
    return this._add(points,label,{...options,eventKey:key});
  }
  addHiddenObjectScore(points, evidenceId=null) {
    return evidenceId == null ? this._add(points,__dialogueText("managers/ScoreManager.js", "t_153bd1ad90aff01d9f0c"))
      : this.addOnce(itemKey('hidden_object',evidenceId),points,__dialogueText("managers/ScoreManager.js", "t_153bd1ad90aff01d9f0c"));
  }
  addHypothesisScore(attempt) {
    if (!Number.isInteger(attempt) || attempt < 1) throw new Error('[ScoreManager] Invalid hypothesis attempt.');
    const points = attempt === 1 ? SCORE_CONFIG.HYPOTHESIS_FIRST_TRY
      : attempt === 2 ? SCORE_CONFIG.HYPOTHESIS_SECOND_TRY : SCORE_CONFIG.HYPOTHESIS_THIRD_TRY;
    return this.addOnce('hypothesis:solved',points,`${__dialogueText("managers/ScoreManager.js", "t_95b87a6d8aee685a1834")}${attempt}${__dialogueText("managers/ScoreManager.js", "t_ba5ec51d07a4ac0e9516")}`);
  }
  penalizeHypothesisExhausted() {
    return this.addOnce('hypothesis:exhausted',SCORE_CONFIG.HYPOTHESIS_EXHAUSTED_PENALTY,__dialogueText("managers/ScoreManager.js", "t_fc59879799508728968f"));
  }
  addCorrectCityScore(cityId) { return this.addOnce(itemKey('city',cityId),SCORE_CONFIG.CORRECT_CITY,`${__dialogueText("managers/ScoreManager.js", "t_74f3c4c05eea9bff1f61")}${cityId}`); }
  penalizeWrongCity(city=__dialogueText("managers/ScoreManager.js", "t_a01148546ced76067784")) { return this._add(SCORE_CONFIG.WRONG_CITY_PENALTY,`${__dialogueText("managers/ScoreManager.js", "t_b52d58602fba45dda36b")}${city}`); }
  penalizeNpcInterrogation() { return this.getSessionPoints(); }
  addCorrectArrest() { return this.addOnce('arrest:final',SCORE_CONFIG.CORRECT_ARREST,__dialogueText("managers/ScoreManager.js", "t_a5aa4f1282af9bd6eb8a")); }
  penalizeWrongArrest() { return this.addOnce('arrest:final',SCORE_CONFIG.WRONG_ARREST_PENALTY,__dialogueText("managers/ScoreManager.js", "t_877168bde446fc078eba")); }
  addCorrectWarrant() { return this.addOnce('warrant:correct',SCORE_CONFIG.CORRECT_WARRANT,__dialogueText("managers/ScoreManager.js", "t_c4ebd2bb06f519f7d164")); }
  penalizeWrongWarrant(submissionId=null) {
    return submissionId == null ? this._add(SCORE_CONFIG.WRONG_WARRANT_PENALTY,__dialogueText("managers/ScoreManager.js", "t_0cd46b607a173905d045"))
      : this.addOnce(itemKey('wrong_warrant',submissionId),SCORE_CONFIG.WRONG_WARRANT_PENALTY,__dialogueText("managers/ScoreManager.js", "t_0cd46b607a173905d045"));
  }
  addCsiAnalysis(id) { return this.addOnce(itemKey('csi',id),SCORE_CONFIG.CSI_ANALYSIS,__dialogueText("managers/ScoreManager.js", "t_5f41f1b566e0827238cc")); }
  addVerifiedAlibi(id) { return this.addOnce(itemKey('alibi',id),SCORE_CONFIG.VERIFIED_ALIBI,__dialogueText("managers/ScoreManager.js", "t_997c08dcaa4935a4f7fd")); }
  addForensicTwinResolution() { return this.addOnce('alibi:twin_resolved',SCORE_CONFIG.FORENSIC_TWIN_RESOLVED,__dialogueText("managers/ScoreManager.js", "t_bb38bf08508f0e7355bd")); }
  addApartmentEvidence(id) { return this.addOnce(itemKey('apartment',id),SCORE_CONFIG.APARTMENT_EVIDENCE,__dialogueText("managers/ScoreManager.js", "t_38d6c4101935749dc757")); }
  addMotiveEvidence(id) { return this.addOnce(itemKey('motive',id),SCORE_CONFIG.MOTIVE_EVIDENCE,__dialogueText("managers/ScoreManager.js", "t_2286b5f2aec220d095f2")); }
  addCourtAnswer(id) { return this.addOnce(itemKey('court_answer',id),SCORE_CONFIG.COURT_ANSWER,__dialogueText("managers/ScoreManager.js", "t_0539b21a11e3d0b011f6")); }
  addConviction() { return this.addOnce('court:conviction',SCORE_CONFIG.CONVICTION,__dialogueText("managers/ScoreManager.js", "t_24a70cfbfd114bc20561")); }
  addTimeBonus(remaining, total) {
    // Both arguments must use the same time unit. One-argument legacy calls are deliberately ignored.
    if (!Number.isFinite(remaining) || !Number.isFinite(total) || total <= 0) return this.getSessionPoints();
    const ratio = Math.max(0,Math.min(1,remaining/total));
    return this.addOnce('case:time_bonus',Math.round(SCORE_CONFIG.TIME_BONUS_MAX*ratio),__dialogueText("managers/ScoreManager.js", "t_d29c3ebc165cd3137541"),{applyMultiplier:false});
  }
  getDifficultyMultiplier() {
    const value = getDifficultyConfig(gameState.difficulty || 'field')?.scoreMultiplier;
    return Number.isFinite(value) && value > 0 ? value : 1;
  }
  _add(delta, label=__dialogueText("managers/ScoreManager.js", "t_a6d5071c29d260024d1a"), {applyMultiplier=true,eventKey=null}={}) {
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
