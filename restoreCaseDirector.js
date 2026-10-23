import { CaseDirector } from './CaseDirector.js';
import { loadJson } from './config/loadJson.js';

const caseModifiers = await loadJson(
  './assets/data/caseModifiers.json',
  import.meta.url
);

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

export function createCaseDirectorFromState(state) {
  const template = state?.caseTemplate;

  if (
    template === undefined ||
    template === null
  ) {
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