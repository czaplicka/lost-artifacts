import { gameState } from './GameData.js';
import { getDifficultyConfig } from './DifficultySettings.js';

export class HiddenObjectsResolver {
  constructor(sceneContext) { this.scene = sceneContext; }
  resolveIncomingMission(data = {}) {
    return data.mission || data.currentMission || this.scene.scene?.settings?.data?.mission || this.scene.scene?.settings?.data?.currentMission || gameState.currentMission || null;
  }
  resolveSceneId(data = {}, mission = null) {
    const explicit = [data.sceneId, data.returnData?.sceneId, mission?.scene, gameState.currentMission?.scene];
    for (const value of explicit) {
      const id = this.normalizeSceneId(value);
      if (this.isKnownSceneId(id, mission || this.resolveIncomingMission(data))) return id;
    }
    const candidates = [this.getSceneIdFromCity(data.cityId), this.getSceneIdFromCity(data.city), this.getSceneIdFromCity(data.returnData?.cityId), this.getSceneIdFromCity(mission?.cityId), this.getSceneIdFromCity(mission?.city), this.getSceneIdFromCity(gameState.currentMission?.cityId), this.getSceneIdFromCity(gameState.currentMission?.city)];
    for (const value of candidates) { const id = this.normalizeSceneId(value); if (this.isKnownSceneId(id)) return id; }
    return 'louvre';
  }
  resolveCityId(data = {}, mission = null) {
    return data.cityId || data.city || data.returnData?.cityId || mission?.cityId || mission?.city || gameState.currentMission?.cityId || gameState.currentMission?.city || 'paris';
  }
  normalizeSceneId(value) {
    if (!value) return '';
    return String(value).trim().toLowerCase().replace(/\.json$/i, '').replace(/\.jpg$/i, '').replace(/\s+/g, '_');
  }
  isKnownSceneId(sceneId, mission = null) {
    if (!/^[a-z][a-z0-9_]{1,47}$/.test(sceneId)) return false;
    if (['louvre','tower','castle','dockyard','auction_house','havela','tokyo_museum'].includes(sceneId)) return true;
    if (this.normalizeSceneId(mission?.scene) === sceneId || this.normalizeSceneId(gameState.currentMission?.scene) === sceneId) return true;
    const source = this.scene.cache?.json?.get('missions');
    const missions = Array.isArray(source) ? source : source?.missions || [];
    return missions.some(entry => this.normalizeSceneId(entry.scene) === sceneId);
  }
  getSceneIdFromCity(value) {
    if (!value) return '';
    const city = String(value).trim().toLowerCase();
    const current = gameState.currentMission;
    if (current?.scene && [current.cityId,current.city].some(v => typeof v === 'string' && v.trim().toLowerCase() === city)) return this.normalizeSceneId(current.scene);
    const cityToSceneMap = {'paris':'louvre','london':'tower','tower of london':'tower','warsaw':'castle','berlin':'auction_house','new york':'dockyard','new york city':'dockyard','nyc':'dockyard','new delhi':'havela','new dehli':'havela','delhi':'havela','tokyo':'tokyo_museum'};
    return cityToSceneMap[city] || '';
  }
  normalizeSkills(value) {
    if (Array.isArray(value)) return value.map(skill => String(skill).trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map(skill => skill.trim()).filter(Boolean);
    return [];
  }
  getCurrentThiefSkills() {
    const skills = gameState.currentThief?.skills || gameState.currentSuspect?.skills || gameState.currentCulprit?.skills || gameState.currentMission?.suspectSkills || [];
    return this.normalizeSkills(skills).map(skill => skill.toLowerCase());
  }
  hasSharedSkill(itemSkills = [], thiefSkills = []) {
    const a = this.normalizeSkills(itemSkills).map(s => s.toLowerCase()), b = this.normalizeSkills(thiefSkills).map(s => s.toLowerCase());
    if (!a.length || !b.length) return false;
    const set = new Set(b); return a.some(skill => set.has(skill));
  }
  buildCandidatePool(sceneItems, activeCount) {
    const thiefSkills = this.getCurrentThiefSkills(), pool = sceneItems.map(item => ({...item, skills:this.normalizeSkills(item.skills)}));
    const matching = Phaser.Utils.Array.Shuffle(pool.filter(item => this.hasSharedSkill(item.skills, thiefSkills)));
    const correct = matching.slice(0,3).map((item,index) => ({...item,isCorrect:true,correctOrder:index}));
    const rest = Phaser.Utils.Array.Shuffle(pool.filter(item => !correct.some(card => card.id === item.id)));
    const distractors = rest.slice(0,Math.max(0,activeCount-correct.length)).map(item => ({...item,isCorrect:false,correctOrder:-1}));
    return Phaser.Utils.Array.Shuffle([...correct,...distractors]);
  }
  buildReconstructionCardsFromActiveItems(activeItems, cityId, sceneId) {
    const thief = gameState.currentThief || null, thiefSkills = this.normalizeSkills(thief?.skills);
    const difficulty = this.scene.registry?.get('difficulty') || gameState.difficulty || 'field', config = getDifficultyConfig(difficulty);
    const allCards = activeItems.map((item,index) => ({id:item.id,cardId:`card_${index}`,item:item.item||`Clue ${index+1}`,text:item.item||`Clue ${index+1}`,skills:this.normalizeSkills(item.skills),cityId,scene:sceneId,isCorrect:Boolean(item.isCorrect),correctOrder:Number.isInteger(item.correctOrder)?item.correctOrder:-1,clueType:item.clueType||'softclue',heistExplanation:item.heistExplanation||'',trueExplanation:item.trueExplanation||'',isRedHerring:Boolean(item.isRedHerring)}));
    const correct = allCards.filter(card => card.isCorrect).sort((a,b) => a.correctOrder-b.correctOrder).slice(0,3);
    return {cityId,sceneId,thiefId:gameState.currentThiefId||thief?.id||null,thiefName:thief?.name||null,thiefSkills,allCards,correctCardIds:correct.map(card=>card.id),correctSequence:correct.map(card=>card.id),selectedCards:[],playerOrderedCards:[],playerOrderedSentences:[],playerFinalText:'',playerSkills:[],playerTheoryScore:0,playerTheoryResult:null,playerSlotFeedback:[],playerAttemptsLeft:config.reconstructionAttempts};
  }
}
