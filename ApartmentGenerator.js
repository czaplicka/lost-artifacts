// ApartmentGenerator.js
// ============================================================
// Generator mieszkań dla podejrzanych na bazie motywu.
//
// Odpowiada za proceduralny wybór obiektów i gwarantowane
// rozstawienie elementów wymaganych przez case:
//
// - clueCount z caseModifiers.apartment.effect
// - artefakt misji (dokładnie raz)
// - ślad ucieczki: bezpośredni albo składany z dwóch fragmentów
// - red herringi dla atmosfery i humoru
//
// Każdy suspectId + motive + missionId tworzy zawsze ten sam
// układ, dzięki deterministic seed.
// ============================================================

import {
  APARTMENT_OBJECTS_POOL,
  APARTMENT_CONTENT_ROLES,
  ESCAPE_CLUES,
  ESCAPE_COMBINATION_ITEMS,
  RED_HERRING_CONTENTS
} from './ApartmentObjectsPool.js';

const DEFAULT_APARTMENT_MODIFIER = {
  id: 'empty_clues',
  effect: {
    state: 'empty',
    clueCount: 4,
    artifactState: 'left_behind',
    artifactRequired: true,
    artifactRecoveryBonus: 30,
    escapeMethod: 'combined'
  }
};

const DEFAULT_MISSION_ARTIFACT = {
  id: 'artifact_amber_compass',
  type: 'artifact',
  label: 'Amber Compass of Saint Eligius',
  city: 'Paris',
  country: 'France',
  description:
    'An eighteenth-century amber compass stolen from the Musée de la Navigation.',
  significance:
    'Recovered from the suspect apartment and matched to the museum inventory.',
  artifactKey: 'amber_compass',
  condition: 'intact',
  recovered: false
};

export class ApartmentGenerator {
  constructor(suspectId, motive, options = {}) {
    this.suspectId = suspectId || 'suspect_001';
    this.motive = motive || 'gambling_debt';

    this.mission = options.mission || {};
    this.caseIndex = Number.isFinite(options.caseIndex)
      ? options.caseIndex
      : Number(this.mission.caseIndex ?? 0);

    this.apartmentModifier =
      options.apartmentModifier ||
      this.mission.caseModifiers?.apartment ||
      DEFAULT_APARTMENT_MODIFIER;

    this.apartmentEffect = {
      ...DEFAULT_APARTMENT_MODIFIER.effect,
      ...(this.apartmentModifier.effect || {})
    };

    this.missionId =
      this.mission.id ||
      this.mission.missionId ||
      `case_${this.caseIndex}_${this.suspectId}`;

    this.seed = this.generateSeed(
      this.suspectId,
      this.motive,
      this.missionId
    );
  }

  /**
   * Deterministyczny seed dla konkretnej misji.
   *
   * Dodanie missionId jest ważne: ten sam złodziej może dostać
   * inną aranżację w kolejnej misji, ale po powrocie do mieszkania
   * podczas tej samej misji układ pozostaje identyczny.
   */
  generateSeed(suspectId, motiveId, missionId = '') {
    let hash = 0;
    const value = `${suspectId}_${motiveId}_${missionId}`;

    for (let i = 0; i < value.length; i += 1) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }

    return Math.abs(hash) || 1;
  }

  /**
   * Pseudolosowy wynik oparty na seedzie.
   */
  seededRandom(max = 1) {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return (this.seed / 233280) * max;
  }

  /**
   * Deterministyczne tasowanie tablicy.
   */
  shuffle(items = []) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.seededRandom(i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  /**
   * Losowanie jednego elementu według weight.
   */
  selectByWeight(items = []) {
    if (!items.length) {
      return null;
    }

    const totalWeight = items.reduce(
      (sum, item) => sum + (Number(item.weight) || 1),
      0
    );

    let randomValue = this.seededRandom(totalWeight);

    for (const item of items) {
      randomValue -= Number(item.weight) || 1;

      if (randomValue <= 0) {
        return item;
      }
    }

    return items[0];
  }

  /**
   * Główne wejście generatora.
   */
  generate() {
    const selectedTemplates = this.selectObjects();
    const configuredObjects = this.configureObjects(selectedTemplates);

    return {
      id: `apartment_${this.missionId}`,
      suspectId: this.suspectId,
      motive: this.motive,
      missionId: this.missionId,
      caseIndex: this.caseIndex,

      modifier: {
        id: this.apartmentModifier.id,
        effect: { ...this.apartmentEffect }
      },

      title: `${this.suspectId}'s Apartment`,
      subtitle: this.getSubtitleForMotive(this.motive),

      background: {
        color: 0x2c2c2c,
        pattern: 'living_room'
      },

      objects: configuredObjects
    };
  }

  /**
   * Wybiera 5–8 obiektów, ale gwarantuje miejsca wymagane
   * przez konkretny przebieg sprawy.
   */
  selectObjects() {
    const pool = APARTMENT_OBJECTS_POOL;
    const allObjectIds = Object.keys(pool);

    const requiredIds = new Set();

    if (this.shouldPlaceMissionArtifact()) {
      const preferredArtifactObject = allObjectIds.find(
        id => pool[id].preferredForMissionArtifact
      );

      if (preferredArtifactObject) {
        requiredIds.add(preferredArtifactObject);
      }
    }

    const escapePlan = this.getEscapePlan();

    if (escapePlan.method === 'combined') {
      const fragmentAHosts = this.getObjectIdsHostingRole(
        APARTMENT_CONTENT_ROLES.ESCAPE_FRAGMENT_A
      );

      const fragmentBHosts = this.getObjectIdsHostingRole(
        APARTMENT_CONTENT_ROLES.ESCAPE_FRAGMENT_B
      );

      const hostA = this.pickRequiredHost(
        fragmentAHosts,
        requiredIds,
        false
      );

      const hostB = this.pickRequiredHost(
        fragmentBHosts,
        requiredIds,
        true
      );

      if (hostA) {
        requiredIds.add(hostA);
      }

      if (hostB) {
        requiredIds.add(hostB);
      }
    } else {
      const directEscapeHosts = this.getObjectIdsHostingRole(
        APARTMENT_CONTENT_ROLES.ESCAPE_CLUE
      );

      const host = this.pickRequiredHost(
        directEscapeHosts,
        requiredIds,
        false
      );

      if (host) {
        requiredIds.add(host);
      }
    }

    const desiredCount = Math.max(
      requiredIds.size,
      5 + Math.floor(this.seededRandom(4))
    );

    const remainingIds = this.shuffle(
      allObjectIds.filter(id => !requiredIds.has(id))
    );

    const selectedIds = [
      ...requiredIds,
      ...remainingIds.slice(0, Math.max(0, desiredCount - requiredIds.size))
    ];

    return selectedIds.map(id => pool[id]);
  }

  /**
   * Wybiera hosta dla elementu obowiązkowego.
   *
   * `mustBeDifferent` jest używane dla dwóch fragmentów puzzle’u:
   * nie chcemy, aby oba wypadły z jednego obiektu.
   */
  pickRequiredHost(candidateIds, excludedIds = new Set(), mustBeDifferent = false) {
    const validCandidates = candidateIds.filter(id => {
      const object = APARTMENT_OBJECTS_POOL[id];

      if (!object) {
        return false;
      }

      if (mustBeDifferent && excludedIds.has(id)) {
        return false;
      }

      return object.canHoldRequiredContent !== false;
    });

    if (!validCandidates.length) {
      return null;
    }

    return validCandidates[
      Math.floor(this.seededRandom(validCandidates.length))
    ];
  }

  /**
   * Zwraca ID obiektów zawierających dany placeholder.
   */
  getObjectIdsHostingRole(roleId) {
    return Object.entries(APARTMENT_OBJECTS_POOL)
      .filter(([, object]) =>
        (object.possibleContents || []).some(
          content => content.id === roleId
        )
      )
      .map(([objectId]) => objectId);
  }

  /**
   * Konfiguruje obiekty w trzech fazach:
   *
   * 1. Tworzy kopie i ustawia bezpieczne stany open/locked.
   * 2. Wstawia gwarantowane itemy wymagane przez case.
   * 3. Wypełnia pozostałe obiekty clue albo red herringami.
   */
  configureObjects(objectTemplates = []) {
    const configuredObjects = objectTemplates.map(template =>
      this.createConfiguredObject(template)
    );

    const requiredAssignments = this.buildRequiredAssignments(
      configuredObjects
    );

    const requiredByObjectId = new Map();

    for (const assignment of requiredAssignments) {
      if (!assignment?.objectId || !assignment?.item) {
        continue;
      }

      requiredByObjectId.set(assignment.objectId, assignment.item);
    }

    const placedClueIds = new Set();

    for (const object of configuredObjects) {
      const requiredItem = requiredByObjectId.get(object.id);

      if (requiredItem) {
        object.unlocks = [this.normalizeItem(requiredItem)];
        object.state = 'open';

        if (requiredItem.isClue) {
          placedClueIds.add(requiredItem.id);
        }

        continue;
      }

      const item = this.selectOptionalItemForObject(
        object,
        placedClueIds
      );

      object.unlocks = item
        ? [this.normalizeItem(item)]
        : [];
    }

    return configuredObjects;
  }

  /**
   * Tworzy kopię obiektu i poprawnie obsługuje zamknięte meble.
   *
   * Jeśli obiekt nie ma `requiresItem`, nigdy nie robimy go locked,
   * bo obecny ApartmentObject nie pozwoli go wtedy otworzyć.
   */
  createConfiguredObject(template) {
    const canActuallyLock = Boolean(
      template.canBeLocked && template.requiresItem
    );

    const shouldBeLocked = canActuallyLock && this.seededRandom() > 0.5;

    return {
      ...template,

      position: { ...template.position },
      size: { ...template.size },

      possibleContents: (template.possibleContents || []).map(content => ({
        ...content
      })),

      state: shouldBeLocked ? 'locked' : 'open',
      unlocks: []
    };
  }

  /**
   * Buduje listę obowiązkowych elementów i przypisuje je
   * do kompatybilnych, wybranych obiektów.
   */
  buildRequiredAssignments(objects) {
    const assignments = [];
    const occupiedObjectIds = new Set();

    if (this.shouldPlaceMissionArtifact()) {
      const artifactObject = this.pickObjectForContent(
        objects,
        APARTMENT_CONTENT_ROLES.MISSION_ARTIFACT,
        occupiedObjectIds,
        {
          prefer: object => object.preferredForMissionArtifact === true
        }
      );

      if (artifactObject) {
        assignments.push({
          objectId: artifactObject.id,
          item: this.getMissionArtifact()
        });

        occupiedObjectIds.add(artifactObject.id);
      }
    }

    const requiredClues = this.getRequiredMotiveClues(
      this.getRequiredClueCount()
    );

    for (const clue of requiredClues) {
      const targetObject = this.pickObjectForContent(
        objects,
        clue.id,
        occupiedObjectIds
      );

      if (!targetObject) {
        continue;
      }

      assignments.push({
        objectId: targetObject.id,
        item: {
          ...clue,
          isClue: true,
          description: this.getClueDescription(clue.id, this.motive)
        }
      });

      occupiedObjectIds.add(targetObject.id);
    }

    const escapePlan = this.getEscapePlan();

    if (escapePlan.method === 'combined') {
      const fragmentAObject = this.pickObjectForContent(
        objects,
        APARTMENT_CONTENT_ROLES.ESCAPE_FRAGMENT_A,
        occupiedObjectIds
      );

      if (fragmentAObject) {
        assignments.push({
          objectId: fragmentAObject.id,
          item: ESCAPE_COMBINATION_ITEMS.torn_ticket
        });

        occupiedObjectIds.add(fragmentAObject.id);
      }

      const fragmentBObject = this.pickObjectForContent(
        objects,
        APARTMENT_CONTENT_ROLES.ESCAPE_FRAGMENT_B,
        occupiedObjectIds
      );

      if (fragmentBObject) {
        assignments.push({
          objectId: fragmentBObject.id,
          item: ESCAPE_COMBINATION_ITEMS.hotel_key_card
        });

        occupiedObjectIds.add(fragmentBObject.id);
      }
    } else {
      const directEscapeObject = this.pickObjectForContent(
        objects,
        APARTMENT_CONTENT_ROLES.ESCAPE_CLUE,
        occupiedObjectIds
      );

      if (directEscapeObject) {
        assignments.push({
          objectId: directEscapeObject.id,
          item: escapePlan.item
        });

        occupiedObjectIds.add(directEscapeObject.id);
      }
    }

    return assignments;
  }

  /**
   * Znajduje wybrany obiekt, który potrafi przechować dany content.
   */
  pickObjectForContent(
    objects,
    contentId,
    occupiedObjectIds = new Set(),
    options = {}
  ) {
    const candidates = objects.filter(object => {
      if (occupiedObjectIds.has(object.id)) {
        return false;
      }

      if (object.canHoldRequiredContent === false) {
        return false;
      }

      return (object.possibleContents || []).some(
        content => content.id === contentId
      );
    });

    if (!candidates.length) {
      return null;
    }

    const preferredCandidates = options.prefer
      ? candidates.filter(options.prefer)
      : [];

    const source = preferredCandidates.length
      ? preferredCandidates
      : candidates;

    return source[Math.floor(this.seededRandom(source.length))];
  }

  /**
   * Czy artefakt ma zostać w mieszkaniu?
   *
   * Pierwsza sprawa z `empty_clues` ma domyślnie artefakt zostawiony
   * przez złodzieja. Przy `fresh_escape` można później ustawić:
   *
   * artifactState: 'carried_away'
   *
   * i wtedy artefakt odzyskuje się dopiero po końcowym pościgu.
   */
  shouldPlaceMissionArtifact() {
    const artifactState = this.apartmentEffect.artifactState;

    if (artifactState === 'carried_away') {
      return false;
    }

    if (this.apartmentEffect.artifactRequired === true) {
      return true;
    }

    return artifactState === 'left_behind';
  }

  /**
   * Zwrot właściwego artefaktu misji.
   */
  getMissionArtifact() {
    const missionArtifact = this.mission.artifact || {};

    return {
      ...DEFAULT_MISSION_ARTIFACT,
      ...missionArtifact,

      id: missionArtifact.id || DEFAULT_MISSION_ARTIFACT.id,
      type: 'artifact',
      label:
        missionArtifact.label ||
        missionArtifact.name ||
        DEFAULT_MISSION_ARTIFACT.label,

      description:
        missionArtifact.description ||
        DEFAULT_MISSION_ARTIFACT.description,

      significance:
        missionArtifact.significance ||
        DEFAULT_MISSION_ARTIFACT.significance,

      city: missionArtifact.city || DEFAULT_MISSION_ARTIFACT.city,
      country: missionArtifact.country || DEFAULT_MISSION_ARTIFACT.country,

      artifactKey:
        missionArtifact.artifactKey ||
        DEFAULT_MISSION_ARTIFACT.artifactKey,

      condition:
        missionArtifact.condition ||
        DEFAULT_MISSION_ARTIFACT.condition,

      isArtifact: true,
      isClue: false,
      quantity: 1
    };
  }

  /**
   * Ustala wariant dowodu ucieczki.
   *
   * Pierwsze case’y korzystają z kombinacji, bo masz już gotowe
   * `COMBINE_RULES.torn_ticket_assembly`.
   *
   * W kolejnych case’ach możesz ustawić explicite:
   *
   * effect: { escapeMethod: 'direct' }
   */
  getEscapePlan() {
    const method =
      this.apartmentEffect.escapeMethod ||
      (this.caseIndex === 0 ? 'combined' : 'direct');

    if (method === 'combined') {
      return {
        method: 'combined',
        item: null
      };
    }

    const availableEscapeClues = Object.values(ESCAPE_CLUES);

    return {
      method: 'direct',
      item: this.selectByWeight(availableEscapeClues)
    };
  }

  /**
   * Liczba obowiązkowych clue z case modifiera.
   */
  getRequiredClueCount() {
    const clueCount = Number(this.apartmentEffect.clueCount);

    if (!Number.isFinite(clueCount)) {
      return 4;
    }

    return Phaser.Math.Clamp(Math.floor(clueCount), 1, 6);
  }

  /**
   * Bierze clue pasujące do motywu, bez duplikatów.
   */
  getRequiredMotiveClues(count) {
    const availableClues = this.getContentsForMotive(this.motive);
    const shuffledClues = this.shuffle(availableClues);
    return shuffledClues.slice(0, Math.min(count, shuffledClues.length));
  }

  /**
   * Dobiera opcjonalny item do obiektu, który nie dostał
   * obowiązkowej zawartości.
   */
  selectOptionalItemForObject(object, placedClueIds = new Set()) {
    const possibleContents = object.possibleContents || [];

    if (!possibleContents.length) {
      return null;
    }

    const motiveClues = this.getContentsForMotive(this.motive);

    const matchingClues = motiveClues.filter(clue => {
      if (placedClueIds.has(clue.id)) {
        return false;
      }

      return possibleContents.some(content => content.id === clue.id);
    });

    const canPickClue = matchingClues.length > 0;
    const shouldPickClue = canPickClue && this.seededRandom() < 0.35;

    if (shouldPickClue) {
      const selectedClue = this.selectByWeight(matchingClues);
      const poolVersion = possibleContents.find(
        content => content.id === selectedClue.id
      );

      if (poolVersion) {
        placedClueIds.add(selectedClue.id);

        return {
          ...poolVersion,
          isClue: true,
          description: this.getClueDescription(poolVersion.id, this.motive)
        };
      }
    }

    const redHerring = RED_HERRING_CONTENTS[
      Math.floor(this.seededRandom(RED_HERRING_CONTENTS.length))
    ];

    return {
      ...redHerring,
      isClue: false,
      isRedHerring: true,
      description: redHerring.hint || 'Probably harmless.'
    };
  }

  /**
   * Ujednolica item przed przekazaniem do ApartmentObject.
   *
   * Zachowuje flagi takie jak:
   * isArtifact, isClue, isEscapeClue, isRedHerring,
   * isEscapeFragment i condition.
   */
  normalizeItem(item = {}) {
    return {
      ...item,

      id: item.id,
      type: item.type || 'object',
      label: item.label || 'Unknown Item',
      description: item.description || '',
      quantity: Number(item.quantity) || 1,

      isClue: item.isClue === true,
      isArtifact: item.isArtifact === true,
      isEscapeClue: item.isEscapeClue === true,
      isEscapeFragment: item.isEscapeFragment === true,
      isRedHerring: item.isRedHerring === true
    };
  }

  /**
   * Pula clue właściwa dla danego motywu.
   */
  getContentsForMotive(motiveId) {
    const motiveClues = {
      gambling_debt: [
        { id: 'bank_statement', isClue: true, weight: 25 },
        { id: 'casino_receipt', isClue: true, weight: 25 },
        { id: 'threatening_letter', isClue: true, weight: 20 },
        { id: 'debt_notebook', isClue: true, weight: 22 }
      ],

      medical_treatment: [
        { id: 'medical_bill', isClue: true, weight: 25 },
        { id: 'medical_reports', isClue: true, weight: 22 },
        { id: 'old_letters', isClue: true, weight: 18 },
        { id: 'family_photo', isClue: true, weight: 15 }
      ],

      blackmail_secret: [
        { id: 'threatening_letter', isClue: true, weight: 25 },
        { id: 'blackmail_photo', isClue: true, weight: 25 },
        { id: 'old_letters', isClue: true, weight: 20 },
        { id: 'handwritten_notes', isClue: true, weight: 18 }
      ],

      repatriation_cause: [
        { id: 'artifact_research', isClue: true, weight: 25 },
        { id: 'map_location', isClue: true, weight: 22 },
        { id: 'diary', isClue: true, weight: 20 },
        { id: 'family_heirloom_photo', isClue: true, weight: 23 }
      ],

      career_coverup: [
        { id: 'handwritten_notes', isClue: true, weight: 25 },
        { id: 'bank_statement', isClue: true, weight: 20 },
        { id: 'insurance_papers', isClue: true, weight: 20 },
        { id: 'recycling_bin_receipt', isClue: true, weight: 18 }
      ],

      family_heirloom: [
        { id: 'family_heirloom_photo', isClue: true, weight: 26 },
        { id: 'family_photo', isClue: true, weight: 22 },
        { id: 'old_letters', isClue: true, weight: 20 },
        { id: 'will_document', isClue: true, weight: 18 }
      ]
    };

    return motiveClues[motiveId] || motiveClues.gambling_debt;
  }

  /**
   * Opisy clue zależne od motywu.
   */
  getClueDescription(contentId, motive) {
    const descriptions = {
      gambling_debt: {
        bank_statement: 'Large transfers to gambling establishments.',
        casino_receipt: 'Proof of massive losses in a single night.',
        threatening_letter: 'A debt collector demanding immediate payment.',
        debt_notebook: 'A handwritten log of growing debts.'
      },

      medical_treatment: {
        medical_bill: 'A hospital invoice for expensive treatment.',
        medical_reports: 'Patient records for urgent surgery.',
        family_photo: 'A photo with someone who appears to be in a hospital bed.',
        old_letters: 'Letters discussing someone’s health crisis.'
      },

      blackmail_secret: {
        threatening_letter: 'Demands payment or else.',
        blackmail_photo: 'A compromising photo with a ransom note on the back.',
        old_letters: 'Cryptic letters referring to “our arrangement”.',
        handwritten_notes: 'Notes about keeping secrets.'
      },

      repatriation_cause: {
        artifact_research: 'Extensive research on the artefact’s origins and provenance.',
        map_location: 'A map with a marked route to the artefact’s homeland.',
        diary: 'Entries about cultural heritage and justice.',
        family_heirloom_photo: 'An old photo showing the artefact in family possession.'
      },

      career_coverup: {
        handwritten_notes: 'Notes about audit schedules and discrepancies.',
        bank_statement: 'Unusual financial transactions around audit dates.',
        insurance_papers: 'Documents proving career-ending liability.',
        recycling_bin_receipt: 'Evidence of recently shredded documents.'
      },

      family_heirloom: {
        family_heirloom_photo: 'Proof that the artefact once belonged to this family.',
        family_photo: 'A family portrait with the artefact visible in the background.',
        old_letters: 'Letters describing how the artefact was lost.',
        will_document: 'A will mentioning the “stolen” family heirloom.'
      }
    };

    return descriptions[motive]?.[contentId] || 'Important evidence.';
  }

  /**
   * Tekst atmosferyczny w nagłówku sceny.
   */
  getSubtitleForMotive(motive) {
    const subtitles = {
      gambling_debt: 'Desperate. In debt. Running.',
      medical_treatment: 'A sick relative. Impossible bills. A desperate choice.',
      blackmail_secret: 'Threatened. Cornered. No clean way out.',
      repatriation_cause: 'Believes in justice. Refuses to respect the law.',
      career_coverup: 'Everything to lose. Will do anything.',
      family_heirloom: 'Reclaiming what was stolen. A personal crusade.'
    };

    return subtitles[motive] || 'What were they trying to hide?';
  }
}

/**
 * Publiczna funkcja kompatybilna z dotychczasowym importem.
 *
 * Stare wywołanie nadal zadziała:
 *
 * generateApartment(suspectId, motive)
 *
 * Docelowe wywołanie:
 *
 * generateApartment(suspectId, motive, {
 *   mission: state.currentMission,
 *   apartmentModifier: state.currentMission?.caseModifiers?.apartment,
 *   caseIndex: state.currentMission?.caseIndex ?? 0
 * });
 */
export function generateApartment(suspectId, motive, options = {}) {
  const generator = new ApartmentGenerator(suspectId, motive, options);
  return generator.generate();
}

export default ApartmentGenerator;