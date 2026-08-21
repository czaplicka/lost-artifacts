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
    ...sourceSuspect,

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

  suspect.publicProfile.visibleTraits = createVisibleTraits(
    suspect.restrictedProfile.forensicAttributes,
    suspect.publicProfile.visibleTraits
  );

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
      createDecoySuspect(index, source)
    );

    const fallbackDecoyCount = Math.max(total, 10);

    const sourceDecoys = availableDecoys.length
      ? availableDecoys
      : Array.from(
        { length: fallbackDecoyCount },
        (_, index) => createDecoySuspect(index)
      );

    const shuffledDecoys = shuffle(sourceDecoys).map((suspect) =>
      safeClone(suspect)
    );

    while (shuffledDecoys.length < total) {
      shuffledDecoys.push(
        createDecoySuspect(shuffledDecoys.length)
      );
    }

    const trueThiefBase =
      shuffledDecoys.shift() ||
      createDecoySuspect(0);

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

        decoy.publicProfile.visibleTraits = createVisibleTraits(
          decoy.restrictedProfile.forensicAttributes,
          decoy.publicProfile.visibleTraits
        );

        return decoy;
      });

    const suspects = shuffle([
      trueThiefCaseSuspect,
      forensicTwin,
      ...ordinarySuspects
    ]);

    ensureUniqueIds(suspects);
    ensureUniqueNames(suspects);

    const validation = validateExactlyTwoForensicCandidates(
      suspects,
      normalizedHardEvidence
    );

    return {
      cityId: normalizeCityId(crimeCityId),

      suspects,
      citySuspects: suspects,

      realThiefId: validation.realThiefCaseSuspect.id,
      realThiefSuspectId: validation.realThiefCaseSuspect.id,
      trueThiefCaseSuspectId: validation.realThiefCaseSuspect.id,

      forensicTwinSuspectId: validation.forensicTwin.id,

      hardEvidence: safeClone(normalizedHardEvidence),

      forensicSurvivorIds: validation.survivors.map(
        (suspect) => suspect.id
      ),

      actualCriminalId: thief.id || null,
      generatedAt: new Date().toISOString()
    };
  }

  prepareCaseState(caseData = {}) {
    return prepareCaseSuspectState(caseData);
  }
}

export default SuspectGenerator;