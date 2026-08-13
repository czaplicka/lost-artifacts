import { gameState } from './GameData.js';

class SuspectGenerator {
  constructor(citysuspectsData) {
    if (!citysuspectsData || typeof citysuspectsData !== 'object' || Array.isArray(citysuspectsData)) {
      throw new Error('SuspectGenerator requires a valid citysuspects data object.');
    }

    this.citysuspects = citysuspectsData;

    /*
     * Only one of these becomes the real Crime Lab result for a case.
     * "race" is intentionally not used as forensic elimination evidence.
     */
    this.identityEvidencePool = {
      hair_color: {
        domain: ['blond', 'black', 'red', 'brown'],
        label: 'Hair Analysis',
        minigame: 'HairAnalysisScene',
        clueText: 'Hair analysis narrows the suspect list.'
      },
      blood_type: {
        domain: ['A', 'B', '0', 'AB'],
        label: 'Blood Typing Station',
        minigame: 'BloodAnalysisScene',
        clueText: 'Blood typing narrows the suspect list.'
      },
      biological_sex: {
        domain: ['M', 'F', 'NB'],
        label: 'DNA Profile Station',
        minigame: 'DNAAnalysisScene',
        clueText: 'The DNA profile narrows the suspect list.'
      },
      shoe_size_category: {
        domain: ['small', 'medium', 'large'],
        label: 'Footwear Analysis',
        minigame: 'ShoeprintScene',
        clueText: 'Footwear analysis narrows the suspect list.'
      }
    };

    this.traceEvidencePool = [
      {
        id: 'fingerprint_fragment',
        label: 'Partial Fingerprint',
        minigame: 'FingerprintScene',
        possibleThreads: ['alibi', 'timeline']
      },
      {
        id: 'fabric_fragment',
        label: 'Fabric Fragment',
        minigame: 'FiberAnalysisScene',
        possibleThreads: ['motive', 'alibi']
      },
      {
        id: 'tool_marks',
        label: 'Tool Marks',
        minigame: 'ToolmarkAnalysisScene',
        possibleThreads: ['method', 'timeline']
      },
      {
        id: 'shoeprint',
        label: 'Shoeprint Impression',
        minigame: 'ShoeprintScene',
        possibleThreads: ['method', 'timeline']
      },
      {
        id: 'broken_button',
        label: 'Broken Button',
        minigame: 'GarmentAnalysisScene',
        possibleThreads: ['alibi', 'motive']
      },
      {
        id: 'coffee_residue',
        label: 'Coffee Residue',
        minigame: 'ChemicalAnalysisScene',
        possibleThreads: ['timeline', 'motive']
      }
    ];

    this.skillPool = [
      'Lockpicking',
      'Acrobatics',
      'Disguise',
      'Forgery',
      'Surveillance',
      'Climbing',
      'Safecracking',
      'Electronics',
      'Art history',
      'Museum studies',
      'Investigation',
      'Analysis',
      'Deduction',
      'Driving',
      'First aid',
      'Negotiation',
      'Sleight of hand',
      'Problem-solving'
    ];
  }

  static randomFrom(items) {
    if (!Array.isArray(items) || !items.length) return null;
    return items[Math.floor(Math.random() * items.length)] ?? null;
  }

  static randomInt(min, max) {
    const safeMin = Math.ceil(Math.min(min, max));
    const safeMax = Math.floor(Math.max(min, max));
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
  }

  static shuffle(items) {
    if (!Array.isArray(items)) return [];

    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
  }

  static sampleUnique(items, count) {
    if (!Array.isArray(items) || !Number.isInteger(count) || count <= 0) return [];
    return SuspectGenerator.shuffle(items).slice(0, count);
  }

  static validStringArray(value) {
    if (!Array.isArray(value)) return [];

    return value
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim());
  }

  static normalizeSkill(skill) {
    return String(skill || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  static parseSkills(value) {
    if (Array.isArray(value)) {
      return [...new Set(
        value
          .map((skill) => String(skill || '').trim())
          .filter(Boolean)
      )];
    }

    if (typeof value !== 'string') return [];

    return [...new Set(
      value
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)
    )];
  }

  normalizeCityId(cityId) {
    return String(cityId || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  normalizeGenderCode(person) {
    const value = String(person?.gender_code || person?.gender || '')
      .trim()
      .toLowerCase();

    if (['f', 'female', 'woman'].includes(value)) return 'f';
    if (['m', 'male', 'man'].includes(value)) return 'm';
    if (['nb', 'nonbinary', 'non-binary', 'non binary'].includes(value)) return 'nb';

    return 'nb';
  }

  getKnownThiefAttribute(thief, attribute) {
    const nestedAttributes = thief?.attributes || {};
    const gender = this.normalizeGenderCode(thief);

    const values = {
      hair_color: thief?.hair
        || thief?.hair_color
        || nestedAttributes.hair_color
        || null,

      blood_type: thief?.blood_type
        || thief?.bloodType
        || nestedAttributes.blood_type
        || null,

      biological_sex: gender === 'f'
        ? 'F'
        : gender === 'm'
          ? 'M'
          : 'NB',

      shoe_size_category: thief?.shoe_size_category
        || thief?.shoeSizeCategory
        || nestedAttributes.shoe_size_category
        || null
    };

    const rawValue = values[attribute];

    if (typeof rawValue !== 'string') return null;

    if (attribute === 'hair_color') {
      return rawValue.trim().toLowerCase();
    }

    return rawValue.trim();
  }

  getThiefSkills(thief) {
    const directSkills = SuspectGenerator.parseSkills(thief?.skills);
    const nestedSkills = SuspectGenerator.parseSkills(thief?.attributes?.skills);
    const mergedSkills = [...new Set([...directSkills, ...nestedSkills])];

    const usableSkills = mergedSkills.filter((skill) => skill.length > 0);

    if (usableSkills.length >= 3) {
      return SuspectGenerator.sampleUnique(usableSkills, 3);
    }

    const missingCount = 3 - usableSkills.length;
    const fallbackSkills = SuspectGenerator.sampleUnique(
      this.skillPool.filter((skill) => !usableSkills.includes(skill)),
      missingCount
    );

    return [...usableSkills, ...fallbackSkills];
  }

  getVisibleTraits(thief, attributes) {
    const traits = [];

    if (attributes.hair_color) {
      traits.push(`${attributes.hair_color[0].toUpperCase()}${attributes.hair_color.slice(1)} hair`);
    }

    if (typeof thief?.eyes === 'string' && thief.eyes.trim()) {
      traits.push(`${thief.eyes.trim()} eyes`);
    }

    if (typeof thief?.features === 'string' && thief.features.trim()) {
      traits.push(thief.features.trim());
    }

    if (typeof thief?.accent === 'string' && thief.accent.trim()) {
      traits.push(`${thief.accent.trim()} accent`);
    }

    return traits.slice(0, 3);
  }

  generateCosmeticAttribute(attribute) {
    const config = this.identityEvidencePool[attribute];

    if (!config?.domain?.length) {
      throw new Error(`Missing identity evidence configuration for "${attribute}".`);
    }

    return SuspectGenerator.randomFrom(config.domain);
  }

  buildThiefAttributes(thief, identityEvidence, generatedAttributes) {
    const attributes = {};

    Object.keys(this.identityEvidencePool).forEach((attribute) => {
      const knownValue = this.getKnownThiefAttribute(thief, attribute);

      if (attribute === identityEvidence.attribute) {
        attributes[attribute] = identityEvidence.thiefValue;
        return;
      }

      attributes[attribute] = knownValue
        || generatedAttributes[attribute]
        || this.generateCosmeticAttribute(attribute);

      generatedAttributes[attribute] = attributes[attribute];
    });

    return attributes;
  }

  pickIdentityEvidence(thief, generatedAttributes) {
    const attribute = SuspectGenerator.randomFrom(Object.keys(this.identityEvidencePool));

    if (!attribute) {
      throw new Error('SuspectGenerator has no identity evidence attributes configured.');
    }

    const config = this.identityEvidencePool[attribute];

    const thiefValue = this.getKnownThiefAttribute(thief, attribute)
      || generatedAttributes[attribute]
      || this.generateCosmeticAttribute(attribute);

    generatedAttributes[attribute] = thiefValue;

    return {
      attribute,
      thiefValue,
      ...config
    };
  }

  getNamePools(cityId) {
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

    return {
      femaleNames,
      maleNames,
      neutralNames,
      lastNames,
      occupations
    };
  }

  buildFirstNameEntries(namePools) {
    return [
      ...namePools.femaleNames.map((name) => ({ name, gender_code: 'f' })),
      ...namePools.maleNames.map((name) => ({ name, gender_code: 'm' })),
      ...namePools.neutralNames.map((name) => ({ name, gender_code: 'nb' }))
    ];
  }

  getNamesForGender(namePools, genderCode) {
    if (genderCode === 'f' && namePools.femaleNames.length) return namePools.femaleNames;
    if (genderCode === 'm' && namePools.maleNames.length) return namePools.maleNames;
    if (genderCode === 'nb' && namePools.neutralNames.length) return namePools.neutralNames;

    return [
      ...namePools.femaleNames,
      ...namePools.maleNames,
      ...namePools.neutralNames
    ];
  }

  buildCoverIdentity(cityId, thiefGenderCode, namePools, usedNames = new Set()) {
    const preferredNames = this.getNamesForGender(namePools, thiefGenderCode);
    const availableFirstNames = preferredNames.filter((name) => !usedNames.has(name));
    const firstName = SuspectGenerator.randomFrom(availableFirstNames.length ? availableFirstNames : preferredNames);
    const lastName = SuspectGenerator.randomFrom(namePools.lastNames);
    const occupation = SuspectGenerator.randomFrom(namePools.occupations);

    if (!firstName || !lastName || !occupation) {
      throw new Error(`Not enough cover identity data for city "${cityId}".`);
    }

    return {
      name: `${firstName} ${lastName}`,
      occupation,
      gender_code: thiefGenderCode
    };
  }

  buildDecoyPool(cityId, count, thiefGenderCode) {
    const namePools = this.getNamePools(cityId);
    const firstNameEntries = this.buildFirstNameEntries(namePools);

    if (
      firstNameEntries.length < count
      || namePools.lastNames.length < count
      || namePools.occupations.length < count + 1
    ) {
      throw new Error(`Not enough suspect data to generate ${count} decoys for city "${cityId}".`);
    }

    const sampledFirstNames = SuspectGenerator.sampleUnique(firstNameEntries, count);
    const sampledLastNames = SuspectGenerator.sampleUnique(namePools.lastNames, count);
    const sampledOccupations = SuspectGenerator.sampleUnique(namePools.occupations, count);

    const usedFirstNames = new Set(sampledFirstNames.map((entry) => entry.name));
    const thiefCoverIdentity = this.buildCoverIdentity(
      cityId,
      thiefGenderCode,
      namePools,
      usedFirstNames
    );

    return {
      decoys: sampledFirstNames.map((firstName, index) => ({
        id: `case_${cityId}_decoy_${index + 1}`,
        name: `${firstName.name} ${sampledLastNames[index]}`,
        gender_code: firstName.gender_code,
        occupation: sampledOccupations[index]
      })),
      thiefCoverIdentity
    };
  }

  pickTraceEvidence() {
    const selectedTraces = SuspectGenerator.sampleUnique(this.traceEvidencePool, 2);

    if (selectedTraces.length < 2) {
      throw new Error('SuspectGenerator requires at least two trace evidence entries.');
    }

    return selectedTraces.map((trace, index) => ({
      id: trace.id,
      label: trace.label,
      minigame: trace.minigame,
      clueType: 'trace',
      isRedHerring: true,
      resolvedThread: SuspectGenerator.randomFrom(trace.possibleThreads),
      clueText: index === 0
        ? 'This trace may matter, but its relevance is still unclear.'
        : 'The lab found this trace at the crime scene.'
    }));
  }

  createLabDistribution(decoys, identityEvidence) {
    /*
     * Exactly 4–6 of the 10 suspects are removed by the laboratory result.
     * The thief always matches, therefore 3–5 decoys match the lab trait.
     */
    const labEliminations = SuspectGenerator.randomInt(4, 6);
    const totalLabMatches = 10 - labEliminations;
    const matchingDecoyCount = totalLabMatches - 1;

    const shuffledDecoys = SuspectGenerator.shuffle(decoys);
    const matchingDecoys = shuffledDecoys.slice(0, matchingDecoyCount);
    const excludedDecoys = shuffledDecoys.slice(matchingDecoyCount);

    const nonMatchingValues = identityEvidence.domain.filter(
      (value) => value !== identityEvidence.thiefValue
    );

    const applyIdentityValue = (decoy, value, expectedLabMatch) => ({
      ...decoy,
      attributes: {
        ...decoy.attributes,
        [identityEvidence.attribute]: value
      },
      hiddenProfile: {
        ...decoy.hiddenProfile,
        expectedLabMatch
      }
    });

    return {
      labEliminations,
      totalLabMatches,
      matchingDecoys: matchingDecoys.map((decoy) => (
        applyIdentityValue(decoy, identityEvidence.thiefValue, true)
      )),
      excludedDecoys: excludedDecoys.map((decoy) => (
        applyIdentityValue(
          decoy,
          SuspectGenerator.randomFrom(nonMatchingValues),
          false
        )
      ))
    };
  }

  createHypothesisDistribution(labMatchingDecoys, requiredSkills) {
    /*
     * After lab, 4–6 suspects remain.
     * Hypothesis eliminates 2–3 of those and leaves 2–3 candidates.
     */
    const labSurvivorCount = labMatchingDecoys.length + 1;
    const possibleFinalCounts = [2, 3].filter((count) => (
      count < labSurvivorCount && labSurvivorCount - count >= 2
    ));

    const finalCandidateCount = SuspectGenerator.randomFrom(possibleFinalCounts)
      || Math.max(2, labSurvivorCount - 2);

    const matchingDecoyCount = finalCandidateCount - 1;
    const shuffledDecoys = SuspectGenerator.shuffle(labMatchingDecoys);

    const hypothesisMatches = shuffledDecoys.slice(0, matchingDecoyCount);
    const hypothesisFailures = shuffledDecoys.slice(matchingDecoyCount);

    const buildMatchingSkills = () => {
      const extras = SuspectGenerator.sampleUnique(
        this.skillPool.filter((skill) => !requiredSkills.includes(skill)),
        2
      );

      return [...requiredSkills, ...extras];
    };

    const buildFailingSkills = () => {
      const retainedSkillCount = SuspectGenerator.randomInt(0, Math.max(0, requiredSkills.length - 1));
      const retainedSkills = SuspectGenerator.sampleUnique(requiredSkills, retainedSkillCount);
      const extraSkills = SuspectGenerator.sampleUnique(
        this.skillPool.filter((skill) => !requiredSkills.includes(skill)),
        3
      );

      return [...retainedSkills, ...extraSkills];
    };

    return {
      finalCandidateCount,
      hypothesisEliminations: hypothesisFailures.length,

      hypothesisMatches: hypothesisMatches.map((decoy) => ({
        ...decoy,
        skills: buildMatchingSkills(),
        hiddenProfile: {
          ...decoy.hiddenProfile,
          expectedHypothesisMatch: true
        }
      })),

      hypothesisFailures: hypothesisFailures.map((decoy) => ({
        ...decoy,
        skills: buildFailingSkills(),
        hiddenProfile: {
          ...decoy.hiddenProfile,
          expectedHypothesisMatch: false
        }
      }))
    };
  }

  createBaseDecoyRecord(decoy, identityEvidence) {
    const attributes = {};

    Object.keys(this.identityEvidencePool).forEach((attribute) => {
      attributes[attribute] = attribute === identityEvidence.attribute
        ? null
        : this.generateCosmeticAttribute(attribute);
    });

    const hairColor = attributes.hair_color || 'brown';
    const visibleTraits = [
      `${hairColor[0].toUpperCase()}${hairColor.slice(1)} hair`
    ];

    return {
      ...decoy,
      is_thief: false,
      attributes,
      skills: [],
      publicProfile: {
        name: decoy.name,
        occupation: decoy.occupation,
        genderCode: decoy.gender_code,
        visibleTraits,
        caseConnection: 'Listed in the local access records.'
      },
      restrictedProfile: {
        unlockedFields: [],
        forensicAttributes: {}
      },
      hiddenProfile: {
        isThief: false,
        sourceThiefId: null,
        expectedLabMatch: null,
        expectedHypothesisMatch: null,
        witnessLieTarget: false
      },
      deductionState: {
        labStatus: 'pending',
        hypothesisStatus: 'pending',
        interviewStatus: 'locked',
        alibiStatus: 'locked',
        eliminated: false,
        eliminationReasons: [],
        notesUnlocked: []
      }
    };
  }

  createThiefRecord(thief, coverIdentity, thiefAttributes, thiefSkills, identityEvidence, caseId) {
    return {
      id: `case_${caseId}_suspect_thief`,
      name: coverIdentity.name,
      occupation: coverIdentity.occupation,
      gender_code: coverIdentity.gender_code,
      is_thief: true,
      attributes: thiefAttributes,
      skills: thiefSkills,

      publicProfile: {
        name: coverIdentity.name,
        occupation: coverIdentity.occupation,
        genderCode: coverIdentity.gender_code,
        visibleTraits: this.getVisibleTraits(thief, thiefAttributes),
        caseConnection: 'Listed in the local access records.'
      },

      restrictedProfile: {
        unlockedFields: [],
        forensicAttributes: {}
      },

      hiddenProfile: {
        isThief: true,
        sourceThiefId: thief.id,
        realName: thief.name || null,
        actualSkills: thiefSkills,
        expectedLabMatch: true,
        expectedHypothesisMatch: true,
        witnessLieTarget: true
      },

      deductionState: {
        labStatus: 'pending',
        hypothesisStatus: 'pending',
        interviewStatus: 'locked',
        alibiStatus: 'locked',
        eliminated: false,
        eliminationReasons: [],
        notesUnlocked: []
      }
    };
  }

  prepareCaseState(caseData) {
    if (!caseData || typeof caseData !== 'object') {
      throw new Error('prepareCaseState requires generated case data.');
    }

    gameState.caseSuspects = structuredClone(caseData.suspects);

    gameState.identityEvidence = {
      id: `identity_${caseData.identity_evidence.attribute}`,
      label: caseData.identity_evidence.label,
      minigame: caseData.identity_evidence.minigame,
      attribute: caseData.identity_evidence.attribute,
      thief_value: caseData.identity_evidence.thief_value,
      clueType: 'identity',
      clueText: caseData.identity_evidence.clueText,
      guaranteedEliminations: caseData.identity_evidence.guaranteedEliminations,
      resultUnlocked: false
    };

    gameState.hypothesisEvidence = {
      id: 'hypothesis_skills',
      clueType: 'skills',
      requiredSkills: [...caseData.hypothesis_evidence.requiredSkills],
      guaranteedEliminations: caseData.hypothesis_evidence.guaranteedEliminations,
      resultUnlocked: false
    };

    gameState.traceEvidence = caseData.trace_evidence.map((evidence) => ({ ...evidence }));
    gameState.identityEvidenceResult = null;
    gameState.hypothesisEvidenceResult = null;
    gameState.traceEvidenceResults = [];
    gameState.forensicResults = [];
    gameState.csiLabCompleted = false;
    gameState.excludedSuspects = [];
    gameState.currentCaseId = caseData.caseId;

    gameState.crimeCityProgress ??= {};
    gameState.crimeCityProgress[caseData.caseId] = {
      crimeLabCompleted: false,
      hypothesisCompleted: false,
      suspectInterviewsCompleted: false,
      alibiPhaseUnlocked: false
    };

    return caseData;
  }

  generateCaseSuspects(thief, cityId) {
    if (!thief || typeof thief !== 'object' || !thief.id) {
      throw new Error('SuspectGenerator.generateCaseSuspects requires a valid thief object with an id.');
    }

    if (typeof cityId !== 'string' || !cityId.trim()) {
      throw new Error('SuspectGenerator.generateCaseSuspects requires a valid city id.');
    }

    const normalizedCityId = this.normalizeCityId(cityId);

    const caseId = String(
      gameState.currentMission?.id
      || gameState.currentMission?.caseId
      || `${normalizedCityId}_${thief.id}_${Date.now()}`
    );

    const generatedThiefAttributes = {};
    const identityEvidence = this.pickIdentityEvidence(thief, generatedThiefAttributes);
    const thiefAttributes = this.buildThiefAttributes(
      thief,
      identityEvidence,
      generatedThiefAttributes
    );

    const thiefSkills = this.getThiefSkills(thief);
    const thiefGenderCode = this.normalizeGenderCode(thief);

    const {
      decoys,
      thiefCoverIdentity
    } = this.buildDecoyPool(normalizedCityId, 9, thiefGenderCode);

    const baseDecoys = decoys.map((decoy) => (
      this.createBaseDecoyRecord(decoy, identityEvidence)
    ));

    const labDistribution = this.createLabDistribution(baseDecoys, identityEvidence);

    const hypothesisDistribution = this.createHypothesisDistribution(
      labDistribution.matchingDecoys,
      thiefSkills
    );

    const decoysAfterSkillAssignment = [
      ...hypothesisDistribution.hypothesisMatches,
      ...hypothesisDistribution.hypothesisFailures,
      ...labDistribution.excludedDecoys.map((decoy) => ({
        ...decoy,
        skills: SuspectGenerator.sampleUnique(this.skillPool, 4),
        hiddenProfile: {
          ...decoy.hiddenProfile,
          expectedHypothesisMatch: null
        }
      }))
    ];

    const thiefSuspect = this.createThiefRecord(
      thief,
      thiefCoverIdentity,
      thiefAttributes,
      thiefSkills,
      identityEvidence,
      caseId
    );

    const suspects = SuspectGenerator.shuffle([
      ...decoysAfterSkillAssignment,
      thiefSuspect
    ]);

    const traceEvidence = this.pickTraceEvidence();

    return {
      caseId,
      cityId: normalizedCityId,

      trueThief: {
        sourceThiefId: thief.id,
        caseSuspectId: thiefSuspect.id
      },

      thief_id: thief.id,

      identity_evidence: {
        attribute: identityEvidence.attribute,
        thief_value: identityEvidence.thiefValue,
        label: identityEvidence.label,
        minigame: identityEvidence.minigame,
        clueText: identityEvidence.clueText,
        guaranteedEliminations: labDistribution.labEliminations
      },

      hypothesis_evidence: {
        requiredSkills: thiefSkills,
        guaranteedEliminations: hypothesisDistribution.hypothesisEliminations
      },

      trace_evidence: traceEvidence,

      progression: {
        initialCount: 10,
        afterLabCount: labDistribution.totalLabMatches,
        afterHypothesisCount: hypothesisDistribution.finalCandidateCount,
        afterInterviewsCount: SuspectGenerator.randomInt(2, 3)
      },

      suspects
    };
  }
}

export default SuspectGenerator;