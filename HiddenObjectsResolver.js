import { gameState } from '../GameData.js';
import { getDifficultyConfig } from './DifficultySettings.js';

export class HiddenObjectsResolver {
  /**
   * @param {Object} sceneContext - Odniesienie do instancji HiddenObjectsScene
   */
  constructor(sceneContext) {
    this.scene = sceneContext;
  }

  /**
   * Wyciąga aktualną misję z przekazanych danych lub gameState.
   */
  resolveIncomingMission(data = {}) {
    return (
      data.mission ||
      data.currentMission ||
      this.scene.scene?.settings?.data?.mission ||
      this.scene.scene?.settings?.data?.currentMission ||
      gameState.currentMission ||
      null
    );
  }

  /**
   * Ustala identyfikator sceny na podstawie danych wejściowych i misji.
   */
  resolveSceneId(data = {}, mission = null) {
    const candidates = [
      data.sceneId,
      data.returnData?.sceneId,
      mission?.scene,
      gameState.currentMission?.scene,
      this.getSceneIdFromCity(data.cityId),
      this.getSceneIdFromCity(data.city),
      this.getSceneIdFromCity(data.returnData?.cityId),
      this.getSceneIdFromCity(mission?.cityId),
      this.getSceneIdFromCity(mission?.city),
      this.getSceneIdFromCity(gameState.currentMission?.cityId),
      this.getSceneIdFromCity(gameState.currentMission?.city)
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeSceneId(candidate);
      if (this.isKnownSceneId(normalized)) {
        return normalized;
      }
    }

    return 'louvre';
  }

  /**
   * Ustala identyfikator miasta.
   */
  resolveCityId(data = {}, mission = null) {
    return (
      data.cityId ||
      data.city ||
      data.returnData?.cityId ||
      mission?.cityId ||
      mission?.city ||
      gameState.currentMission?.cityId ||
      gameState.currentMission?.city ||
      'paris'
    );
  }

  /**
   * Standaryzuje nazwę id sceny (usuwa rozszerzenia, spacje, zamienia na lowercase).
   */
  normalizeSceneId(value) {
    if (!value) return '';

    return String(value)
      .trim()
      .toLowerCase()
      .replace(/\.json$/i, '')
      .replace(/\.jpg$/i, '')
      .replace(/\s+/g, '_');
  }

  /**
   * Sprawdza, czy id sceny znajduje się na liście znanych scen.
   */
  isKnownSceneId(sceneId) {
    return [
      'louvre',
      'tower',
      'castle',
      'dockyard',
      'auction_house',
      'havela'
    ].includes(sceneId);
  }

  /**
   * Mapuje nazwę miasta na odpowiadające mu id sceny.
   */
  getSceneIdFromCity(value) {
    if (!value) return '';

    const city = String(value).trim().toLowerCase();

    const cityToSceneMap = {
      'paris': 'louvre',
      'london': 'tower',
      'tower of london': 'tower',
      'warsaw': 'castle',
      'berlin': 'auction_house',
      'new york': 'dockyard',
      'new york city': 'dockyard',
      'nyc': 'dockyard',
      'new delhi': 'havela',
      'new dehli': 'havela',
      'delhi': 'havela'
    };

    return cityToSceneMap[city] || '';
  }

  /**
   * Standaryzuje umiejętności do postaci tablicy ciągów znaków.
   */
  normalizeSkills(value) {
    if (Array.isArray(value)) {
      return value.map(skill => String(skill).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value.split(',').map(skill => skill.trim()).filter(Boolean);
    }

    return [];
  }

  /**
   * Pobiera listy umiejętności aktualnego podejrzanego/złodzieja z gameState.
   */
  getCurrentThiefSkills() {
    const thiefSkills =
      gameState.currentThief?.skills ||
      gameState.currentSuspect?.skills ||
      gameState.currentCulprit?.skills ||
      gameState.currentMission?.suspectSkills ||
      [];

    return this.normalizeSkills(thiefSkills).map(skill => skill.toLowerCase());
  }

  /**
   * Sprawdza, czy obiekt posiada przynajmniej jedną umiejętność wspólną ze złodziejem.
   */
  hasSharedSkill(itemSkills = [], thiefSkills = []) {
    const normalizedItemSkills = this.normalizeSkills(itemSkills).map(skill => skill.toLowerCase());
    const normalizedThiefSkills = this.normalizeSkills(thiefSkills).map(skill => skill.toLowerCase());

    if (!normalizedItemSkills.length || !normalizedThiefSkills.length) {
      return false;
    }

    const thiefSkillSet = new Set(normalizedThiefSkills);
    return normalizedItemSkills.some(skill => thiefSkillSet.has(skill));
  }

  /**
   * Buduje pulę obiektów – dobiera poprawne poszlaki (pasujące do umiejętności) oraz "myłki" (distractors).
   */
  buildCandidatePool(sceneItems, activeCount) {
    const thiefSkills = this.getCurrentThiefSkills();

    const pool = sceneItems.map(item => ({
      ...item,
      skills: this.normalizeSkills(item.skills),
    }));

    const matching = Phaser.Utils.Array.Shuffle(
      pool.filter(item => this.hasSharedSkill(item.skills, thiefSkills)),
    );

    const correct = matching.slice(0, 3).map((item, index) => ({
      ...item,
      isCorrect: true,
      correctOrder: index,
    }));

    const rest = Phaser.Utils.Array.Shuffle(
      pool.filter(item => !correct.some(card => card.id === item.id)),
    );

    const distractorCount = Math.max(
      0,
      activeCount - correct.length,
    );

    const distractors = rest.slice(0, distractorCount).map(item => ({
      ...item,
      isCorrect: false,
      correctOrder: -1,
    }));

    return Phaser.Utils.Array.Shuffle([
      ...correct,
      ...distractors,
    ]);
  }

  /**
   * Generuje strukturę danych potrzebną do późniejszej rekonstrukcji kradzieży na Crime Boardzie.
   */
  buildReconstructionCardsFromActiveItems(activeItems, cityId, sceneId) {
    const thief = gameState.currentThief || null;

    const thiefSkills = this.normalizeSkills(
      thief?.skills,
    );

    const difficulty = this.scene.registry?.get('difficulty')
      || gameState.difficulty
      || 'field';

    const difficultyConfig = getDifficultyConfig(difficulty);

    const allCards = activeItems.map((item, index) => ({
      id: item.id,
      cardId: `card_${index}`,
      item: item.item || `Clue ${index + 1}`,
      text: item.item || `Clue ${index + 1}`,
      skills: this.normalizeSkills(item.skills),
      cityId: cityId,
      scene: sceneId,
      isCorrect: Boolean(item.isCorrect),
      correctOrder: Number.isInteger(item.correctOrder)
        ? item.correctOrder
        : -1,
      clueType: item.clueType || 'softclue',
      heistExplanation: item.heistExplanation || '',
      trueExplanation: item.trueExplanation || '',
      isRedHerring: Boolean(item.isRedHerring),
    }));

    const correctCards = allCards
      .filter(card => card.isCorrect)
      .sort((a, b) => a.correctOrder - b.correctOrder)
      .slice(0, 3);

    return {
      cityId: cityId,
      sceneId: sceneId,
      thiefId: gameState.currentThiefId || thief?.id || null,
      thiefName: thief?.name || null,
      thiefSkills,
      allCards,
      correctCardIds: correctCards.map(card => card.id),
      correctSequence: correctCards.map(card => card.id),
      selectedCards: [],
      playerOrderedCards: [],
      playerOrderedSentences: [],
      playerFinalText: '',
      playerSkills: [],
      playerTheoryScore: 0,
      playerTheoryResult: null,
      playerSlotFeedback: [],
      playerAttemptsLeft: difficultyConfig.reconstructionAttempts,
    };
  }
}