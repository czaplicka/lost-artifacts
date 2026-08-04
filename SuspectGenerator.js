// ============================================================
// SuspectGenerator.js
// Builds a full 10-person suspect lineup (9 decoys + the case's
// thief pulled from gameState.currentThief) for a given crime city.
// Does NOT pick the thief itself - the thief comes from GameStateManager.js
// via setupNewGame() -> gameState.currentThief.
// ============================================================

class SuspectGenerator {
  constructor(citysuspectsData) {
    this.citysuspects = citysuspectsData; // loaded citysuspects.json

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

    this.P_MATCH = 0.6; // Bernoulli success probability for the real identity clue
  }

  // ---------- Utility: random helpers ----------
  static randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  static shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  static sampleUnique(arr, n) {
    return SuspectGenerator.shuffle(arr).slice(0, n);
  }

  static bernoulli(p) {
    return Math.random() < p;
  }

  // ---------- Step 1: pick identity evidence attribute + thief ground truth ----------
  // thief = gameState.currentThief (passed in, NOT picked here)
  pickIdentityEvidence(thief) {
    const attrKeys = Object.keys(this.identityEvidencePool);
    const selectedAttr = SuspectGenerator.randomFrom(attrKeys);
    const config = this.identityEvidencePool[selectedAttr];

    // Map thief's known fields (from suspects.json / gameState.currentThief) to our attribute names
    const knownFieldMap = {
      hair_color: thief.hair ? thief.hair.toLowerCase() : null,
      biological_sex: thief.gender_code === 'f' ? 'F' : (thief.gender_code === 'm' ? 'M' : null)
      // blood_type, shoe_size_category, race are NOT in suspects.json -> generate once, persist on thief object
    };

    let thiefValue;
    if (knownFieldMap[selectedAttr]) {
      thiefValue = knownFieldMap[selectedAttr];
    } else if (thief._generatedAttrs && thief._generatedAttrs[selectedAttr]) {
      // reuse if already generated earlier this case (keeps thief consistent across re-renders)
      thiefValue = thief._generatedAttrs[selectedAttr];
    } else {
      thiefValue = SuspectGenerator.randomFrom(config.domain);
      thief._generatedAttrs = thief._generatedAttrs || {};
      thief._generatedAttrs[selectedAttr] = thiefValue;
    }

    return { attribute: selectedAttr, config, thiefValue };
  }

  // ---------- Step 2: generate one decoy's identity attribute (Bernoulli) ----------
  generateIdentityAttributeForSuspect(selectedAttr, config, thiefValue) {
    if (selectedAttr === 'biological_sex') {
      const isNB = SuspectGenerator.bernoulli(config.pNonbinary);
      if (isNB) return 'NB';
    }

    if (SuspectGenerator.bernoulli(this.P_MATCH)) {
      return thiefValue;
    } else {
      const others = config.domain.filter(v => v !== thiefValue);
      return SuspectGenerator.randomFrom(others);
    }
  }

  // ---------- Step 3: generate a cosmetic (non-evidence) attribute ----------
  generateCosmeticAttribute(attrKey) {
    const config = this.identityEvidencePool[attrKey];
    if (attrKey === 'biological_sex') {
      const isNB = SuspectGenerator.bernoulli(config.pNonbinary);
      if (isNB) return 'NB';
      return SuspectGenerator.randomFrom(['M', 'F']);
    }
    return SuspectGenerator.randomFrom(config.domain);
  }

  // ---------- Step 4: build decoy name/occupation pool for a city ----------
  buildDecoyPool(cityId, count) {
    const universal = this.citysuspects.universal;
    const cityData = this.citysuspects[cityId] || {};

    const femaleNames = [...(cityData.first_names_female || []), ...universal.first_names_female];
    const maleNames = [...(cityData.first_names_male || []), ...universal.first_names_male];
    const neutralNames = [...(cityData.first_names_neutral || []), ...universal.first_names_neutral];
    const lastNames = [...(cityData.last_names || []), ...universal.last_names];
    const occupations = [...(cityData.occupations || []), ...universal.occupations];

    const genderedFirstNames = [];
    femaleNames.forEach(n => genderedFirstNames.push({ name: n, gender_code: 'f' }));
    maleNames.forEach(n => genderedFirstNames.push({ name: n, gender_code: 'm' }));
    neutralNames.forEach(n => genderedFirstNames.push({ name: n, gender_code: 'nb' }));

    const sampledFirstNames = SuspectGenerator.sampleUnique(genderedFirstNames, count);
    const sampledLastNames = SuspectGenerator.sampleUnique(lastNames, count);
    const sampledOccupations = SuspectGenerator.sampleUnique(occupations, count + 1); // +1 spare, thief needs one too

    const decoyOccupations = sampledOccupations.slice(0, count);
    const thiefOccupation = sampledOccupations[count]; // reserved, unique from decoys

    const decoys = sampledFirstNames.map((fn, i) => ({
      id: `decoy_${cityId}_${i}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: `${fn.name} ${sampledLastNames[i]}`,
      gender_code: fn.gender_code,
      occupation: decoyOccupations[i]
    }));

    return { decoys, thiefOccupation };
  }

  // ---------- Step 5: pick trace evidence (2 of 6, thread resolved randomly) ----------
  pickTraceEvidence() {
    const selected = SuspectGenerator.sampleUnique(this.traceEvidencePool, 2);
    return selected.map(t => ({
      id: t.id,
      label: t.label,
      minigame: t.minigame,
      resolvedThread: SuspectGenerator.randomFrom(t.possibleThreads)
    }));
  }

  // ---------- Master function: generate full case suspect lineup ----------
  // thief: gameState.currentThief (already selected by GameStateManager.js)
  // cityId: normalized crime city id, e.g. gameState.crimeCityId
  generateCaseSuspects(thief, cityId) {
    if (!thief || !thief.id) {
      throw new Error('SuspectGenerator.generateCaseSuspects requires a valid thief object (gameState.currentThief).');
    }

    const identityEvidence = this.pickIdentityEvidence(thief);
    const traceEvidence = this.pickTraceEvidence();

    const { decoys, thiefOccupation } = this.buildDecoyPool(cityId, 9);

    const attrKeys = Object.keys(this.identityEvidencePool);

    const buildDecoyAttributes = () => {
      const attrs = {};
      attrKeys.forEach(attrKey => {
        if (attrKey === identityEvidence.attribute) {
          attrs[attrKey] = this.generateIdentityAttributeForSuspect(
            identityEvidence.attribute, identityEvidence.config, identityEvidence.thiefValue
          );
        } else {
          attrs[attrKey] = this.generateCosmeticAttribute(attrKey);
        }
      });
      return attrs;
    };

    const buildThiefAttributes = () => {
      const attrs = {};
      attrKeys.forEach(attrKey => {
        if (attrKey === identityEvidence.attribute) {
          attrs[attrKey] = identityEvidence.thiefValue;
        } else if (thief._generatedAttrs && thief._generatedAttrs[attrKey]) {
          attrs[attrKey] = thief._generatedAttrs[attrKey]; // reuse if generated in a previous evidence pick
        } else {
          // known fields from suspects.json take priority (hair, sex); rest generated once and cached
          const known = {
            hair_color: thief.hair ? thief.hair.toLowerCase() : null,
            biological_sex: thief.gender_code === 'f' ? 'F' : (thief.gender_code === 'm' ? 'M' : null)
          };
          const value = known[attrKey] || this.generateCosmeticAttribute(attrKey);
          thief._generatedAttrs = thief._generatedAttrs || {};
          thief._generatedAttrs[attrKey] = value;
          attrs[attrKey] = value;
        }
      });
      return attrs;
    };

    const decoySuspects = decoys.map(d => ({
      id: d.id,
      name: d.name,
      occupation: d.occupation,
      gender_code: d.gender_code,
      is_thief: false,
      attributes: buildDecoyAttributes()
    }));

    // Thief gets a randomly assigned occupation too (not in suspects.json by default)
    const thiefSuspect = {
      id: thief.id,
      name: thief.name,
      occupation: thief.occupation || thiefOccupation, // reuse if already set earlier this case
      gender_code: thief.gender_code,
      is_thief: true,
      attributes: buildThiefAttributes()
    };

    // persist thief's occupation on the original object so it stays consistent
    // across scenes within the same case (city interviews, crime board, etc.)
    thief.occupation = thiefSuspect.occupation;

    const fullLineup = SuspectGenerator.shuffle([...decoySuspects, thiefSuspect]);

    return {
      cityId,
      thief_id: thief.id,
      identity_evidence: {
        attribute: identityEvidence.attribute,
        thief_value: identityEvidence.thiefValue
      },
      trace_evidence: traceEvidence,
      suspects: fullLineup
    };
  }
}

export default SuspectGenerator;