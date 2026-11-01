import { gameState } from '../GameData.js';
import {
  getWitnessClue,
  getClueText
} from '../motiveService.js';
import {
  getPursuitCityContext,
  normalizePursuitCityId
} from '../managers/PursuitCityContext.js';

function toSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

function validText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hash(value) {
  let result = 2166136261;

  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

export class NPCController {
  constructor(
    npcData,
    countryFacts,
    cityId,
    suspect,
    options = {}
  ) {
    this.cityId = normalizePursuitCityId(cityId);

    this.cityData =
      npcData[this.cityId] ||
      npcData.default;

    this.defaultData = npcData.default || {};
    this.usingDefault = !npcData[this.cityId];
    this.countryData = countryFacts?.[this.cityId] || null;
    this.suspect = suspect || {};
    this.shownLines = new Set();

    const context = getPursuitCityContext(
      gameState,
      this.cityId
    );

    const knownRouteCity =
      context.isOnEscapeRoute ||
      context.isCrimeCity;

    this.targetCityId = normalizePursuitCityId(
      knownRouteCity
        ? context.targetCityId
        : options.targetCityId
    );

    if (this.targetCityId === this.cityId) {
      this.targetCityId = null;
    }

    this.targetCountryData =
      countryFacts?.[this.targetCityId] || null;

    this.isCorrectCity = context.isCorrectCity;
    this.isFutureRouteCity = context.isFutureRouteCity;
    this.npcId = options.npcId || null;

    if (!this.cityData) {
      throw new Error(
        `No NPC data or default fallback for city: ${cityId}`
      );
    }
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

    return (template.match(/\{([\w.]+)\}/g) || [])
      .every(placeholder => {
        const value = NPCController.resolvePath(
          placeholder.slice(1, -1),
          context
        );

        return value !== undefined && value !== null;
      });
  }

  static fillTemplate(template, context) {
    return template.replace(
      /\{([\w.]+)\}/g,
      (match, path) => {
        const value = NPCController.resolvePath(
          path,
          context
        );

        return value !== undefined && value !== null
          ? value
          : match;
      }
    );
  }

  _getMotiveWitnessHit() {
    if (!this.isCorrectCity || !this.npcId) return null;

    const motiveId = gameState.caseData?.motiveId;

    if (!motiveId) return null;

    const done = Array.isArray(
      gameState.caseData.motiveStagesDone
    )
      ? gameState.caseData.motiveStagesDone
      : [];

    return getWitnessClue(
      motiveId,
      this.npcId,
      done
    );
  }

  getAvailableTopics() {
    if (!this.isCorrectCity) return [];

    const keys = Object.keys(
      this.cityData.topics || {}
    ).filter(id => {
      if (id === 'travel') {
        return Boolean(this.targetCityId);
      }

      if (id === 'currency') {
        return Boolean(
          this.targetCityId &&
          this.targetCountryData
        );
      }

      return true;
    });

    if (
      this.targetCityId &&
      !keys.includes('travel')
    ) {
      keys.push('travel');
    }

    if (
      this._getMotiveWitnessHit() &&
      !keys.includes('motive')
    ) {
      keys.push('motive');
    }

    return keys;
  }

  askTopic(topicId) {
    if (!this.isCorrectCity) {
      return this.getFalseLeadLine();
    }

    if (topicId === 'travel') {
      return this._askTravelTopic();
    }

    if (topicId === 'motive') {
      return this._askMotiveTopic();
    }

    const pool = this.cityData.topics?.[topicId];

    if (!pool) {
      throw new Error(
        `Unknown topic "${topicId}" for this NPC`
      );
    }

    return Array.isArray(pool)
      ? this._askTemplateTopic(topicId, pool)
      : this._askTraitTopic(topicId, pool);
  }

  _askTraitTopic(topicId, pool) {
    const traitValue = this.suspect[topicId];
    const lines = pool[traitValue];

    if (!lines?.length) {
      return {
        text: `Nothing memorable about their ${topicId}.`,
        isNew: false,
        topicId,
        traitValue
      };
    }

    return {
      text: lines[0],
      isNew: true,
      topicId,
      traitValue
    };
  }

  _askTemplateTopic(topicId, templates) {
    const context =
      topicId === 'currency'
        ? this.targetCountryData
        : this.countryData;

    if (!context) {
      return {
        text: 'Nothing worth mentioning on that subject.',
        isNew: false,
        topicId
      };
    }

    const fillable = templates.filter(template => {
      return NPCController.canFillTemplate(
        template,
        context
      );
    });

    const unseen = fillable.filter(template => {
      return !this.shownLines.has(template);
    });

    if (!unseen.length) {
      return {
        text:
          this.cityData.repeatLines?.[0]?.[1] ||
          'Nothing new on that subject, detective.',
        isNew: false,
        topicId
      };
    }

    const template =
      unseen[Math.floor(Math.random() * unseen.length)];

    this.shownLines.add(template);

    return {
      text: NPCController.fillTemplate(template, context),
      isNew: true,
      topicId,
      ...(topicId === 'currency'
        ? { cityId: this.targetCityId }
        : {})
    };
  }

  _readTravelHints(data) {
    const travelHints = data?.travelHints;

    if (
      !travelHints ||
      !this.targetCityId ||
      typeof travelHints !== 'object'
    ) {
      return [];
    }

    const matchingPools = Object.entries(travelHints)
      .filter(([cityId]) => {
        return (
          normalizePursuitCityId(cityId) ===
          this.targetCityId
        );
      })
      .flatMap(([, pool]) => {
        return Array.isArray(pool) ? pool : [pool];
      });

    const context = this.targetCountryData || {};

    return matchingPools
      .map(raw => {
        return typeof raw === 'string'
          ? raw
          : raw?.text;
      })
      .filter(validText)
      .filter(text => {
        return NPCController.canFillTemplate(
          text,
          context
        );
      })
      .map(text => {
        return NPCController.fillTemplate(
          text.trim(),
          context
        );
      });
  }

  _buildTravelFallbacks() {
    const facts = this.targetCountryData;

    if (!facts || typeof facts !== 'object') {
      return [];
    }

    const lines = [];

    const add = (value, build) => {
      if (validText(value)) {
        lines.push(build(value.trim()));
      }
    };

    add(facts.guidebookNote, value => {
      return (
        `They were reading about ${value}. ` +
        'They asked whether it was worth visiting. ' +
        'Apparently fleeing the country still leaves time for sightseeing.'
      );
    });

    add(facts.cityRiver, value => {
      return (
        `They described their destination using this detail: "${value}". ` +
        'I remember that more clearly than their face.'
      );
    });

    add(facts.classicCar, value => {
      return (
        `They asked whether they could hire ${value} after arriving. ` +
        'I suggested a taxi. Fewer opportunities to explain yourself to a mechanic.'
      );
    });

    add(facts.specialtyDish, value => {
      return (
        `They were looking forward to trying ${value} at their next stop. ` +
        'An unusually detailed lunch plan for someone in such a hurry.'
      );
    });

    add(facts.currency?.name, value => {
      return (
        `They asked where to exchange money for ${value} before leaving. ` +
        'I remember because they tried to negotiate the exchange rate with me.'
      );
    });

    add(facts.callingCode, value => {
      return (
        `They asked how to dial a number beginning with ${value} ` +
        'in the country they were heading to. ' +
        'That part I wrote down.'
      );
    });

    add(facts.flagColors, value => {
      return (
        `They pointed to a flag described as "${value}" ` +
        'and said that was the country they were heading to.'
      );
    });

    return lines;
  }

  _askTravelTopic() {
    if (!this.targetCityId) {
      return {
        text:
          'I did not hear about another destination. ' +
          'There is no onward travel lead from this conversation.',
        isNew: false,
        topicId: 'travel',
        cityId: null
      };
    }

    let hints = this._readTravelHints(this.cityData);

    if (!hints.length) {
      hints = this._readTravelHints(this.defaultData);
    }

    if (!hints.length) {
      hints = this._buildTravelFallbacks();
    }

    hints = [...new Set(hints)];

    if (!hints.length) {
      console.warn(
        '[NPCController] Missing travel hints and target facts.',
        {
          sourceCityId: this.cityId,
          targetCityId: this.targetCityId,
          npcId: this.npcId
        }
      );

      return {
        text:
          'I heard they were moving on, but I cannot identify the destination. ' +
          'Try another witness.',
        isNew: false,
        topicId: 'travel',
        cityId: this.targetCityId
      };
    }

    const unseen = hints.filter(text => {
      return !this.shownLines.has(
        `travel:${this.targetCityId}:${text}`
      );
    });

    const pool = unseen.length ? unseen : hints;

    const offset = hash(
      `${this.cityId}:${this.targetCityId}:${this.npcId || 'witness'}`
    );

    const text = pool[offset % pool.length];

    const lineKey =
      `travel:${this.targetCityId}:${text}`;

    const isNew = !this.shownLines.has(lineKey);

    this.shownLines.add(lineKey);

    return {
      text,
      isNew,
      topicId: 'travel',
      cityId: this.targetCityId
    };
  }

  _askMotiveTopic() {
    const hit = this._getMotiveWitnessHit();

    if (!hit) {
      return {
        text: 'Nothing comes to mind about that, detective.',
        isNew: false,
        topicId: 'motive'
      };
    }

    const motiveId = gameState.caseData.motiveId;

    const text = getClueText(
      motiveId,
      this.npcId,
      hit.clueKey
    );

    if (!text) {
      return {
        text: 'Nothing comes to mind about that, detective.',
        isNew: false,
        topicId: 'motive'
      };
    }

    const done = Array.isArray(
      gameState.caseData.motiveStagesDone
    )
      ? gameState.caseData.motiveStagesDone
      : [];

    gameState.caseData.motiveStagesDone = [
      ...done,
      hit.stage.evidenceId
    ];

    if (hit.stage.boardAnswerUnlocked) {
      gameState.caseData.motiveBoardUnlocked = true;
    }

    gameState.addClue({
      type: 'motive',
      id: hit.stage.evidenceId,
      label: hit.stage.label,
      npcId: this.npcId,
      motiveStrength: hit.stage.motiveStrength
    });

    return {
      text,
      isNew: true,
      topicId: 'motive',
      evidenceId: hit.stage.evidenceId,
      label: hit.stage.label,
      boardAnswerUnlocked: Boolean(
        hit.stage.boardAnswerUnlocked
      )
    };
  }

  getFalseLeadLine() {
    if (this.isFutureRouteCity) {
      return {
        text:
          'You are ahead of the verified trail. ' +
          'Establish the missing stops first; ' +
          'this visit does not advance the case.',
        isNew: false,
        topicId: 'falseLead'
      };
    }

    const pool = Array.isArray(this.cityData.falseLeadLines)
      ? this.cityData.falseLeadLines
      : [];

    const pair =
      pool[Math.floor(Math.random() * pool.length)];

    return {
      text: pair
        ? `${pair[0]} ${pair[1]}`
        : 'Wrong city, detective. No one matching that trail came through here.',
      isNew: false,
      topicId: 'falseLead'
    };
  }

  getRepeatLine() {
    const pool = Array.isArray(this.cityData.repeatLines)
      ? this.cityData.repeatLines
      : [];

    const pair =
      pool[Math.floor(Math.random() * pool.length)];

    return pair
      ? `${pair[0]} ${pair[1]}`
      : 'We already talked, detective.';
  }

  getBanterLine() {
    const pool = Array.isArray(this.cityData.banter)
      ? this.cityData.banter
      : [];

    return pool.length
      ? pool[Math.floor(Math.random() * pool.length)]
      : 'Detective. What can I do for you?';
  }

  toNote(result) {
    if (
      !result?.isNew ||
      result.topicId === 'motive' ||
      result.topicId === 'falseLead'
    ) {
      return null;
    }

    if (
      result.topicId === 'travel' ||
      result.topicId === 'currency'
    ) {
      return {
        id:
          `${result.topicId}_${toSlug(this.cityId)}_` +
          toSlug(result.cityId),
        type: 'travel',
        cityId: result.cityId || null,
        sourceCityId: this.cityId,
        targetCityId: result.cityId || null,
        tag: result.text,
        value: result.cityId || null
      };
    }

    if (result.traitValue !== undefined) {
      return {
        id:
          `suspect_${toSlug(result.topicId)}_` +
          toSlug(result.traitValue),
        type: 'suspect',
        category: result.topicId,
        key: result.traitValue,
        value: result.traitValue
      };
    }

    return {
      id:
        `suspect_${toSlug(result.topicId)}_transaction_` +
        toSlug(this.cityId),
      type: 'suspect',
      category: result.topicId,
      key: 'transaction',
      value: this.cityId
    };
  }
}