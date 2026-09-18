// ApartmentGenerator.js
// ============================================================
// Generator mieszkań dla podejrzanych na bazie motywu
// Wybiera obiekty, zawartość, state - wszystko proceduralne
// ============================================================

import { APARTMENT_OBJECTS_POOL, RED_HERRING_CONTENTS } from './ApartmentObjectsPool.js';

export class ApartmentGenerator {
  constructor(suspectId, motive) {
    this.suspectId = suspectId;
    this.motive = motive;
    this.seed = this.generateSeed(suspectId, motive);
  }

  /**
   * Deterministic seed dla danego suspectId + motive
   * Zawsze generuje ten sam apartment dla tego samego podejrzanego
   */
  generateSeed(suspectId, motiveId) {
    let hash = 0;
    const str = `${suspectId}_${motiveId}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32-bit int
    }
    return Math.abs(hash);
  }

  /**
   * Seeded random (zawsze ten sam wynik dla tego samego seeda)
   */
  seededRandom(max = 1) {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return (this.seed / 233280) * max;
  }

  /**
   * Generuj pełną konfigurację mieszkania
   */
  generate() {
    const objects = this.selectObjects();
    const configuredObjects = this.configureObjects(objects);

    return {
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
   * Wybierz które obiekty mają być w tym mieszkaniu (5-8 obiektów)
   */
  selectObjects() {
    const poolKeys = Object.keys(APARTMENT_OBJECTS_POOL);
    const count = 5 + Math.floor(this.seededRandom(4)); // 5-8 obiektów

    // Deterministically shuffle pool
    const shuffled = [...poolKeys];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom(i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count).map(key => APARTMENT_OBJECTS_POOL[key]);
  }

  /**
   * Skonfiguruj każdy obiekt - przydziel zawartość, state, role
   */
  configureObjects(objects) {
    return objects.map(objTemplate => {
      const configuredObj = { ...objTemplate };

      // Jakie zawartości są dostępne
      const availableContents = this.getContentsForMotive(this.motive);
      const possibleContents = objTemplate.possibleContents || [];

      // Wylosuj zawartość dla tego obiektu
      const selectedContents = this.selectContentsForObject(
        possibleContents,
        availableContents
      );

      // Czy obiekt jest zamknięty czy otwarty
      configuredObj.state = objTemplate.canBeLocked && this.seededRandom() > 0.5
        ? 'locked'
        : 'open';

      // Przydziel zawartość
      if (selectedContents && selectedContents.length > 0) {
        configuredObj.unlocks = selectedContents.map(content => ({
          id: content.id,
          type: content.type,
          label: content.label,
          description: content.description || '',
          quantity: 1,
          isClue: content.isClue || false
        }));
      } else {
        configuredObj.unlocks = [];
      }

      return configuredObj;
    });
  }

  /**
   * Zwróć zawartości (clues) dla danego motywu
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

    return motiveClues[motiveId] || motiveClues.gambling_debt; // Fallback
  }

  /**
   * Wybierz zawartość dla konkretnego obiektu
   * Mieszaj clues z red herringami
   */
  selectContentsForObject(possibleContents, motiveClues) {
    if (!possibleContents || possibleContents.length === 0) {
      return [];
    }

    // Filtruj zawartość motywu, która pasuje do tego obiektu
    const matchingClues = motiveClues.filter(clue =>
      possibleContents.some(pc => pc.id === clue.id)
    );

    // Prawdopodobieństwo że obiekt zawiera clue vs red herring
    const hasClue = this.seededRandom() < 0.6; // 60% szansy na clue

    const selected = [];

    if (hasClue && matchingClues.length > 0) {
      // Wybierz clue z wagi
      const clue = this.selectByWeight(matchingClues);
      const clueContent = possibleContents.find(pc => pc.id === clue.id);
      if (clueContent) {
        selected.push({
          ...clueContent,
          isClue: true,
          description: this.getClueDescription(clueContent.id, this.motive)
        });
      }
    } else if (possibleContents.length > 0) {
      // Red herring lub losowa zawartość
      const herring = RED_HERRING_CONTENTS[
        Math.floor(this.seededRandom(RED_HERRING_CONTENTS.length))
      ];
      selected.push({
        ...herring,
        isClue: false,
        isRedHerring: true
      });
    }

    return selected;
  }

  /**
   * Wybierz item z puli wg wagi
   */
  selectByWeight(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    let rand = this.seededRandom(totalWeight);

    for (const item of items) {
      rand -= (item.weight || 1);
      if (rand <= 0) return item;
    }

    return items[0];
  }

  /**
   * Opis clue zależnie od motywu
   */
  getClueDescription(contentId, motive) {
    const descriptions = {
      gambling_debt: {
        bank_statement: 'Large transfers to gambling establishments.',
        casino_receipt: 'Proof of massive losses in a single night.',
        threatening_letter: 'A debt collector demanding immediate payment.',
        debt_notebook: 'Handwritten log of growing debts.'
      },
      medical_treatment: {
        medical_bill: 'Hospital invoice for expensive treatment.',
        medical_reports: 'Patient records for urgent surgery.',
        family_photo: 'Photo with someone who appears to be in a hospital bed.',
        old_letters: 'Letters discussing someone\'s health crisis.'
      },
      blackmail_secret: {
        threatening_letter: 'Demands payment or else.',
        blackmail_photo: 'Compromising photo with ransom note on back.',
        old_letters: 'Cryptic letters referring to "our arrangement".',
        handwritten_notes: 'Notes about keeping secrets.'
      },
      repatriation_cause: {
        artifact_research: 'Extensive research on artifact origins and provenance.',
        map_location: 'Map with marked route to artifact\'s homeland.',
        diary: 'Entries about cultural heritage and justice.',
        family_heirloom_photo: 'Old photo showing the artifact in family possession.'
      },
      career_coverup: {
        handwritten_notes: 'Notes about audit schedules and discrepancies.',
        bank_statement: 'Unusual financial transactions around audit dates.',
        insurance_papers: 'Documents proving career-ending liability.',
        recycling_bin_receipt: 'Evidence of recently shredded documents.'
      },
      family_heirloom: {
        family_heirloom_photo: 'Proof that the artifact once belonged to this family.',
        family_photo: 'Family portrait with the artifact visible in background.',
        old_letters: 'Letters describing how the artifact was lost.',
        will_document: 'Will mentioning the "stolen" family heirloom.'
      }
    };

    return descriptions[motive]?.[contentId] || 'Important evidence.';
  }

  /**
   * Subtitle dla motywu
   */
  getSubtitleForMotive(motive) {
    const subtitles = {
      gambling_debt: 'Desperate. In debt. Running.',
      medical_treatment: 'Sick relative. Impossible bills. Desperate choice.',
      blackmail_secret: 'Threatened. Cornered. No choice.',
      repatriation_cause: 'Believes in justice. Won\'t listen to law.',
      career_coverup: 'Everything to lose. Will do anything.',
      family_heirloom: 'Reclaiming what was stolen. Personal crusade.'
    };

    return subtitles[motive] || 'What\'s their story?';
  }
}

export function generateApartment(suspectId, motive) {
  const generator = new ApartmentGenerator(suspectId, motive);
  return generator.generate();
}

export default ApartmentGenerator;