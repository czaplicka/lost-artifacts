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

/**
 * Stan dla świeżo wygenerowanej sprawy.
 *
 * To jest drugi bezpiecznik po createDeductionState() z suspectFactory.
 * Generator ma obowiązek zwrócić podejrzanych aktywnych, nawet gdy źródłowy
 * rekord JSON lub stary save przypadkiem zawiera deductionState.eliminated.
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

/**
 * Czyści postęp śledztwa u jednego podejrzanego.
 *
 * Nie zmienia:
 * - tożsamości,
 * - profesji,
 * - ukrytej tożsamości złodzieja,
 * - atrybutów kryminalistycznych,
 * - cech wizualnych,
 * - statusu isRealThief.
 *
 * Resetuje wyłącznie stan, który gracz zdobywa w trakcie case'a.
 */
function resetGeneratedSuspectProgress(suspect) {
  if (!suspect || typeof suspect !== 'object') {
    return suspect;
  }

  suspect.deductionState = createFreshDeductionState();

  suspect.restrictedProfile ??= {};
  suspect.restrictedProfile.unlockedFields = [];

  return suspect;
}

/**
 * Czyści postęp całej świeżo wygenerowanej puli.
 *
 * Wywołujemy po:
 * - stworzeniu złodzieja,
 * - stworzeniu tweenu,
 * - stworzeniu decoyów,
 * - przetasowaniu,
 * - normalizacji ID i nazw.
 *
 * Dzięki temu nie ma znaczenia, czy dane źródłowe miały kiedyś stare
 * deductionState albo unlockedFields.
 */
function resetGeneratedPoolProgress(suspects = []) {
  if (!Array.isArray(suspects)) {
    return [];
  }

  suspects.forEach(resetGeneratedSuspectProgress);

  return suspects;
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
  twin.hiddenCaseData = null;

  applyHardEvidenceToSuspect(twin, hardEvidence);

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

  applyHardEvidenceToSuspect(suspect, hardEvidence);

  suspect.publicProfile ??= {};

  suspect.publicProfile.visibleTraits = createVisibleTraits(
    suspect.restrictedProfile.forensicAttributes,
    suspect.publicProfile.visibleTraits
  );

  resetGeneratedSuspectProgress(suspect);

  return suspect;
}

export class SuspectGenerator {
  constructor(citySuspectsData = {}) {
    this.citySuspectsData = citySuspectsData;
  }

  getCitySuspects(crimeCityId) {
    const normalizedCrimeCityId = normalizeCityId(crimeCityId);
    const data = this.citySuspectsData;

    if (Array.isArray(data)) {
      return data.filter((suspect) => {
        const suspectCityId = normalizeCityId(
          suspect.cityId ||
            suspect.city_id ||
            suspect.city
        );

        return !suspectCityId || suspectCityId === normalizedCrimeCityId;
      });
    }

    if (Array.isArray(data?.suspects)) {
      return data.suspects.filter((suspect) => {
        const suspectCityId = normalizeCityId(
          suspect.cityId ||
            suspect.city_id ||
            suspect.city
        );

        return !suspectCityId || suspectCityId === normalizedCrimeCityId;
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

    const normalizedHardEvidence = normalizeHardEvidence(
      hardEvidence.length
        ? hardEvidence
        : getDefaultHardEvidenceFromThief(thief)
    );

    if (!normalizedHardEvidence.length) {
      throw new Error(
        'At least one hard forensic evidence item is required.'
      );
    }

    const citySuspects = this.getCitySuspects(crimeCityId);

    const availableDecoys = citySuspects.map((source, index) =>
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

    const shuffledDecoys = shuffle(sourceDecoys).map((suspect) =>
      safeClone(suspect)
    );

    while (shuffledDecoys.length < total) {
      shuffledDecoys.push(
        createDecoySuspect(
          shuffledDecoys.length,
          {},
          { preserveCaseProgress: false }
        )
      );
    }

    const trueThiefBase =
      shuffledDecoys.shift() ||
      createDecoySuspect(0, {}, {
        preserveCaseProgress: false
      });

    const trueThiefCaseSuspect = createTrueThiefCaseSuspect(
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

    const ordinarySuspects = shuffledDecoys
      .slice(0, remainingCount)
      .map((suspect, index) => {
        const decoy = safeClone(suspect);

        decoy.isRealThief = false;
        decoy.hiddenIdentity = null;
        decoy.hiddenCaseData = null;

        forceSuspectToFailHardEvidence(
          decoy,
          normalizedHardEvidence,
          index
        );

        decoy.publicProfile ??= {};

        decoy.publicProfile.visibleTraits = createVisibleTraits(
          decoy.restrictedProfile.forensicAttributes,
          decoy.publicProfile.visibleTraits
        );

        resetGeneratedSuspectProgress(decoy);

        return decoy;
      });

    const suspects = shuffle([
      trueThiefCaseSuspect,
      forensicTwin,
      ...ordinarySuspects
    ]);

    ensureUniqueIds(suspects);
    ensureUniqueNames(suspects);

    /**
     * Ostateczny reset po wszystkich transformacjach danych.
     * To chroni przed funkcją pomocniczą, która przypadkiem zmieni
     * deductionState albo unlockedFields.
     */
    resetGeneratedPoolProgress(suspects);

    const validation = validateExactlyTwoForensicCandidates(
      suspects,
      normalizedHardEvidence
    );

    if (validation.survivors.length !== 2) {
      throw new Error(
        `Expected exactly 2 forensic candidates, received ${validation.survivors.length}.`
      );
    }

    const realThiefCaseSuspect = validation.realThiefCaseSuspect;

    if (!realThiefCaseSuspect) {
      throw new Error(
        'The generated case does not contain the real thief.'
      );
    }

    if (realThiefCaseSuspect.deductionState?.eliminated) {
      throw new Error(
        'The real thief was incorrectly eliminated during case generation.'
      );
    }

    return {
      cityId: normalizeCityId(crimeCityId),

      suspects,
      citySuspects: suspects,

      realThiefId: realThiefCaseSuspect.id,
      realThiefSuspectId: realThiefCaseSuspect.id,
      trueThiefCaseSuspectId: realThiefCaseSuspect.id,

      forensicTwinSuspectId: validation.forensicTwin.id,

      hardEvidence: safeClone(normalizedHardEvidence),

      forensicSurvivorIds: validation.survivors.map(
        (suspect) => suspect.id
      ),

      actualCriminalId: thief.id || null,

      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Ten wariant jest przeznaczony dla świeżo wygenerowanej sprawy.
   *
   * Nie podawaj preserveCaseProgress: true po generowaniu nowego case'a.
   * Inaczej przeniesiesz do nowej gry wykluczenia z poprzedniej sprawy.
   */
  prepareCaseState(caseData = {}) {
    return prepareCaseSuspectState(caseData, {
      preserveCaseProgress: false
    });
  }

  /**
   * Ten wariant stosuj wyłącznie podczas odtwarzania tej samej,
   * już rozpoczętej sprawy z localStorage albo Supabase.
   */
  restoreSavedCaseState(savedCaseData = {}) {
    return prepareCaseSuspectState(savedCaseData, {
      preserveCaseProgress: true
    });
  }
}

export default SuspectGenerator;