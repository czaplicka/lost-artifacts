/**
 * NPCController.js
 *
 * ONE shared controller for every crime-city NPC (banker, fence, maid,
 * parkingowy, restauratorka, police, stewardessa, bum...). It works with
 * any NPC data file that follows the shape established for bankerClues:
 *
 * {
 *   "someClues": {
 *     "locationVariants": {
 *       "default": { "banter": [...], "topics": {...}, "repeatLines": [...], "falseLeadLines": [...] },
 *       "london":  { "banter": [...], "topics": {...}, "repeatLines": [...], "falseLeadLines": [...] },
 *       ...
 *     }
 *   }
 * }
 *
 * Inside "topics", each key is auto-classified by its shape:
 *   - a plain object (e.g. { "Scar": [...], "Beard": [...] })  -> trait lookup,
 *     resolved using suspect[topicId] (used for "features", "accent", etc.)
 *   - an array of template strings (e.g. ["... {currency.name} ..."])  -> filled
 *     from countryFacts using the same placeholder syntax everywhere else.
 *
 * This means a single class serves every NPC role - only the JSON data
 * differs.
 */

export class NPCController {
  /**
   * @param {Object} npcData      the locationVariants object for one NPC
   *                              (e.g. bankerClues.bankerClues.locationVariants,
   *                              or fenceClues.fenceClues.locationVariants)
   * @param {Object} countryFacts parsed countryFacts_all.json
   * @param {string} cityId       the actual crime city for this playthrough
   * @param {Object} suspect      the currently displayed suspect's traits,
   *                              e.g. { features: "Scar", accent: "Polish" }
   */
  constructor(npcData, countryFacts, cityId, suspect) {
    this.cityData = npcData[cityId] || npcData.default;
    this.usingDefault = !npcData[cityId];
    this.countryData = countryFacts[cityId];
    this.suspect = suspect;
    this.shownLines = new Set();

    if (!this.cityData) {
      throw new Error(`No NPC data and no "default" fallback found (city: "${cityId}")`);
    }
    if (!this.countryData) {
      throw new Error(`No country facts for city "${cityId}" - add an entry to countryFacts_all.json`);
    }
  }

  static resolvePath(path, data) {
    const parts = path.split(".");
    let value = data;
    for (const part of parts) {
      if (value == null) return undefined;
      value = value[part];
    }
    return value;
  }

  static canFillTemplate(template, context) {
    const placeholders = template.match(/\{([\w.]+)\}/g) || [];
    return placeholders.every((p) => {
      const value = CrimeCityNPCController.resolvePath(p.slice(1, -1), context);
      return value !== undefined && value !== null;
    });
  }

  static fillTemplate(template, context) {
    return template.replace(/\{([\w.]+)\}/g, (match, path) => {
      const value = CrimeCityNPCController.resolvePath(path, context);
      return value !== undefined && value !== null ? value : match;
    });
  }

  /** List of topics available for this NPC, so the UI can build buttons. */
  getAvailableTopics() {
    return Object.keys(this.cityData.topics);
  }

  /**
   * Ask about any topic - the controller figures out whether it's a
   * trait-lookup topic (like "features"/"accent") or a template topic
   * (like "currency") based on the data shape, and handles it accordingly.
   */
  askTopic(topicId) {
    const pool = this.cityData.topics[topicId];
    if (!pool) {
      throw new Error(`Unknown topic "${topicId}" for this NPC`);
    }

    if (Array.isArray(pool)) {
      return this._askTemplateTopic(topicId, pool);
    }
    return this._askTraitTopic(topicId, pool);
  }

  _askTraitTopic(topicId, traitPool) {
    const traitValue = this.suspect[topicId];
    const lines = traitPool[traitValue];
    if (!lines || lines.length === 0) {
      return { text: `Nothing memorable about their ${topicId}.`, isNew: false, topicId, traitValue };
    }
    return { text: lines[0], isNew: true, topicId, traitValue };
  }

  _askTemplateTopic(topicId, templates) {
    const fillable = templates.filter((t) =>
      CrimeCityNPCController.canFillTemplate(t, this.countryData)
    );
    const unseen = fillable.filter((t) => !this.shownLines.has(t));

    if (unseen.length === 0) {
      return { text: this.cityData.repeatLines[0][1], isNew: false, topicId };
    }

    const template = unseen[Math.floor(Math.random() * unseen.length)];
    this.shownLines.add(template);
    const text = CrimeCityNPCController.fillTemplate(template, this.countryData);
    return { text, isNew: true, topicId };
  }

  getBanterLine() {
    const pool = this.cityData.banter;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

/* --------------------------------------------------------------------- *
 * Example usage - identical code path for every NPC role:
 *
 * import bankerData from './data/npc/bankerClues.json' assert { type: 'json' };
 * import fenceData from './data/npc/fenceClues.json' assert { type: 'json' };
 * import countryFacts from './data/countryFacts_all.json' assert { type: 'json' };
 *
 * const banker = new CrimeCityNPCController(
 *   bankerData.bankerClues.locationVariants, countryFacts, "warsaw", suspect
 * );
 * banker.askTopic("accent");    // trait lookup
 * banker.askTopic("currency");  // template fill
 *
 * const fence = new CrimeCityNPCController(
 *   fenceData.fenceClues.locationVariants, countryFacts, "warsaw", suspect
 * );
 * fence.askTopic("features");   // same trait-lookup code path
 * fence.askTopic("art");        // same template-fill code path, different topic name
 * --------------------------------------------------------------------- */