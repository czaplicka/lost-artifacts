import { CaseDirector } from './CaseDirector.js';

import caseModifiers from './assets/data/caseModifiers.json' with {
  type: 'json'
};

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== 'object'
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

/**
 * Odtwarza wyłącznie instancję runtime.
 * Nie losuje nowego szablonu i nie emituje zdarzenia generowania.
 *
 * Starszy zapis bez szablonu zwraca null.
 */
export function createCaseDirectorFromState(state) {
  const template = state?.caseTemplate;

  if (template === undefined || template === null) {
    return null;
  }

  if (
    !isPlainObject(template) ||
    !isPlainObject(template.stages)
  ) {
    throw new Error(
      '[CaseDirector] Saved caseTemplate is invalid.'
    );
  }

  const director = new CaseDirector(caseModifiers);

  director.loadTemplate(
    structuredClone(template)
  );

  return director;
}