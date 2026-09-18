import {
  applyHardEvidenceToSuspect,
  forceSuspectToFailHardEvidence,
  getDefaultHardEvidenceFromThief,
  normalizeHardEvidence,
  validateExactlyTwoForensicCandidates
} from './forensicEvidence.js';

import {
  createDecoySuspect,
  createVisibleTraits,
  ensureUniqueIds,
  ensureUniqueNames,
  normalizeForensicAttributes,
  normalizeGenderCode
} from './suspectFactory.js';

import {
  normalizeCityId,
  safeClone,
  shuffle
} from './suspectGeneratorUtils.js';

import {
  prepareCaseSuspectState
} from './SuspectCaseState.js';

const EVIDENCE_PACING_ORDER = [
  'hair_color',
  'shoe_size_category',
  'handedness',
  'blood_type',
  'fingerprint_pattern',
  'biological_sex',
  'race'
];

/**
 * Świeży stan postępu podejrzanego.
 *
 * Nie wolno przenosić cleared/eliminated ze starego save'a, obiektu JSON
 * ani poprzedniej sprawy do nowo generowanego case'a.
 */
function createFreshDeductionState() {
  return {
    eliminated: false,
    eliminationReasons: [],
    notesUnlocked: [],
    labStatus: 'pending',
    hypothesisStatus: 'pending',
    interviewStatus: 'pending',
    alibiStatus: 'pending'
  };
}

function resetGeneratedSuspectProgress(suspect) {
  if (!suspect || typeof suspect !== 'object') {
    return suspect;
  }

  suspect.deductionState = createFreshDeductionState();

  suspect.restrictedProfile ??= {};
  suspect.restrictedProfile.unlockedFields = [];

  return suspect;
}

function resetGeneratedPoolProgress(suspects = []) {
  if (!Array.isArray(suspects)) {
    return [];
  }

  suspects.forEach(resetGeneratedSuspectProgress);

  return suspects;
}

function getEvidenceField(evidence = {}) {
  return String(
    evidence.field ||
      evidence.forensicField ||
      evidence.attribute ||
      ''
  ).trim();
}

/**
 * Ustawia kolejność, w której ślady będą redukowały pulę.
 *
 * Kolejność jest ważna dla gameplayu:
 * - włosy zwykle robią pierwszą, dużą redukcję;
 * - buty i ręczność zawężają potem pulę;
 * - krew / DNA / odciski mogą być późniejszymi filtrami,
 *   jeśli są obecne w danej sprawie.
 *
 * Nie tworzy sztucznie włosów, butów ani ręczności. Sortuje wyłącznie
 * dowody, które już wylosowały się dla aktualnego złodzieja.
 */
function sortEvidenceForPacing(hardEvidence = []) {
  return [...hardEvidence].sort((left, right) => {
    const leftField = getEvidenceField(left);
    const rightField = getEvidenceField(right);

    const leftIndex = EVIDENCE_PACING_ORDER.indexOf(
      leftField
    );

    const rightIndex = EVIDENCE_PACING_ORDER.indexOf(
      rightField
    );

    const safeLeftIndex =
      leftIndex === -1
        ? EVIDENCE_PACING_ORDER.length + 100
        : leftIndex;

    const safeRightIndex =
      rightIndex === -1
        ? EVIDENCE_PACING_ORDER.length + 100
        : rightIndex;

    return safeLeftIndex - safeRightIndex;
  });
}

function createForensicTwin(
  index,
  hardEvidence,
  usedNames = new Set()
) {
  let twin = createDecoySuspect(index);
  let attempts = 0;

  while (
    usedNames.has(twin.name.toLowerCase()) &&
    attempts < 30
  ) {
    twin = createDecoySuspect(index);
    attempts += 1;
  }

  twin.isRealThief = false;
  twin.hiddenIdentity = null;
  twin.hiddenCaseData = {
    isForensicTwin: true
  };

  /**
   * Twin pasuje do wszystkich głównych śladów.
   */
  applyHardEvidenceToSuspect(twin, hardEvidence);

  twin.publicProfile ??= {};
  twin.publicProfile.visibleTraits = createVisibleTraits(
    twin.restrictedProfile.forensicAttributes,
    twin.publicProfile.visibleTraits
  );

  resetGeneratedSuspectProgress(twin);

  return twin;
}

function createTrueThiefCaseSuspect(
  sourceSuspect,
  thief,
  hardEvidence
) {
  const thiefGenderCode = normalizeGenderCode(
    thief?.gender_code ||
      thief?.genderCode ||
      thief?.gender
  );

  const thiefForensics = normalizeForensicAttributes(
    thief || {},
    thiefGenderCode
  );

  const suspect = {
    ...safeClone(sourceSuspect),

    isRealThief: true,

    restrictedProfile: {
      unlockedFields: [],
      forensicAttributes: thiefForensics
    },

    hiddenIdentity: thief?.hiddenIdentity
      ? safeClone(thief.hiddenIdentity)
      : {
          realName: thief?.realName || thief?.name || null,
          revealStage: thief?.revealStage || 'identity_reveal'
        },

    hiddenCaseData: {
      isTrueThief: true,
      realThiefId: thief?.id || null,
      realThiefName: thief?.name || null,
      realThiefProfile: safeClone(thief || {})
    }
  };

  /**
   * Złodziej musi pasować do wszystkich hard evidence.
   */
  applyHardEvidenceToSuspect(suspect, hardEvidence);

  suspect.publicProfile ??= {};
  suspect.publicProfile.visibleTraits = createVisibleTraits(
    suspect.restrictedProfile.forensicAttributes,
    suspect.publicProfile.visibleTraits
  );

  resetGeneratedSuspectProgress(suspect);

  return suspect;
}

/**
 * Zwraca plan stopniowego zawężania puli.
 *
 * Dla 8 zwykłych decoyów:
 *
 * 1 clue:
 * - 8 odpada na tym clue, końcowo zostaje złodziej + twin.
 *
 * 2 clues:
 * - 5 odpada na pierwszym clue,
 * - 3 odpada na drugim.
 *
 * 3 clues:
 * - 5 odpada na pierwszym clue,
 * - 2 odpada na drugim clue,
 * - 1 odpada na trzecim clue.
 *
 * 4 clues:
 * - 5 odpada na pierwszym clue,
 * - 1 odpada na drugim clue,
 * - 1 odpada na trzecim clue,
 * - 1 odpada na czwartym clue.
 */
function buildForensicEliminationPlan(
  decoyCount,
  evidenceCount
) {
  if (decoyCount <= 0 || evidenceCount <= 0) {
    return [];
  }

  /**
   * Nie możemy rozłożyć osób na więcej etapów niż mamy decoyów.
   */
  const activeEvidenceCount = Math.min(
    evidenceCount,
    decoyCount
  );

  const plan = [];

  /**
   * Pierwszy clue powinien wyeliminować około 60–65% decoyów.
   *
   * Dla 8 decoyów:
   * Math.round(8 * 0.625) = 5.
   *
   * Zostawiamy co najmniej jednego decoya na każdy późniejszy clue.
   */
  const laterStages = activeEvidenceCount - 1;

  const firstWave = Math.min(
    decoyCount - laterStages,
    Math.max(1, Math.round(decoyCount * 0.625))
  );

  plan.push({
    evidenceIndex: 0,
    eliminateCount: firstWave
  });

  let remainingDecoys =
    decoyCount - firstWave;

  /**
   * Każdy późniejszy etap poza ostatnim usuwa po jednej osobie.
   * Ostatni etap usuwa całą pozostałą część.
   *
   * Dla 8 osób / 3 clues:
   * 5, 1, 2
   *
   * Jeżeli chcesz konkretnie 5, 2, 1 — używamy poniżej wariantu
   * rozdzielającego dwa ostatnie decoye nierówno.
   */
  for (
    let evidenceIndex = 1;
    evidenceIndex < activeEvidenceCount;
    evidenceIndex += 1
  ) {
    const isLastStage =
      evidenceIndex === activeEvidenceCount - 1;

    const stagesAfterThis =
      activeEvidenceCount - evidenceIndex - 1;

    let eliminateCount;

    if (isLastStage) {
      eliminateCount = remainingDecoys;
    } else if (
      evidenceIndex === 1 &&
      remainingDecoys >= 3 &&
      activeEvidenceCount === 3
    ) {
      /**
       * Specjalnie dla podstawowego flow:
       * 8 decoyów / 3 clues -> 5, 2, 1.
       */
      eliminateCount = 2;
    } else {
      eliminateCount = Math.max(
        1,
        remainingDecoys - stagesAfterThis
      );
    }

    plan.push({
      evidenceIndex,
      eliminateCount
    });

    remainingDecoys -= eliminateCount;
  }

  return plan;
}

function getSingleFailureEvidence(
  hardEvidence,
  evidenceIndex
) {
  const evidence = hardEvidence[evidenceIndex];

  return evidence
    ? [evidence]
    : [];
}

/**
 * Ustawia zwykłych podejrzanych tak, aby:
 *
 * 1. najpierw wszyscy pasowali do wszystkich hard evidence;
 * 2. potem każdy decoy otrzymał JEDEN etap odpadnięcia;
 * 3. nikt nie psuje wszystkich śladów naraz.
 *
 * To naprawia problem:
 * "hair color od razu wyklucza 8 osób".
 */
function applyProgressiveForensicFailures(
  ordinarySuspects = [],
  hardEvidence = []
) {
  if (
    !Array.isArray(ordinarySuspects) ||
    !ordinarySuspects.length ||
    !Array.isArray(hardEvidence) ||
    !hardEvidence.length
  ) {
    return ordinarySuspects;
  }

  /**
   * Kluczowy krok:
   *
   * Każdy zwykły decoy najpierw otrzymuje wszystkie wartości zgodne
   * z hard evidence — podobnie jak złodziej i twin.
   *
   * Dopiero potem zmieniamy mu dokładnie jedno pole.
   */
  ordinarySuspects.forEach((suspect) => {
    applyHardEvidenceToSuspect(suspect, hardEvidence);

    suspect.hiddenCaseData ??= {};
    suspect.hiddenCaseData.isTrueThief = false;
    suspect.hiddenCaseData.isForensicTwin = false;
  });

  const plan = buildForensicEliminationPlan(
    ordinarySuspects.length,
    hardEvidence.length
  );

  let suspectCursor = 0;

  plan.forEach(({ evidenceIndex, eliminateCount }) => {
    const singleFailureEvidence = getSingleFailureEvidence(
      hardEvidence,
      evidenceIndex
    );

    if (!singleFailureEvidence.length) {
      return;
    }

    for (
      let count = 0;
      count < eliminateCount &&
      suspectCursor < ordinarySuspects.length;
      count += 1
    ) {
      const suspect = ordinarySuspects[suspectCursor];

      /**
       * Zmieniamy wyłącznie jedno pole:
       * hair OR shoes OR handedness etc.
       */
      forceSuspectToFailHardEvidence(
        suspect,
        singleFailureEvidence,
        suspectCursor
      );

      suspect.hiddenCaseData ??= {};
      suspect.hiddenCaseData.forensicFailureStage =
        evidenceIndex;

      suspect.hiddenCaseData.forensicFailureField =
        getEvidenceField(singleFailureEvidence[0]);

      suspectCursor += 1;
    }
  });

  /**
   * Awaryjne domknięcie. Każdy decoy musi odpaść na którymś śladzie.
   */
  while (suspectCursor < ordinarySuspects.length) {
    const suspect = ordinarySuspects[suspectCursor];

    const lastEvidence = getSingleFailureEvidence(
      hardEvidence,
      hardEvidence.length - 1
    );

    if (!lastEvidence.length) {
      break;
    }

    forceSuspectToFailHardEvidence(
      suspect,
      lastEvidence,
      suspectCursor
    );

    suspect.hiddenCaseData ??= {};
    suspect.hiddenCaseData.forensicFailureStage =
      hardEvidence.length - 1;

    suspect.hiddenCaseData.forensicFailureField =
      getEvidenceField(lastEvidence[0]);

    suspectCursor += 1;
  }

  return ordinarySuspects;
}

/**
 * Kontrola developerska: liczy, ile osób nadal pasuje po każdym clue.
 *
 * Nie zapisujemy tego do UI ani save'a. To wyłącznie diagnostyka
 * dla konsoli podczas tworzenia generatora.
 */
function getProgressiveForensicDebugSummary(
  suspects,
  hardEvidence
) {
  const getValue = (suspect, field) => {
    const attribute =
      suspect?.restrictedProfile?.forensicAttributes
        ?.[field];

    return attribute?.value ?? attribute ?? null;
  };

  const normalize = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase();

  return hardEvidence.map((evidence, evidenceIndex) => {
    const evidenceField = getEvidenceField(evidence);

    const evidenceValue =
      evidence.value ??
      evidence.normalizedValue ??
      null;

    const comparedEvidence = hardEvidence.slice(
      0,
      evidenceIndex + 1
    );

    const survivors = suspects.filter((suspect) =>
      comparedEvidence.every((currentEvidence) => {
        const field = getEvidenceField(currentEvidence);

        const expectedValue =
          currentEvidence.value ??
          currentEvidence.normalizedValue ??
          null;

        return (
          normalize(getValue(suspect, field)) ===
          normalize(expectedValue)
        );
      })
    );

    return {
      stage: evidenceIndex + 1,
      field: evidenceField,
      expectedValue: evidenceValue,
      survivorCount: survivors.length,
      survivorIds: survivors.map((suspect) => suspect.id)
    };
  });
}

export class SuspectGenerator {
  constructor(citySuspectsData = {}) {
    this.citySuspectsData = citySuspectsData;
  }

  getCitySuspects(crimeCityId) {
    const normalizedCrimeCityId =
      normalizeCityId(crimeCityId);

    const data = this.citySuspectsData;

    if (Array.isArray(data)) {
      return data.filter((suspect) => {
        const suspectCityId = normalizeCityId(
          suspect.cityId ||
            suspect.city_id ||
            suspect.city
        );

        return (
          !suspectCityId ||
          suspectCityId === normalizedCrimeCityId
        );
      });
    }

    if (Array.isArray(data?.suspects)) {
      return data.suspects.filter((suspect) => {
        const suspectCityId = normalizeCityId(
          suspect.cityId ||
            suspect.city_id ||
            suspect.city
        );

        return (
          !suspectCityId ||
          suspectCityId === normalizedCrimeCityId
        );
      });
    }

    if (Array.isArray(data?.cities)) {
      const cityData = data.cities.find((city) => {
        const cityId = normalizeCityId(
          city.id ||
            city.cityId ||
            city.city
        );

        return cityId === normalizedCrimeCityId;
      });

      return Array.isArray(cityData?.suspects)
        ? cityData.suspects
        : [];
    }

    if (Array.isArray(data?.[normalizedCrimeCityId])) {
      return data[normalizedCrimeCityId];
    }

    return [];
  }

  generateCaseSuspects(
    thief,
    crimeCityId,
    {
      total = 10,
      hardEvidence = []
    } = {}
  ) {
    if (!thief || typeof thief !== 'object') {
      throw new Error(
        'A real thief profile is required to generate a case suspect pool.'
      );
    }

    if (total < 2) {
      throw new Error(
        'The suspect pool must contain at least two people.'
      );
    }

    const rawHardEvidence = normalizeHardEvidence(
      hardEvidence.length
        ? hardEvidence
        : getDefaultHardEvidenceFromThief(thief)
    );

    const normalizedHardEvidence = sortEvidenceForPacing(
      rawHardEvidence
    );

    if (!normalizedHardEvidence.length) {
      throw new Error(
        'At least one hard forensic evidence item is required.'
      );
    }

    const citySuspects =
      this.getCitySuspects(crimeCityId);

    const availableDecoys = citySuspects.map(
      (source, index) =>
        createDecoySuspect(index, source, {
          preserveCaseProgress: false
        })
    );

    const fallbackDecoyCount = Math.max(total, 10);

    const sourceDecoys = availableDecoys.length
      ? availableDecoys
      : Array.from(
          { length: fallbackDecoyCount },
          (_, index) =>
            createDecoySuspect(index, {}, {
              preserveCaseProgress: false
            })
        );

    const shuffledDecoys = shuffle(sourceDecoys).map(
      (suspect) => safeClone(suspect)
    );

    while (shuffledDecoys.length < total) {
      shuffledDecoys.push(
        createDecoySuspect(
          shuffledDecoys.length,
          {},
          {
            preserveCaseProgress: false
          }
        )
      );
    }

    const trueThiefBase =
      shuffledDecoys.shift() ||
      createDecoySuspect(0, {}, {
        preserveCaseProgress: false
      });

    const trueThiefCaseSuspect =
      createTrueThiefCaseSuspect(
        trueThiefBase,
        thief,
        normalizedHardEvidence
      );

    const usedNames = new Set([
      trueThiefCaseSuspect.name.toLowerCase()
    ]);

    const forensicTwin = createForensicTwin(
      1,
      normalizedHardEvidence,
      usedNames
    );

    const remainingCount = total - 2;

    /**
     * Zwykli decoye są tworzeni bez zmieniania cech.
     *
     * NIE WOLNO tutaj wywoływać:
     *
     * forceSuspectToFailHardEvidence(
     *   decoy,
     *   normalizedHardEvidence,
     *   index
     * );
     *
     * To był stary błąd, który robił każdego decoya niezgodnym
     * z każdym śladem i pozwalał włosom od razu wykluczać 8 osób.
     */
    const ordinarySuspects = shuffledDecoys
      .slice(0, remainingCount)
      .map((suspect) => {
        const decoy = safeClone(suspect);

        decoy.isRealThief = false;
        decoy.hiddenIdentity = null;
        decoy.hiddenCaseData = {
          isTrueThief: false,
          isForensicTwin: false
        };

        decoy.publicProfile ??= {};

        resetGeneratedSuspectProgress(decoy);

        return decoy;
      });

    /**
     * Każdy decoy najpierw dostaje pełną zgodność z dowodami,
     * potem jeden konkretny punkt odpadnięcia.
     */
    applyProgressiveForensicFailures(
      ordinarySuspects,
      normalizedHardEvidence
    );

    /**
     * Włosy i inne widoczne cechy muszą zostać odświeżone po zmianie
     * forensic attributes przez forceSuspectToFailHardEvidence().
     */
    ordinarySuspects.forEach((suspect) => {
      suspect.publicProfile ??= {};

      suspect.publicProfile.visibleTraits =
        createVisibleTraits(
          suspect.restrictedProfile?.forensicAttributes,
          suspect.publicProfile.visibleTraits
        );

      resetGeneratedSuspectProgress(suspect);
    });

    const suspects = shuffle([
      trueThiefCaseSuspect,
      forensicTwin,
      ...ordinarySuspects
    ]);

    ensureUniqueIds(suspects);
    ensureUniqueNames(suspects);

    /**
     * Ostateczne zabezpieczenie przed przenoszeniem CLEARED oraz
     * unlockedFields z wcześniejszego stanu.
     */
    resetGeneratedPoolProgress(suspects);

    const validation =
      validateExactlyTwoForensicCandidates(
        suspects,
        normalizedHardEvidence
      );

    if (validation.survivors.length !== 2) {
      console.error(
        '[SuspectGenerator] Wrong final forensic survivor count.',
        {
          survivorCount: validation.survivors.length,
          hardEvidence: normalizedHardEvidence,
          suspects,
          summary: getProgressiveForensicDebugSummary(
            suspects,
            normalizedHardEvidence
          )
        }
      );

      throw new Error(
        `Expected exactly 2 forensic candidates, received ${validation.survivors.length}.`
      );
    }

    const realThiefCaseSuspect =
      validation.realThiefCaseSuspect;

    if (!realThiefCaseSuspect) {
      throw new Error(
        'The generated case does not contain the real thief.'
      );
    }

    if (
      realThiefCaseSuspect.deductionState?.eliminated ===
      true
    ) {
      throw new Error(
        'The real thief was incorrectly eliminated during case generation.'
      );
    }

    const forensicDebugSummary =
      getProgressiveForensicDebugSummary(
        suspects,
        normalizedHardEvidence
      );

    console.groupCollapsed(
      '[SuspectGenerator] Progressive forensic pacing'
    );

    console.table(forensicDebugSummary);

    console.groupEnd();

    return {
      cityId: normalizeCityId(crimeCityId),

      suspects,
      citySuspects: suspects,

      realThiefId: realThiefCaseSuspect.id,
      realThiefSuspectId:
        realThiefCaseSuspect.id,
      trueThiefCaseSuspectId:
        realThiefCaseSuspect.id,

      forensicTwinSuspectId:
        validation.forensicTwin.id,

      /**
       * Zapisujemy już posortowaną kolejność, ponieważ ta kolejność
       * determinuje pacing kolejnych analiz.
       */
      hardEvidence: safeClone(
        normalizedHardEvidence
      ),

      forensicSurvivorIds: validation.survivors.map(
        (suspect) => suspect.id
      ),

      actualCriminalId: thief.id || null,

      generatedAt: new Date().toISOString()
    };
  }

  prepareCaseState(caseData = {}) {
    return prepareCaseSuspectState(caseData, {
      preserveCaseProgress: false
    });
  }

  restoreSavedCaseState(savedCaseData = {}) {
    return prepareCaseSuspectState(savedCaseData, {
      preserveCaseProgress: true
    });
  }
}

export default SuspectGenerator;