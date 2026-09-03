import { saveGameState } from '../../GameStatePersistence.js';
import {
  normalizeMiniGameKey,
  CSI_MAIN_GAME_POOL
} from './CrimeLabConfig.js';


function cloneEvidence(evidence = {}) {
  try {
    return structuredClone(evidence);
  } catch {
    return JSON.parse(JSON.stringify(evidence));
  }
}


function getEvidenceValue(evidence = {}) {
  return (
    evidence.thief_value ??
    evidence.value ??
    evidence.correctValue ??
    null
  );
}


function hashString(value) {
  const text = String(value || 'default');
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}


function mapGenderCodeToDnaProfile(genderCode) {
  const normalized = String(genderCode || '')
    .trim()
    .toLowerCase();

  if (normalized === 'm' || normalized === 'male') {
    return 'XY';
  }

  if (normalized === 'f' || normalized === 'female') {
    return 'XX';
  }

  return null;
}


/*
 * Deterministic weighted pick only for the fingerprint pattern
 * of a thief that does not have fingerprintPattern already defined.
 *
 * LOOP  ≈ 65%
 * WHORL ≈ 30%
 * ARCH  ≈ 5%
 */
function weightedFingerprintPattern(seed) {
  const roll = (seed % 1000) / 1000;

  if (roll < 0.65) {
    return 'LOOP';
  }

  if (roll < 0.95) {
    return 'WHORL';
  }

  return 'ARCH';
}


export class CrimeLabManager {
  constructor(gameState, cityId) {
    this.gameState = gameState;
    this.cityId = cityId;
  }


  getCaseKey() {
    const mission = this.gameState.currentMission || {};

    return String(
      mission.id ||
      mission.caseId ||
      `${this.cityId}_${mission.artifact || 'default'}`
    );
  }


  getSuspectData() {
    const reconstruction = this.gameState.reconstructedHeist || {};

    const selectedThief =
      this.gameState.selectedThiefProfile ||
      this.gameState.selectedThief ||
      this.gameState.currentThief ||
      this.gameState.thief ||
      {};

    return {
      ...selectedThief,
      ...reconstruction
    };
  }


  ensureCaseForensics() {
    const caseKey = this.getCaseKey();

    this.gameState.caseForensics ??= {};

    this.gameState.caseForensics[caseKey] ??= {
      identityEvidenceResult: null,
      traceEvidenceResults: [],
      forensicResults: [],

      suspectGrid: {
        generated: false,
        completed: false,

        eliminatedSuspectIds: [],
        marksBySuspectId: {},
        clueCards: [],

        score: 0,
        mistakes: 0,
        hintsUsed: 0,
        completedAt: null
      }
    };

    const caseForensics = this.gameState.caseForensics[caseKey];

    caseForensics.identityEvidenceResult ??= null;
    caseForensics.traceEvidenceResults ??= [];
    caseForensics.forensicResults ??= [];

    caseForensics.suspectGrid ??= {
      generated: false,
      completed: false,

      eliminatedSuspectIds: [],
      marksBySuspectId: {},
      clueCards: [],

      score: 0,
      mistakes: 0,
      hintsUsed: 0,
      completedAt: null
    };

    return caseForensics;
  }


  ensureCaseAssignment() {
    const caseKey = this.getCaseKey();

    this.gameState.caseCsiAssignments ??= {};

    this.gameState.caseCsiAssignments[caseKey] ??= {
      identityEvidence: null,
      traceEvidence: []
    };

    return this.gameState.caseCsiAssignments[caseKey];
  }


  isValidIdentityEvidence(evidence) {
    return Boolean(
      evidence &&
      typeof evidence === 'object' &&
      typeof evidence.id === 'string' &&
      evidence.id.length > 0 &&
      typeof evidence.attribute === 'string' &&
      evidence.attribute.length > 0 &&
      getEvidenceValue(evidence) !== null
    );
  }


  isValidTraceEvidence(evidence) {
    return Boolean(
      evidence &&
      typeof evidence === 'object' &&
      typeof evidence.id === 'string' &&
      evidence.id.length > 0 &&
      typeof evidence.label === 'string' &&
      evidence.label.length > 0 &&
      typeof evidence.attribute === 'string' &&
      evidence.attribute.length > 0 &&
      getEvidenceValue(evidence) !== null
    );
  }


  markCrimeLabCompleted() {
    const caseKey = this.getCaseKey();

    this.gameState.crimeCityProgress ??= {};
    this.gameState.crimeCityProgress[caseKey] ??= {};

    this.gameState.crimeCityProgress[caseKey].crimeLabCompleted = true;

    this.gameState.crimeCityProgress[caseKey].crimeLabCompletedAt =
      Date.now();

    this.gameState.csiLabCompleted = true;

    saveGameState();
  }


  normalizeEvidenceConfig(
    evidence = {},
    {
      stationId = null,
      fallbackLabel = 'Forensic Analysis',
      fallbackClueType = 'trace'
    } = {}
  ) {
    const attribute =
      evidence.attribute ||
      evidence.field ||
      evidence.evidenceType ||
      null;

    const correctValue = getEvidenceValue(evidence);

    if (!attribute) {
      throw new Error(
        'CrimeLabManager: forensic evidence is missing "attribute".'
      );
    }

    if (
      correctValue === null ||
      correctValue === undefined ||
      correctValue === ''
    ) {
      throw new Error(
        `CrimeLabManager: forensic evidence "${attribute}" is missing "thief_value".`
      );
    }

    const normalizedEvidence = {
      ...cloneEvidence(evidence),

      id: evidence.id || `${attribute}_evidence`,
      stationId: stationId || evidence.stationId || null,

      attribute,
      evidenceType: attribute,

      thief_value: correctValue,

      source: evidence.source || 'crime_lab',
      label: evidence.label || fallbackLabel,

      clueType:
        evidence.clueType ||
        fallbackClueType,

      clueText:
        evidence.clueText ||
        `Laboratory analysis confirms: ${attribute} = ${correctValue}.`,

      allowedValues: Array.isArray(evidence.allowedValues)
        ? [...evidence.allowedValues]
        : [],

      minigame: normalizeMiniGameKey(
        evidence.minigame,
        attribute
      )
    };

    return {
      ...normalizedEvidence,

      correctValue,

      evidence: cloneEvidence(normalizedEvidence)
    };
  }


  /*
   * This is the important method.
   *
   * The assignment stored under the current caseKey has priority.
   * gameState.identityEvidence is only a convenience reference to
   * the CURRENT case — it must never decide the evidence of a new case.
   */
  ensureIdentityEvidence() {
    const caseKey = this.getCaseKey();
    const assignment = this.ensureCaseAssignment();

    if (this.isValidIdentityEvidence(assignment.identityEvidence)) {
      const evidence = cloneEvidence(assignment.identityEvidence);

      this.gameState.identityEvidence = cloneEvidence(evidence);

      console.log(
        '[CrimeLabManager] Reusing saved identity evidence:',
        {
          caseKey,
          evidenceType: evidence.attribute,
          minigame: evidence.minigame
        }
      );

      return evidence;
    }

    const generatedEvidence =
      this.buildIdentityEvidenceForCase(caseKey);

    if (!this.isValidIdentityEvidence(generatedEvidence)) {
      console.error(
        '[CrimeLabManager] Identity evidence generation failed.',
        {
          caseKey,
          generatedEvidence,
          reconstructedHeist: this.gameState.reconstructedHeist
        }
      );

      throw new Error(
        'CrimeLabManager: could not generate valid identity evidence.'
      );
    }

    const evidence = cloneEvidence(generatedEvidence);

    assignment.identityEvidence = cloneEvidence(evidence);

    this.gameState.identityEvidence = cloneEvidence(evidence);

    saveGameState();

    console.log(
      '[CrimeLabManager] New identity evidence assigned:',
      {
        caseKey,
        evidenceType: evidence.attribute,
        minigame: evidence.minigame
      }
    );

    return evidence;
  }


  getIdentityEvidenceConfig() {
    const identityEvidence = this.ensureIdentityEvidence();

    return this.normalizeEvidenceConfig(
      identityEvidence,
      {
        stationId: 'identity',
        fallbackLabel: 'Identity Evidence Analysis',
        fallbackClueType: 'identity'
      }
    );
  }


  /*
   * Selects one of the four principal forensic games:
   *
   * - hair_color
   * - blood_type
   * - dna_gender
   * - fingerprint_pattern
   *
   * The selected evidence is saved immediately by ensureIdentityEvidence(),
   * so Math.random runs once per case rather than once per lab visit.
   */
  buildIdentityEvidenceForCase(caseKey) {
    const suspectData = this.getSuspectData();

    const suspectSeed = hashString(
      suspectData.id ||
      suspectData.name ||
      caseKey
    );

    const templates = CSI_MAIN_GAME_POOL
      .map((entry) => {
        switch (entry.evidenceType) {
          case 'hair_color': {
            const hairValue =
              suspectData.hair ||
              suspectData.hair_color ||
              null;

            return {
              ...entry,
              id: 'identity_hair_color',
              attribute: 'hair_color',
              thief_value: hairValue,
              allowedValues: [
                'Black',
                'Brown',
                'Blond',
                'Red',
                'Grey',
                'White',
                'Auburn'
              ],
              clueType: 'identity',
              source: 'crime_lab',
              clueText: hairValue
                ? `Microscopic hair analysis indicates a ${hairValue.toLowerCase()} hair strand.`
                : null
            };
          }

          case 'blood_type': {
            const bloodValue =
              suspectData.bloodType ||
              suspectData.blood_type ||
              null;

            return {
              ...entry,
              id: 'identity_blood_type',
              attribute: 'blood_type',
              thief_value: bloodValue,
              allowedValues: [
                'A+',
                'A-',
                'B+',
                'B-',
                'AB+',
                'AB-',
                'O+',
                'O-'
              ],
              clueType: 'identity',
              source: 'crime_lab',
              clueText: bloodValue
                ? `Serological testing confirms a blood type of ${bloodValue}.`
                : null
            };
          }

          case 'dna_gender': {
            const genderCode =
              suspectData.gender_code ||
              suspectData.genderCode ||
              suspectData.gender ||
              null;

            const dnaProfile =
              mapGenderCodeToDnaProfile(genderCode);

            return {
              ...entry,
              id: 'identity_dna_gender',
              attribute: 'dna_gender',
              thief_value: dnaProfile,
              allowedValues: [
                'XX',
                'XY'
              ],
              clueType: 'identity',
              source: 'crime_lab',
              clueText: dnaProfile
                ? `DNA amplification reveals a ${dnaProfile === 'XY' ? 'male' : 'female'} genetic profile.`
                : null
            };
          }

          case 'fingerprint_pattern': {
            const pattern =
              suspectData.fingerprintPattern ||
              suspectData.fingerprint_pattern ||
              weightedFingerprintPattern(suspectSeed);

            return {
              ...entry,
              id: 'identity_fingerprint_pattern',
              attribute: 'fingerprint_pattern',
              thief_value: pattern,
              allowedValues: [
                'LOOP',
                'WHORL',
                'ARCH'
              ],
              clueType: 'identity',
              source: 'crime_lab',
              clueText:
                `Latent print analysis shows a ${pattern.toLowerCase()} ridge pattern.`
            };
          }

          default:
            return null;
        }
      })
      .filter((template) => {
        return template && template.thief_value;
      });

    if (templates.length === 0) {
      console.error(
        '[CrimeLabManager] No main identity template could be resolved.',
        {
          caseKey,
          suspectData
        }
      );

      return null;
    }

    const selectedIndex = Math.floor(
      Math.random() * templates.length
    );

    const selected = templates[selectedIndex];

    console.log(
      '[CrimeLabManager] Rolled main identity minigame:',
      {
        caseKey,
        selectedIndex,
        evidenceType: selected.attribute,
        minigame: selected.minigame,
        availableEvidenceTypes: templates.map(
          (template) => template.attribute
        )
      }
    );

    return cloneEvidence(selected);
  }


  /*
   * Exactly two side games per case.
   * Just like identity evidence, they are persisted under the case key.
   */
  ensureRandomTraceEvidence() {
    const caseKey = this.getCaseKey();
    const assignment = this.ensureCaseAssignment();

    const hasExactlyTwoTraceEvidence = (evidenceList) => {
      return Array.isArray(evidenceList) &&
        evidenceList.length === 2 &&
        evidenceList.every((evidence) => {
          return this.isValidTraceEvidence(evidence);
        });
    };

    if (hasExactlyTwoTraceEvidence(assignment.traceEvidence)) {
      const evidence = assignment.traceEvidence.map(
        (item) => cloneEvidence(item)
      );

      this.gameState.traceEvidence = evidence.map(
        (item) => cloneEvidence(item)
      );

      console.log(
        '[CrimeLabManager] Reusing saved trace evidence:',
        {
          caseKey,
          traceTypes: evidence.map(
            (item) => item.attribute
          )
        }
      );

      return evidence;
    }

    const generatedEvidence =
      this.buildTraceEvidenceForCase(caseKey);

    if (!hasExactlyTwoTraceEvidence(generatedEvidence)) {
      console.error(
        '[CrimeLabManager] Trace evidence generation failed.',
        {
          caseKey,
          generatedEvidence,
          reconstructedHeist: this.gameState.reconstructedHeist
        }
      );

      throw new Error(
        'CrimeLabManager: unable to generate exactly two valid trace evidence objects.'
      );
    }

    const evidence = generatedEvidence.map(
      (item) => cloneEvidence(item)
    );

    assignment.traceEvidence = evidence.map(
      (item) => cloneEvidence(item)
    );

    this.gameState.traceEvidence = evidence.map(
      (item) => cloneEvidence(item)
    );

    saveGameState();

    console.log(
      '[CrimeLabManager] New trace evidence assigned:',
      {
        caseKey,
        traceTypes: evidence.map(
          (item) => item.attribute
        )
      }
    );

    return evidence;
  }


  buildTraceEvidenceForCase(caseKey) {
    const reconstruction =
      this.gameState.reconstructedHeist || {};

    const selectedThief =
      this.gameState.selectedThiefProfile ||
      this.gameState.selectedThief ||
      this.gameState.currentThief ||
      this.gameState.thief ||
      {};

    const suspectData = {
      ...selectedThief,
      ...reconstruction
    };

    const thiefSkills = Array.isArray(
      reconstruction.thiefSkills
    )
      ? reconstruction.thiefSkills
      : typeof reconstruction.thiefSkills === 'string'
        ? reconstruction.thiefSkills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
        : [];

    const shoeSize =
      suspectData.shoeSizeCategory ||
      suspectData.shoe_size_category ||
      'medium';

    const handedness =
      suspectData.handedness ||
      'right';

    const tracePool = [
      {
        id: 'trace_shoe_print',
        label: 'Boot Print Analysis',
        attribute: 'shoeSizeCategory',
        thief_value: shoeSize,
        allowedValues: [
          'small',
          'medium',
          'large'
        ],
        minigame: 'shoe_size',
        clueType: 'trace',
        source: 'crime_lab',
        clueText:
          `The partial boot print indicates ${shoeSize} footwear.`
      },

      {
        id: 'trace_hand_smudge',
        label: 'Cabinet Handle Smudge',
        attribute: 'handedness',
        thief_value: handedness,
        allowedValues: [
          'left',
          'right'
        ],
        minigame: 'handedness',
        clueType: 'trace',
        source: 'crime_lab',
        clueText:
          `The smudge pattern indicates a ${handedness}-handed person.`
      },

      {
        id: 'trace_fabric_fiber',
        label: 'Synthetic Fibre Analysis',
        attribute: 'fabricMaterial',
        thief_value: 'synthetic',
        allowedValues: [
          'synthetic',
          'cotton',
          'wool',
          'silk',
          'leather'
        ],
        minigame: 'fiber',
        clueType: 'trace',
        source: 'crime_lab',
        clueText:
          'The recovered fibre is a synthetic weave from modern outerwear.'
      },

      {
        id: 'trace_tool_residue',
        label: 'Tool Residue Analysis',
        attribute: 'primarySkill',
        thief_value: thiefSkills[0] || 'Stealth',
        allowedValues: [
          'Lockpicking',
          'Disguise',
          'Stealth',
          'Espionage',
          'Surveillance'
        ],
        minigame: 'skill',
        clueType: 'trace',
        source: 'crime_lab',
        clueText:
          `The microscopic residue is consistent with ${
            thiefSkills[0] || 'Stealth'
          }.`
      }
    ];

    const seed = String(caseKey || 'default_case')
      .split('')
      .reduce(
        (sum, character) => {
          return sum + character.charCodeAt(0);
        },
        0
      );

    const firstIndex = seed % tracePool.length;

    const secondIndex =
      (firstIndex + 1) % tracePool.length;

    return [
      cloneEvidence(tracePool[firstIndex]),
      cloneEvidence(tracePool[secondIndex])
    ];
  }


  getTraceEvidenceConfig(index) {
    const assignedEvidence =
      this.ensureRandomTraceEvidence();

    const evidence = assignedEvidence[index];

    if (!evidence) {
      throw new Error(
        `CrimeLabManager: trace evidence at index ${index} does not exist.`
      );
    }

    return this.normalizeEvidenceConfig(
      evidence,
      {
        // Spójne z CrimeLabScene:
        // index 0 -> trace_0
        // index 1 -> trace_1
        stationId: `trace_${index}`,
        fallbackLabel: `Trace Evidence ${index + 1}`,
        fallbackClueType: 'trace'
      }
    );
  }
}