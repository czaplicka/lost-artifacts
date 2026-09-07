import { EventBus } from './EventBus.js';

/**
 * CaseDirector
 * Centralny "reżyser" pojedynczej sprawy. Losuje wariant struktury sprawy
 * (na bazie caseModifiers.json) tak, aby te same etapy (hidden objects,
 * lab, filtrowanie podejrzanych, wywiady, mastermind, mieszkanie, podróż)
 * różniły się długością, kolejnością kroków i twistami między sprawami.
 *
 * Sceny NIE hardkodują liczby przedmiotów / gier / slotów - pytają
 * CaseDirector.getStage(name) i renderują się na podstawie zwróconego efektu.
 */
export class CaseDirector {
  /**
   * @param {object} modifiersPool - zawartość caseModifiers.json
   * @param {object} [rngSeed] - opcjonalny generator losowy (np. do testów deterministycznych)
   */
  constructor(modifiersPool, rng = Math.random) {
    this.pool = modifiersPool;
    this.rng = rng;
    this.template = null;
  }

  /**
   * Buduje nowy szablon sprawy.
   * @param {number} caseIndex - numer kolejnej sprawy gracza (0-based), steruje minCaseIndex
   * @param {object} [forcedStages] - opcjonalne wymuszenie konkretnych id modyfikatorów,
   *                                  np. { lab: 'damaged_evidence' } do sprawy fabularnej
   * @returns {object} caseTemplate
   */
  generate(caseIndex, forcedStages = {}) {
    const template = { caseIndex, stages: {} };

    for (const stageName of Object.keys(this.pool)) {
      const candidates = this.pool[stageName].filter(m => caseIndex >= (m.minCaseIndex ?? 0));

      let chosen;
      if (forcedStages[stageName]) {
        chosen = this.pool[stageName].find(m => m.id === forcedStages[stageName]);
      }
      if (!chosen) {
        chosen = this._weightedPick(candidates.length ? candidates : this.pool[stageName]);
      }

      template.stages[stageName] = {
        modifierId: chosen.id,
        ...chosen.effect
      };
    }

    this.template = template;
    EventBus.emit('case-template-generated', template);
    return template;
  }

  /** Zwraca skonfigurowany etap sprawy dla danej sceny, np. getStage('hiddenObjects') */
  getStage(stageName) {
    if (!this.template) {
      throw new Error(`CaseDirector: brak wygenerowanego szablonu - wywołaj generate() przed getStage('${stageName}')`);
    }
    const stage = this.template.stages[stageName];
    if (!stage) {
      console.warn(`CaseDirector: nieznany etap '${stageName}'`);
      return null;
    }
    return stage;
  }

  /** Ustawia gotowy szablon (np. po wczytaniu save'a) zamiast losować od nowa */
  loadTemplate(template) {
    this.template = template;
  }

  serialize() {
    return this.template;
  }

  _weightedPick(list) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('CaseDirector: cannot select a modifier from an empty list.');
  }

  const total = list.reduce(
    (sum, item) => sum + Math.max(0, Number(item.weight) || 0),
    0
  );

  if (total <= 0) {
    console.warn(
      '[CaseDirector] All eligible modifiers have weight 0. ' +
      `Using the first entry: "${list[0].id}".`
    );

    return list[0];
  }

  let roll = this.rng() * total;

  for (const item of list) {
    roll -= Math.max(0, Number(item.weight) || 0);

    if (roll <= 0) {
      return item;
    }
  }

  return list[list.length - 1];
}
}