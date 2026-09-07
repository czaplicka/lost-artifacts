import { gameState } from './GameData.js';
import dialogCsi from './dialog_csi.json' assert { type: 'json' };

/**
 * CSIDialogBuilder
 * Zamienia szablony z dialog_csi.json na gotowe linie dialogowe,
 * podstawiając realne wartości z gameState.currentMission.
 * Nie zależy od DialogManager.js - zwraca czystą tablicę
 * { speaker, portraitKey, lines }, którą DialogManager ma odtworzyć.
 */

function fillTemplate(entry, value) {
  return {
    ...entry,
    lines: entry.lines.map((line) => line.replaceAll('{{value}}', String(value ?? '???')))
  };
}

function resolveHumanValue(field, rawValue) {
  // Miejsce na "ładniejsze" tłumaczenie surowych wartości z danych
  // (np. rozmiar buta z liczby na opis) - na razie 1:1.
  if (field === 'shoe_size_category') {
    return `EU ${rawValue}`;
  }
  return rawValue;
}

/**
 * Zwraca dialog technika laboratoryjnego dzwoniącego z JEDNĄ wartościową
 * wskazówką (case 1 / lab.callOnly === true w CaseDirector). Bez red
 * herringów - to uproszczona wersja rozmowy, żeby nie przeciążać gracza
 * w pierwszej sprawie.
 */
export function buildCsiCallDialogue() {
  const hardEvidence = gameState.currentMission?.forensicHardEvidence || [];
  const primaryLead = hardEvidence[0];

  if (!primaryLead) {
    console.warn('CSIDialogBuilder: brak forensicHardEvidence do zbudowania rozmowy telefonicznej.');
    return [...dialogCsi.callOnlyIntro];
  }

  const template = (dialogCsi.leads[primaryLead.field] || [])[0];
  if (!template) {
    console.warn(`CSIDialogBuilder: brak szablonu dla pola '${primaryLead.field}'.`);
    return [...dialogCsi.callOnlyIntro];
  }

  const humanValue = resolveHumanValue(primaryLead.field, primaryLead.value);
  return [...dialogCsi.callOnlyIntro, fillTemplate(template, humanValue)];
}

/**
 * Zwraca pełny dialog laboratorium (od case'u, w którym lab.gameCount > 0),
 * łącząc WSZYSTKIE realne dowody z forensicHardEvidence + red herringi
 * z odpowiedniego etapu ('stage_1' po pierwszym przejściu, 'stage_2' po
 * ponownej analizie - patrz caseModifiers.json -> lab.skipReason).
 *
 * @param {'stage_1'|'stage_2'} redHerringStage
 */
export function buildCsiLabDialogue(redHerringStage = 'stage_1') {
  const hardEvidence = gameState.currentMission?.forensicHardEvidence || [];

  const leadDialogues = hardEvidence
    .map((evidence) => {
      const template = (dialogCsi.leads[evidence.field] || [])[0];
      if (!template) {
        console.warn(`CSIDialogBuilder: brak szablonu dla pola '${evidence.field}'.`);
        return null;
      }
      return fillTemplate(template, resolveHumanValue(evidence.field, evidence.value));
    })
    .filter(Boolean);

  const redHerringDialogues = dialogCsi.redHerrings[redHerringStage] || [];

  return [...leadDialogues, ...redHerringDialogues];
}