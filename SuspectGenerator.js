// ============================================================
// SuspectGenerator.js
// Builds a full 10-person suspect lineup (9 decoys + the case's
// thief pulled from gameState.currentThief) for a given crime city.
// Does NOT mutate the supplied thief object.
// ============================================================

class SuspectGenerator {
  constructor(citysuspectsData) {
    if (!citysuspectsData || typeof citysuspectsData !== 'object' || Array.isArray(citysuspectsData)) {
      throw new Error('SuspectGenerator requires a valid citysuspects data object.');
    }

    this.citysuspects = citysuspectsData;

    this.identityEvidencePool = {
      hair_color: { domain: ['blond', 'black', 'red', 'brown'], k: 4 },
      blood_type: { domain: ['A', 'B', '0', 'AB'], k: 4 },
      biological_sex: { domain: ['M', 'F', 'NB'], k: 3, pNonbinary: 0.10 },
      shoe_size_category: { domain: ['small', 'medium', 'large'], k: 3 },
      race: {
        domain: ['White', 'Black', 'Latino', 'American Indian', 'Asian', 'Native Hawaiian'],
        k: 6
      }
    };

    this.traceEvidencePool = [
      { id: 'fingerprint_fragment', label: 'Partial Fingerprint', minigame: 'FingerprintPuzzleScene', possibleThreads: ['alibi', 'timeline'] },
      { id: 'fabric_fragment', label: 'Fabric Fragment', minigame: 'UVSwatchScene', possibleThreads: ['motive', 'alibi'] },
      { id: 'cctv_footage', label: 'CCTV Footage Still', minigame: 'CCTVScrubberScene', possibleThreads: ['timeline', 'alibi'] },
      { id: 'tool_marks', label: 'Tool Marks', minigame: 'ToolMarkOverlayScene', possibleThreads: ['method'] },
      { id: 'scent_trace_osmology', label: 'Osmology Scent Trace', minigame: 'K9LineupScene', possibleThreads: ['motive', 'method'] },
      { id: 'glass_shards', label: 'Glass Shards', minigame: 'GlassShardPuzzleScene', possibleThreads: [null] }
    ];

    this.P_MATCH = 0.6;
  }

  static randomFrom(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      return null;
    }

    return arr[Math.floor(Math.random() * arr.length)] ?? null;
  }

  static shuffle(arr) {
    if (!Array.isArray(arr)) {
      return [];
    }

    const shuffled = [...arr];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  static sampleUnique(arr, count) {
    if (!Array.isArray(arr) || !Number.isInteger(count) || count <= 0) {
      return [];
    }

    return SuspectGenerator.shuffle(arr).slice(0, count);
  }

  static bernoulli(probability) {
    const p = Number.isFinite(probability)
      ? Phaser.Math.Clamp(probability, 0, 1)
      : 0;

    return Math.random() < p;
  }

  static validStringArray(value) {
    return Array.isArray(value)
      ? value.filter(item => typeof item === 'string' && item.trim().length > 0)
      : [];
  }

  getKnownThiefAttribute(thief, attribute) {
    const knownAttributes = {
      hair_color: typeof thief?.hair === 'string'
        ? thief.hair.toLowerCase()
        : null,
      biological_sex: thief?.gender_code === 'f'
        ? 'F'
        : thief?.gender_code === 'm'
          ? 'M'
          : thief?.gender_code === 'nb'
            ? 'NB'
            : null
    };

    return knownAttributes[attribute] || null;
  }

  pickIdentityEvidence(thief, generatedAttrs) {
    const attributeKeys = Object.keys(this.identityEvidencePool);
    const selectedAttr = SuspectGenerator.randomFrom(attributeKeys);

    if (!selectedAttr) {
      throw new Error('SuspectGenerator has no identity evidence attributes configured.');
    }

    const config = this.identityEvidencePool[selectedAttr];
    const knownValue = this.getKnownThiefAttribute(thief, selectedAttr);

    let thiefValue = knownValue || generatedAttrs[selectedAttr] || null;

    if (!thiefValue) {
      thiefValue = SuspectGenerator.randomFrom(config.domain);
      generatedAttrs[selectedAttr] = thiefValue;
    }

    if (!thiefValue) {
      throw new Error(`Could not generate thief value for identity attribute "${selectedAttr}".`);
    }

    return {
      attribute: selectedAttr,
      config,
      thiefValue
    };
  }

  generateIdentityAttributeForSuspect(selectedAttr, config, thiefValue) {
    if (selectedAttr === 'biological_sex' && SuspectGenerator.bernoulli(config.pNonbinary)) {
      return 'NB';
    }

    if (SuspectGenerator.bernoulli(this.P_MATCH)) {
      return thiefValue;
    }

    const alternatives = config.domain.filter(value => value !== thiefValue);

    return SuspectGenerator.randomFrom(alternatives) || thiefValue;
  }

  generateCosmeticAttribute(attribute) {
    const config = this.identityEvidencePool[attribute];

    if (!config || !Array.isArray(config.domain) || config.domain.length === 0) {
      throw new Error(`Missing domain configuration for identity attribute "${attribute}".`);
    }

    if (attribute === 'biological_sex') {
      if (SuspectGenerator.bernoulli(config.pNonbinary)) {
        return 'NB';
      }

      return SuspectGenerator.randomFrom(['M', 'F']) || 'NB';
    }

    return SuspectGenerator.randomFrom(config.domain);
  }

  buildDecoyPool(cityId, count) {
    const universal = this.citysuspects.universal || {};
    const cityData = this.citysuspects[cityId] || {};

    const femaleNames = [
      ...SuspectGenerator.validStringArray(cityData.first_names_female),
      ...SuspectGenerator.validStringArray(universal.first_names_female)
    ];

    const maleNames = [
      ...SuspectGenerator.validStringArray(cityData.first_names_male),
      ...SuspectGenerator.validStringArray(universal.first_names_male)
    ];

    const neutralNames = [
      ...SuspectGenerator.validStringArray(cityData.first_names_neutral),
      ...SuspectGenerator.validStringArray(universal.first_names_neutral)
    ];

    const lastNames = [
      ...SuspectGenerator.validStringArray(cityData.last_names),
      ...SuspectGenerator.validStringArray(universal.last_names)
    ];

    const occupations = [
      ...SuspectGenerator.validStringArray(cityData.occupations),
      ...SuspectGenerator.validStringArray(universal.occupations)
    ];

    const genderedFirstNames = [
      ...femaleNames.map(name => ({ name, gender_code: 'f' })),
      ...maleNames.map(name => ({ name, gender_code: 'm' })),
      ...neutralNames.map(name => ({ name, gender_code: 'nb' }))
    ];

    if (genderedFirstNames.length < count) {
      throw new Error(`Not enough first names to generate ${count} decoys for city "${cityId}".`);
    }

    if (lastNames.length < count) {
      throw new Error(`Not enough last names to generate ${count} decoys for city "${cityId}".`);
    }

    if (occupations.length < count + 1) {
      throw new Error(`Not enough occupations to generate ${count} decoys and one thief occupation for city "${cityId}".`);
    }

    const sampledFirstNames = SuspectGenerator.sampleUnique(genderedFirstNames, count);
    const sampledLastNames = SuspectGenerator.sampleUnique(lastNames, count);
    const sampledOccupations = SuspectGenerator.sampleUnique(occupations, count + 1);

    const decoys = sampledFirstNames.map((firstName, index) => ({
      id: `decoy_${cityId}_${index}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: `${firstName.name} ${sampledLastNames[index]}`,
      gender_code: firstName.gender_code,
      occupation: sampledOccupations[index]
    }));

    return {
      decoys,
      thiefOccupation: sampledOccupations[count]
    };
  }

  pickTraceEvidence() {
    const selected = SuspectGenerator.sampleUnique(this.traceEvidencePool, 2);

    if (selected.length < 2) {
      throw new Error('SuspectGenerator requires at least two trace evidence entries.');
    }

    return selected.map(trace => ({
      id: trace.id,
      label: trace.label,
      minigame: trace.minigame,
      resolvedThread: SuspectGenerator.randomFrom(trace.possibleThreads)
    }));
  }

  buildThiefAttributes(thief, identityEvidence, generatedAttrs) {
    const attributes = {};

    Object.keys(this.identityEvidencePool).forEach(attribute => {
      if (attribute === identityEvidence.attribute) {
        attributes[attribute] = identityEvidence.thiefValue;
        return;
      }

      const knownValue = this.getKnownThiefAttribute(thief, attribute);

      if (knownValue) {
        attributes[attribute] = knownValue;
        return;
      }

      if (!generatedAttrs[attribute]) {
        generatedAttrs[attribute] = this.generateCosmeticAttribute(attribute);
      }

      attributes[attribute] = generatedAttrs[attribute];
    });

    return attributes;
  }

  generateCaseSuspects(thief, cityId) {
    if (!thief || typeof thief !== 'object' || !thief.id) {
      throw new Error('SuspectGenerator.generateCaseSuspects requires a valid thief object with an id.');
    }

    if (typeof cityId !== 'string' || !cityId.trim()) {
      throw new Error('SuspectGenerator.generateCaseSuspects requires a valid city id.');
    }

    const normalizedCityId = cityId.trim();
    const generatedThiefAttrs = {};
    const identityEvidence = this.pickIdentityEvidence(thief, generatedThiefAttrs);
    const traceEvidence = this.pickTraceEvidence();
    const { decoys, thiefOccupation } = this.buildDecoyPool(normalizedCityId, 9);

    const decoySuspects = decoys.map(decoy => {
      const attributes = {};

      Object.keys(this.identityEvidencePool).forEach(attribute => {
        attributes[attribute] = attribute === identityEvidence.attribute
          ? this.generateIdentityAttributeForSuspect(
            identityEvidence.attribute,
            identityEvidence.config,
            identityEvidence.thiefValue
          )
          : this.generateCosmeticAttribute(attribute);
      });

      return {
        id: decoy.id,
        name: decoy.name,
        occupation: decoy.occupation,
        gender_code: decoy.gender_code,
        is_thief: false,
        attributes
      };
    });

    const thiefSuspect = {
      id: thief.id,
      name: thief.name || 'Unknown Suspect',
      occupation: thief.occupation || thiefOccupation,
      gender_code: thief.gender_code || null,
      is_thief: true,
      attributes: this.buildThiefAttributes(
        thief,
        identityEvidence,
        generatedThiefAttrs
      )
    };

    return {
      cityId: normalizedCityId,
      thief_id: thief.id,
      identity_evidence: {
        attribute: identityEvidence.attribute,
        thief_value: identityEvidence.thiefValue
      },
      trace_evidence: traceEvidence,
      suspects: SuspectGenerator.shuffle([
        ...decoySuspects,
        thiefSuspect
      ])
    };
  }
}

export default SuspectGenerator;