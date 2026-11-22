import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { getDifficultyConfig } from '../DifficultySettings.js';
import { SCORE_CONFIG } from '../config/ScoreConfig.js';
export { SCORE_CONFIG } from '../config/ScoreConfig.js';
const LIMIT=100000000, MAX_HISTORY=200, DIFFICULTIES=['rookie','field','master'];
const text=key=>__dialogueText('managers/ScoreManager.js',key);
const DEFAULT_SCORES={
 rookie:[{name:text('t_eff098cb53f8a2f683d6'),points:34800},{name:text('t_8cf740079ca7782a2d8c'),points:32650},{name:text('t_01628dc43536c2758f98'),points:29400},{name:text('t_5e4130de3f500618a3e1'),points:25100},{name:text('t_98230aef3332dd76ff44'),points:22800}],
 field:[{name:text('t_a2b787b1a0d1764d7b92'),points:99999},{name:text('t_ad97e3f50582ca72c928'),points:98450},{name:text('t_c6616c41c32b6551f3de'),points:92100},{name:text('t_b9c5ac557bd6424668a4'),points:89750},{name:text('t_a4a79733346c3226aad8'),points:84300}],
 master:[{name:text('t_ad97e3f50582ca72c928'),points:128400},{name:text('t_b4cf266e254ceff761ac'),points:121750},{name:text('t_64520cda2d4e64ae247c'),points:117200},{name:text('t_659fc38f5a89719e6b8b'),points:111900},{name:text('t_58dcfb56ed83e83ab216'),points:104600}]
};
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clamp=v=>Number.isFinite(v)?Math.max(0,Math.min(LIMIT,Math.floor(v))):0;
const labelText=v=>typeof v==='string'?v.trim().replace(/\s+/g,' ').slice(0,80)||text('t_a6d5071c29d260024d1a'):text('t_a6d5071c29d260024d1a');
const difficultyKey=v=>DIFFICULTIES.includes(v)?v:'field';
const stableCaseId=v=>typeof v==='string'&&v.trim()?v:typeof v==='number'&&Number.isFinite(v)?String(v):null;
function playerName(v){return typeof v==='string'?v.normalize('NFKC').trim().replace(/\s+/g,' ').replace(/[^\p{L}\p{N} ._'’-]/gu,'').slice(0,24)||text('t_e7a8aa2df7e5d0b233da'):text('t_e7a8aa2df7e5d0b233da');}
function defaults(){return structuredClone(DEFAULT_SCORES);}
function scoreList(v){
 if(!Array.isArray(v))return [];
 return v.filter(e=>isObject(e)&&typeof e.name==='string'&&Number.isFinite(e.points)).map(e=>({name:playerName(e.name),points:clamp(e.points),
 ...(typeof e.date==='string'?{date:e.date.slice(0,40)}:{}),...(stableCaseId(e.caseId)!==null?{caseId:stableCaseId(e.caseId)}:{})})).sort((a,b)=>b.points-a.points).slice(0,10);
}
function itemKey(kind,id){if((typeof id!=='string'&&typeof id!=='number')||!String(id).trim())throw Error(`[ScoreManager] ${kind} requires a stable ID.`);return JSON.stringify([kind,String(id)]);}
export class ScoreManager{
 constructor(){this.storageKey='detectiveScores';this.scoresByDifficulty=this.loadScores();this._sessionPoints=this.getCanonicalScore();}
 getCanonicalScore(){return clamp(Number(gameState.score));}
 setCanonicalScore(v){const n=clamp(v);gameState.score=n;this._sessionPoints=n;return n;}
 getLedger(){
  const caseData=isObject(gameState.caseData)?gameState.caseData:{},saved=caseData.scoreLedger;
  if(isObject(saved)&&saved.version===1&&isObject(saved.claimed)&&Array.isArray(saved.breakdown))return saved;
  const ledger={version:1,claimed:{},breakdown:[]},manager=gameState.routeManager;
  const route=Array.isArray(manager?.route)?manager.route:gameState.escapeRoute||[];
  const progress=Number.isInteger(manager?.currentRouteIndex)?manager.currentRouteIndex:gameState.routeIndex;
  const accepted=manager?.state==='DONE'?route.length:Math.max(0,Number(progress)||0);
  for(const city of route.slice(0,accepted))ledger.claimed[itemKey('city',city)]=true;
  if(gameState.finalArrestResult)ledger.claimed['arrest:final']=true;
  if(gameState.reconstructedHeist?.hypothesisConfirmed||gameState.hypothesisEvidenceResult?.success)ledger.claimed['hypothesis:solved']=true;
  if(['partial','weak'].includes(gameState.reconstructedHeist?.playerTheoryResult))ledger.claimed['hypothesis:exhausted']=true;
  gameState.caseData={...caseData,scoreLedger:ledger};return ledger;
 }
 startSession({reset=false}={}){
  if(reset){this.setCanonicalScore(0);gameState.caseData={...(gameState.caseData||{}),scoreLedger:{version:1,claimed:{},breakdown:[]}};}else this._sessionPoints=this.getCanonicalScore();
  EventBus.emit('scoreChanged',{delta:0,total:this.getSessionPoints(),label:reset?'New score session started':'Score session restored'});return this.getSessionPoints();
 }
 getSessionPoints(){return this._sessionPoints=this.getCanonicalScore();}
 getBreakdown(){return this.getLedger().breakdown.map(e=>({...e}));}
 hasScored(k){return own(this.getLedger().claimed,String(k));}
 claimOnce(k){const ledger=this.getLedger();if(own(ledger.claimed,k))return false;gameState.caseData={...gameState.caseData,scoreLedger:{...ledger,claimed:{...ledger.claimed,[k]:true}}};return true;}
 addScoreEvent(p,l=text('t_a6d5071c29d260024d1a'),o={}){return this._add(p,l,o);}
 addOnce(k,p,l,o={}){if(!Number.isFinite(p)||!this.claimOnce(k))return this.getSessionPoints();return this._add(p,l,{...o,eventKey:k});}
 addHiddenObjectScore(p,id=null){return id==null?this._add(p,text('t_153bd1ad90aff01d9f0c')):this.addOnce(itemKey('hidden_object',id),p,text('t_153bd1ad90aff01d9f0c'));}
 addHypothesisScore(a){if(!Number.isInteger(a)||a<1)throw Error('[ScoreManager] Invalid hypothesis attempt.');const p=a===1?SCORE_CONFIG.HYPOTHESIS_FIRST_TRY:a===2?SCORE_CONFIG.HYPOTHESIS_SECOND_TRY:SCORE_CONFIG.HYPOTHESIS_THIRD_TRY;return this.addOnce('hypothesis:solved',p,`${text('t_95b87a6d8aee685a1834')}${a}${text('t_ba5ec51d07a4ac0e9516')}`);}
 penalizeHypothesisExhausted(){return this.addOnce('hypothesis:exhausted',SCORE_CONFIG.HYPOTHESIS_EXHAUSTED_PENALTY,text('t_fc59879799508728968f'));}
 addCorrectCityScore(id){return this.addOnce(itemKey('city',id),SCORE_CONFIG.CORRECT_CITY,`${text('t_74f3c4c05eea9bff1f61')}${id}`);}
 penalizeWrongCity(city=text('t_a01148546ced76067784')){return this._add(SCORE_CONFIG.WRONG_CITY_PENALTY,`${text('t_b52d58602fba45dda36b')}${city}`);}
 penalizeNpcInterrogation(){return this.getSessionPoints();}
 addCorrectArrest(){return this.addOnce('arrest:final',SCORE_CONFIG.CORRECT_ARREST,text('t_a5aa4f1282af9bd6eb8a'));}
 penalizeWrongArrest(){return this.addOnce('arrest:final',SCORE_CONFIG.WRONG_ARREST_PENALTY,text('t_877168bde446fc078eba'));}
 addCorrectWarrant(){return this.addOnce('warrant:correct',SCORE_CONFIG.CORRECT_WARRANT,text('t_c4ebd2bb06f519f7d164'));}
 penalizeWrongWarrant(id=null){return id==null?this._add(SCORE_CONFIG.WRONG_WARRANT_PENALTY,text('t_0cd46b607a173905d045')):this.addOnce(itemKey('wrong_warrant',id),SCORE_CONFIG.WRONG_WARRANT_PENALTY,text('t_0cd46b607a173905d045'));}
 addCsiAnalysis(id){return this.addOnce(itemKey('csi',id),SCORE_CONFIG.CSI_ANALYSIS,text('t_5f41f1b566e0827238cc'));}
 addVerifiedAlibi(id){return this.addOnce(itemKey('alibi',id),SCORE_CONFIG.VERIFIED_ALIBI,text('t_997c08dcaa4935a4f7fd'));}
 addForensicTwinResolution(){return this.addOnce('alibi:twin_resolved',SCORE_CONFIG.FORENSIC_TWIN_RESOLVED,text('t_bb38bf08508f0e7355bd'));}
 addApartmentEvidence(id){return this.addOnce(itemKey('apartment',id),SCORE_CONFIG.APARTMENT_EVIDENCE,text('t_38d6c4101935749dc757'));}
 addMotiveEvidence(id){return this.addOnce(itemKey('motive',id),SCORE_CONFIG.MOTIVE_EVIDENCE,text('t_2286b5f2aec220d095f2'));}
 addCourtAnswer(id){return this.addOnce(itemKey('court_answer',id),SCORE_CONFIG.COURT_ANSWER,text('t_0539b21a11e3d0b011f6'));}
 addConviction(){return this.addOnce('court:conviction',SCORE_CONFIG.CONVICTION,text('t_24a70cfbfd114bc20561'));}
 addTimeBonus(remaining,total){if(!Number.isFinite(remaining)||!Number.isFinite(total)||total<=0)return this.getSessionPoints();return this.addOnce('case:time_bonus',Math.round(SCORE_CONFIG.TIME_BONUS_MAX*Math.max(0,Math.min(1,remaining/total))),text('t_d29c3ebc165cd3137541'),{applyMultiplier:false});}
 getDifficultyMultiplier(){const v=getDifficultyConfig(gameState.difficulty||'field')?.scoreMultiplier;return Number.isFinite(v)&&v>0?v:1;}
 _add(delta,label=text('t_a6d5071c29d260024d1a'),{applyMultiplier=true,eventKey=null}={}){
  if(!Number.isFinite(delta))return this.getSessionPoints();const rawDelta=Math.max(-LIMIT,Math.min(LIMIT,Math.trunc(delta)));if(rawDelta===0)return this.getSessionPoints();
  const multiplier=rawDelta>0&&applyMultiplier?this.getDifficultyMultiplier():1,requestedDelta=Math.max(-LIMIT,Math.min(LIMIT,Math.round(rawDelta*multiplier)));
  const before=this.getCanonicalScore(),next=this.setCanonicalScore(before+requestedDelta);
  const entry={label:labelText(label),rawDelta,requestedDelta,delta:next-before,multiplier,running:next,time:Date.now(),eventKey};const ledger=this.getLedger();
  gameState.caseData={...gameState.caseData,scoreLedger:{...ledger,breakdown:[...ledger.breakdown,entry].slice(-MAX_HISTORY)}};EventBus.emit('scoreChanged',{...entry,total:next});return next;
 }
 finishMission(name){return this.addScore(name,this.getSessionPoints());}
 loadScores(){const result=defaults();try{const raw=localStorage.getItem(this.storageKey);if(!raw)return result;const parsed=JSON.parse(raw);if(!isObject(parsed))return result;for(const d of DIFFICULTIES){const entries=scoreList(parsed[d]);if(entries.length)result[d]=entries;}}catch(e){console.warn('[ScoreManager] Rankings unavailable:',e);}return result;}
 persistScores(){try{const data=Object.fromEntries(DIFFICULTIES.map(k=>[k,scoreList(this.scoresByDifficulty[k])]));const raw=JSON.stringify(data);localStorage.setItem(this.storageKey,raw);if(localStorage.getItem(this.storageKey)!==raw)throw Error('Ranking verification failed.');return true;}catch(e){console.warn('[ScoreManager] Cannot save rankings:',e);return false;}}
 addScore(name,points,difficulty=gameState.difficulty,{caseId=null}={}){
  const key=difficultyKey(difficulty),id=stableCaseId(caseId);
  if(id!==null){for(const d of DIFFICULTIES){const existing=this.scoresByDifficulty[d]?.find(e=>e.caseId===id);if(existing)return {...existing,difficulty:d,saved:true,duplicate:true};}}
  const entry={name:playerName(name),points:clamp(points),date:new Date().toLocaleDateString(),...(id!==null?{caseId:id}:{})};
  const previous=this.scoresByDifficulty;
  this.scoresByDifficulty={...previous,[key]:[...(previous[key]||[]),entry].sort((a,b)=>b.points-a.points).slice(0,10)};
  const saved=this.persistScores();if(!saved)this.scoresByDifficulty=previous;
  return {...entry,difficulty:key,saved};
 }
 getScores(difficulty='field'){return (this.scoresByDifficulty[difficultyKey(difficulty)]||[]).map(e=>({...e}));}
 clearScores(){const previous=this.scoresByDifficulty;this.scoresByDifficulty=defaults();const saved=this.persistScores();if(!saved)this.scoresByDifficulty=previous;return saved;}
 saveScore(name,points,difficulty=gameState.difficulty,options={}){return this.addScore(name,points,difficulty,options);}
}
