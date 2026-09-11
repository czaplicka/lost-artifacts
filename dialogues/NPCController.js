/**
 * NPCController.js
 *
 * ONE shared controller for every crime-city / escape-city NPC (banker,
 * fence, maid, parkingowy, restauratorka, police, stewardessa, bum...).
 * It works with any NPC data file that follows the shape established for
 * bankerClues:
 *
 * {
 *   "someClues": {
 *     "locationVariants": {
 *       "default": { "banter": [...], "topics": {...}, "travelHints": {...}, "repeatLines": [...], "falseLeadLines": [...] },
 *       "london":  { "banter": [...], "topics": {...}, "travelHints": {...}, "repeatLines": [...], "falseLeadLines": [...] },
 *       ...
 *     }
 *   }
 * }
 *
 * Player-facing topics come from two sources:
 *   - "topics" in the JSON, auto-classified by shape:
 *       - a plain object (e.g. { "Scar": [...], "Beard": [...] })  -> trait
 *         lookup, resolved using suspect[topicId] ("features", "accent"...)
 *       - an array of template strings (e.g. ["... {currency.name} ..."])
 *         -> filled from countryFacts using the {a.b.c} placeholder syntax
 *   - a synthetic "travel" topic, built from "travelHints[targetCityId]"
 *     when this NPC is asked about the next stop on the suspect's route.
 *
 * If the scene marks this encounter as the wrong city (isCorrectCity:
 * false), the controller has no real topics at all - every question just
 * returns a false-lead line, matching the rest of the escape-city design.
 */

export class NPCController {
  /**
   * @param {Object} npcData      the locationVariants object for one NPC
   *                              (e.g. bankerClues.bankerClues.locationVariants)
   * @param {Object} countryFacts parsed countryFacts_all.json
   * @param {string} cityId       the city this encounter takes place in
   * @param {Object} suspect      the currently displayed suspect's traits,
   *                              e.g. { features: "Scar", accent: "Polish" }
   * @param {Object} options
   * @param {string|null} options.targetCityId  next city on the escape route, if any
   * @param {boolean} options.isCorrectCity     false if the suspect never passed through here
   */
  constructor(npcData, countryFacts, cityId, suspect, options = {}) {
    this.cityId = cityId;
    this.cityData = npcData[cityId] || npcData.default;
    this.usingDefault = !npcData[cityId];
    this.countryData = countryFacts?.[cityId] || null;
    this.suspect = suspect || {};
    this.shownLines = new Set();
    this.targetCityId = options.targetCityId || null;
    this.isCorrectCity = options.isCorrectCity !== false;

    if (!this.cityData) {
      throw new Error(`No NPC data and no "default" fallback found (city: "${cityId}")`);
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

  /**
   * List of topics available for this NPC, so the UI can build buttons.
   * Empty when the suspect never actually passed through this city -
   * there is nothing real to ask about, only the false-lead line.
   */
  getAvailableTopics() {
    if (!this.isCorrectCity) return [];

    const topicKeys = Object.keys(this.cityData.topics || {});

    if (this.targetCityId) {
      topicKeys.push('travel');
    }

    return topicKeys;
  }

  /**
   * Ask about any topic - the controller figures out whether it's a
   * trait-lookup topic (like "features"/"accent"), a template topic
   * (like "currency"), or the synthetic "travel" topic, and handles it
   * accordingly. Returns a plain result object; use toNote() separately
   * to turn a fresh answer into a crime-board clue.
   */
  askTopic(topicId) {
    if (!this.isCorrectCity) {
      return this.getFalseLeadLine();
    }

    if (topicId === 'travel') {
      return this._askTravelTopic();
    }

    const pool = this.cityData.topics?.[topicId];
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
    if (!this.countryData) {
      return { text: `Nothing worth mentioning on that subject.`, isNew: false, topicId };
    }

    const fillable = templates.filter((t) =>
      NPCController.canFillTemplate(t, this.countryData)
    );
    const unseen = fillable.filter((t) => !this.shownLines.has(t));

    if (unseen.length === 0) {
      const repeatPair = Array.isArray(this.cityData.repeatLines) ? this.cityData.repeatLines[0] : null;
      return {
        text: repeatPair?.[1] || 'Nothing new on that subject, detective.',
        isNew: false,
        topicId
      };
    }

    const template = unseen[Math.floor(Math.random() * unseen.length)];
    this.shownLines.add(template);
    const text = NPCController.fillTemplate(template, this.countryData);
    return { text, isNew: true, topicId };
  }

  _askTravelTopic() {
    const pool = this.cityData.travelHints?.[this.targetCityId];
    const hints = Array.isArray(pool) ? pool : [];

    if (hints.length === 0) {
      return {
        text: 'They mentioned travel, but not clearly enough to be useful.',
        isNew: false,
        topicId: 'travel',
        cityId: this.targetCityId
      };
    }

    const raw = hints[Math.floor(Math.random() * hints.length)];
    const text = typeof raw === 'string' ? raw : raw?.text;

    return {
      text: text || 'They mentioned travel, but not clearly enough to be useful.',
      isNew: true,
      topicId: 'travel',
      cityId: this.targetCityId
    };
  }

  getFalseLeadLine() {
    const pool = Array.isArray(this.cityData.falseLeadLines) ? this.cityData.falseLeadLines : [];
    const pair = pool[Math.floor(Math.random() * pool.length)];

    return {
      text: pair ? `${pair[0]} ${pair[1]}` : 'Wrong city, detective. No one matching that trail came through here.',
      isNew: false,
      topicId: 'falseLead'
    };
  }

  getRepeatLine() {
    const pool = Array.isArray(this.cityData.repeatLines) ? this.cityData.repeatLines : [];
    const pair = pool[Math.floor(Math.random() * pool.length)];

    return pair ? `${pair[0]} ${pair[1]}` : 'We already talked, detective.';
  }

  getBanterLine() {
    const pool = Array.isArray(this.cityData.banter) ? this.cityData.banter : [];
    if (pool.length === 0) return 'Detective. What can I do for you?';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Converts an askTopic() result into the {type, category, key, value}
   * shape the rest of the game (gameState.cluesCollected, crime board)
   * already expects. Returns null for results that aren't real clues
   * (false leads, repeated/empty answers).
   */
  toNote(result) {
    if (!result || !result.isNew) return null;

    if (result.topicId === 'travel') {
      return {
        type: 'travel',
        cityId: result.cityId || null,
        tag: result.text,
        value: result.cityId || null
      };
    }

    if (result.topicId === 'falseLead') return null;

    if (result.traitValue !== undefined) {
      return {
        type: 'suspect',
        category: result.topicId,
        key: result.traitValue,
        value: result.traitValue
      };
    }

    return {
      type: 'suspect',
      category: result.topicId,
      key: 'transaction',
      value: this.cityId
    };
  }
}